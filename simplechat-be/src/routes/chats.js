import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const MAX_GROUP_NAME = 60;
const MAX_MESSAGE_LENGTH = 4000;

// Firestore caps a single batch request at 100 documents, so the read is chunked.
async function findMissingUsers(ids) {
  const missing = [];

  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const docs = await db.getAll(...chunk.map((id) => db.doc(`users/${id}`)));
    docs.forEach((doc, position) => {
      if (!doc.exists) missing.push(chunk[position]);
    });
  }

  return missing;
}

router.post("/", requireAuth, async (req, res) => {
  const uid = req.uid;
  const body = req.body ?? {};
  const type = body.type;

  if (type === "direct") {
    const recipientId = typeof body.recipientId === "string" ? body.recipientId.trim() : "";

    if (!recipientId) {
      res.status(400).json({ error: "recipientId is required." });
      return;
    }

    if (recipientId === uid) {
      res.status(400).json({ error: "You cannot start a chat with yourself." });
      return;
    }

    // The recipient must have a profile so the room never holds a made-up member.
    const recipient = await db.doc(`users/${recipientId}`).get();
    if (!recipient.exists) {
      res.status(404).json({ error: "The recipient was not found." });
      return;
    }

    const chat = await db.collection("chats").add({
      type: "direct",
      memberIds: [uid, recipientId],
    });

    res.status(201).json({ chatId: chat.id });
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
    // A Set drops members picked twice, and the creator joins the group automatically.
    const memberIds = [...new Set(requested.filter((id) => typeof id === "string" && id.trim()))]
      .filter((id) => id !== uid);

    if (memberIds.length < 2) {
      res.status(400).json({
        error: "A group needs at least three people, including the creator.",
      });
      return;
    }

    const missing = await findMissingUsers(memberIds);
    if (missing.length > 0) {
      res.status(404).json({ error: "Some group members were not found." });
      return;
    }

    const chat = await db.collection("chats").add({
      type: "group",
      name,
      memberIds: [uid, ...memberIds],
    });

    res.status(201).json({ chatId: chat.id });
    return;
  }

  res.status(400).json({ error: 'type must be "direct" or "group".' });
});

router.post("/:chatId/messages", requireAuth, async (req, res) => {
  const uid = req.uid;
  const chatId = req.params.chatId;
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

  if (!chatId) {
    res.status(400).json({ error: "chatId is required." });
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

  const chatRef = db.doc(`chats/${chatId}`);

  let chat;
  try {
    chat = await chatRef.get();
  } catch {
    res.status(400).json({ error: "chatId is not valid." });
    return;
  }

  if (!chat.exists) {
    res.status(404).json({ error: "The conversation was not found." });
    return;
  }

  // The Admin SDK bypasses Security Rules, so membership is checked here.
  const memberIds = chat.get("memberIds");
  const isMember = Array.isArray(memberIds) && memberIds.includes(uid);
  if (!isMember) {
    res.status(403).json({ error: "You are not a member of this conversation." });
    return;
  }

  const message = await chatRef.collection("messages").add({
    senderId: uid,
    text,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({ success: true, messageId: message.id });
});

router.delete("/:chatId", requireAuth, async (req, res) => {
  const uid = req.uid;
  const chatId = req.params.chatId;

  const chatRef = db.doc(`chats/${chatId}`);

  let chat;
  try {
    chat = await chatRef.get();
  } catch {
    res.status(400).json({ error: "chatId is not valid." });
    return;
  }

  if (!chat.exists) {
    res.status(404).json({ error: "The conversation was not found." });
    return;
  }

  // Only a member may delete the conversation.
  const memberIds = chat.get("memberIds");
  const isMember = Array.isArray(memberIds) && memberIds.includes(uid);
  if (!isMember) {
    res.status(403).json({ error: "You are not a member of this conversation." });
    return;
  }

  // Messages are removed in batches because Firestore caps a batch at 500 writes.
  const messagesRef = chatRef.collection("messages");
  let deletedMessages = 0;

  for (;;) {
    const snapshot = await messagesRef.limit(400).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((messageDoc) => batch.delete(messageDoc.ref));
    await batch.commit();
    deletedMessages += snapshot.size;
  }

  await chatRef.delete();

  res.status(200).json({ success: true, deletedMessages });
});

export { router as chatsRouter };
