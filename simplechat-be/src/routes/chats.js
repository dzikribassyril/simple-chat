// Semua endpoint room: Create room, kirim pesan, hapus room via DatabaseAdapter.
import { Router } from "express";
import { createHash } from "node:crypto";
import { dbAdapter } from "../adapters/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const MAX_GROUP_NAME = 60;
const MAX_MESSAGE_LENGTH = 4000;

// POST /api/rooms -> bikin room baru (direct atau group).
router.post("/", requireAuth, async (req, res) => {
  const uid = req.uid;
  const body = req.body ?? {};
  const type = body.type;

  if (type === "direct") {
    const recipientId = typeof body.recipientId === "string" ? body.recipientId.trim() : "";

    // Penerima harus punya profil, biar room nggak berisi user yang nggak ada.
    if (!recipientId || !(await dbAdapter.userExists(recipientId))) {
      res.status(404).json({ error: "The recipient was not found." });
      return;
    }

    // Id room dibikin dari dua uid yang sudah diurutkan. Jadi satu pasangan
    // cuma punya satu room jadi misal si user dobel klik ga bakal duplikat.
    const sortedIds = [uid, recipientId].sort();
    const roomId =
      process.env.BACKEND_PROVIDER?.toLowerCase() === "appwrite"
        ? `dm_${createHash("sha256").update(sortedIds.join("\0")).digest("hex").slice(0, 32)}`
        : `dm_${sortedIds.join("_")}`;

    try {
      await dbAdapter.createRoomWithId(roomId, { type: "direct", memberIds: [uid, recipientId] });
    } catch (error) {
      const isDuplicate =
        error?.code === 6 ||
        error?.code === "already-exists" ||
        error?.code === 409 ||
        error?.status === 409;
      if (!isDuplicate) throw error;
      const existing = await dbAdapter.getRoom(roomId);
      if (existing?.type !== "direct" || !Array.isArray(existing.memberIds) ||
          existing.memberIds.length !== 2 || !existing.memberIds.includes(uid) ||
          !existing.memberIds.includes(recipientId)) {
        res.status(409).json({ error: "Room ID conflicts with an existing conversation." });
        return;
      }
    }

    res.status(201).json({ roomId });
    return;
  }

  if (type === "group") {
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      res.status(400).json({ error: "Group name is required." });
      return;
    }

    if (name.length > MAX_GROUP_NAME) {
      res.status(400).json({ error: `Group name must be at most ${MAX_GROUP_NAME} characters.` });
      return;
    }

    const requested = Array.isArray(body.memberIds) ? body.memberIds : [];
    // Pakai Set biar anggota yang kepilih dua kali cuma dihitung sekali, dan pembuat grup otomatis jadi anggota.
    const memberIds = [...new Set(requested.filter((id) => typeof id === "string" && id.trim()))]
      .filter((id) => id !== uid);

    // Minimal 3 orang: pembuat + 2 anggota lain.
    if (memberIds.length < 2) {
      res.status(400).json({
        error: "A group needs at least three people, including the creator.",
      });
      return;
    }

    // Cek dulu semua anggotanya benar-benar ada.
    const missing = await dbAdapter.findMissingUsers(memberIds);
    if (missing.length > 0) {
      res.status(404).json({ error: "Some group members were not found." });
      return;
    }

    // Bikin dokumen room baru lewat database adapter.
    const roomId = await dbAdapter.createRoom({
      type: "group",
      name,
      memberIds: [uid, ...memberIds],
    });

    res.status(201).json({ roomId });
    return;
  }

  // Selain dua tipe di atas, tolak.
  res.status(400).json({ error: 'type must be "direct" or "group".' });
});

// POST /api/rooms/:roomId/messages -> kirim pesan ke sebuah room.
router.post("/:roomId/messages", requireAuth, async (req, res) => {
  const uid = req.uid;
  const roomId = req.params.roomId;
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

  if (!roomId) {
    res.status(400).json({ error: "roomId is required." });
    return;
  }

  if (!text) {
    res.status(400).json({ error: "The message cannot be empty." });
    return;
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `The message must be at most ${MAX_MESSAGE_LENGTH} characters.` });
    return;
  }

  let room;
  try {
    room = await dbAdapter.getRoom(roomId);
  } catch {
    // Kalau id-nya bukan format yang valid, adapter akan error.
    res.status(400).json({ error: "roomId is not valid." });
    return;
  }

  if (!room) {
    res.status(404).json({ error: "The conversation was not found." });
    return;
  }

  // Keanggotaan harus dicek manual.
  const memberIds = room.memberIds;
  const isMember = Array.isArray(memberIds) && memberIds.includes(uid);
  if (!isMember) {
    res.status(403).json({ error: "You are not a member of this conversation." });
    return;
  }

  const messageId = await dbAdapter.addMessage(roomId, {
    senderId: uid,
    text,
  }, memberIds);

  res.status(201).json({ success: true, messageId });
});

// DELETE /api/rooms/:roomId -> hapus room beserta pesan-pesannya.
router.delete("/:roomId", requireAuth, async (req, res) => {
  const uid = req.uid;
  const roomId = req.params.roomId;

  let room;
  try {
    room = await dbAdapter.getRoom(roomId);
  } catch {
    res.status(400).json({ error: "roomId is not valid." });
    return;
  }

  if (!room) {
    res.status(404).json({ error: "The conversation was not found." });
    return;
  }

  // Cuma anggota room yang boleh menghapus.
  const memberIds = room.memberIds;
  const isMember = Array.isArray(memberIds) && memberIds.includes(uid);
  if (!isMember) {
    res.status(403).json({ error: "You are not a member of this conversation." });
    return;
  }

  const deletedMessages = await dbAdapter.deleteRoom(roomId);

  res.status(200).json({ success: true, deletedMessages });
});

export { router as roomsRouter };
