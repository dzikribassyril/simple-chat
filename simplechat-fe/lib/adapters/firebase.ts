// Implementasi adapter untuk Firebase (Authentication & Firestore).
// Membungkus SDK Firebase Web v13 agar sesuai dengan kontrak antarmuka AuthAdapter & DatabaseAdapter.
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { profileName, writeProfile } from "./profile";
import type { AuthAdapter, DatabaseAdapter } from "./types";
import type { Room, Message, Contact } from "@/lib/types";

// Batasi riwayat pesan maksimal 50 per room biar nggak boros kuota pembacaan Firestore.
const MAX_HISTORY = 50;

export const firebaseAuth: AuthAdapter = {
  // Login alternatif pakai email dan password konvensional.
  async signInWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { uid: result.user.uid, token: await result.user.getIdToken() };
  },

  // Logout dari sesi Firebase di perangkat ini.
  async signOut() {
    await signOut(auth);
  },

  // Ambil token ID Firebase terbaru; kalau user belum login, lempar error.
  async getToken() {
    if (!auth.currentUser) throw new Error("Not signed in");
    return auth.currentUser.getIdToken();
  },

  // Dengarkan perubahan state auth (login, logout, refresh token).
  // Mengembalikan fungsi unsubscribe Firestore bawaan.
  onAuthChange(cb) {
    return onAuthStateChanged(auth, (u) => cb(u?.uid ?? null));
  },
};

export const firebaseDb: DatabaseAdapter = {
  async refreshMessages() {},
  async refreshRooms() {},

  // Buat dokumen profil user jika belum pernah dibuat sebelumnya.
  async ensureProfile(uid) {
    if (auth.currentUser?.uid !== uid) throw new Error("Not signed in");
    await writeProfile(firebaseAuth.getToken, "POST", profileName(auth.currentUser.displayName));
  },

  // Update nama tampilan user di dokumen users Firestore, dibatasi 100 karakter.
  async updateDisplayName(uid, name) {
    if (auth.currentUser?.uid !== uid) throw new Error("Not signed in");
    await writeProfile(firebaseAuth.getToken, "PATCH", name.trim().slice(0, 100));
  },

  // Dengarkan daftar semua user di Firestore secara realtime.
  subscribeUsers(cb, onError) {
    return onSnapshot(
      collection(db, "users"),
      (snap) => {
        // Filter hanya dokumen yang punya field 'name' berupa string tidak kosong.
        const users: Contact[] = snap.docs.flatMap((d) => {
          const name = d.data().name;
          return typeof name === "string" && name.length > 0 ? [{ id: d.id, name }] : [];
        });
        cb(users);
      },
      onError,
    );
  },

  // Ambil dan dengarkan room yang berisi UID ini menggunakan query 'array-contains'.
  subscribeRooms(uid, cb, onError) {
    return onSnapshot(
      query(collection(db, "rooms"), where("memberIds", "array-contains", uid)),
      (snap) => {
        const rooms: Room[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type === "group" ? "group" : "direct",
            name: typeof data.name === "string" ? data.name : undefined,
            memberIds: Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [],
          };
        });
        cb(rooms);
      },
      onError,
    );
  },

  // Ambil 50 pesan terakhir dari subkoleksi messages di dalam room ini.
  subscribeMessages(roomId, cb, onError) {
    return onSnapshot(
      query(
        collection(db, "rooms", roomId, "messages"),
        orderBy("createdAt", "desc"),
        limit(MAX_HISTORY),
      ),
      (snap) => {
        // Petakan dokumen Firestore ke Message dan urutkan dari terlama ke terbaru.
        const messages: Message[] = snap.docs
          .map((d) => ({
            id: d.id,
            senderId: String(d.data().senderId ?? ""),
            text: String(d.data().text ?? ""),
            createdAt: d.data().createdAt ?? null,
          }))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            if (ta !== tb) return ta - tb;
            return a.id.localeCompare(b.id);
          });
        cb(messages);
      },
      onError,
    );
  },
};
