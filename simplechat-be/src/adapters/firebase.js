// Implementasi adapter untuk Firebase di sisi backend (server-side).
// Menggunakan Firebase Admin SDK yang berjalan dengan service account atau
// Application Default Credentials — bukan SDK client biasa yang dipakai frontend.
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// Ambil Project ID dari env. Kalau tidak diisi, Admin SDK akan error saat dipakai.
const projectId = process.env.FIREBASE_PROJECT_ID;

// Dua cara set credential Firebase Admin:
// 1. FIREBASE_SERVICE_ACCOUNT_JSON — isi JSON service account langsung di env (cocok buat Vercel/cloud)
// 2. GOOGLE_APPLICATION_CREDENTIALS — path ke file JSON service account (cocok buat lokal)
const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

let credential;
if (credentialsJson) {
  // JSON langsung dari env, parse dulu sebelum dikirim ke cert().
  credential = cert(JSON.parse(credentialsJson));
} else if (credentialsPath) {
  // Baca dari file, lalu parse.
  credential = cert(JSON.parse(readFileSync(credentialsPath, "utf8")));
}
// Kalau kedua-duanya kosong, Admin SDK akan pakai Application Default Credentials (ADC)
// yang otomatis tersedia di Google Cloud Environment (Cloud Run, GCE, dsb).

// Pastikan app Firebase tidak diinisialisasi dua kali saat hot reload di development.
const app = getApps().length
  ? getApps()[0]
  : initializeApp({ projectId, ...(credential ? { credential } : {}) });

const db = getFirestore(app);
const adminAuth = getAuth(app);

/** @type {import("./types.js").AuthAdapter} */
export const firebaseAuth = {
  /**
   * Verifikasi Firebase ID token yang dikirim client via header Authorization: Bearer.
   * Token divalidasi secara offline menggunakan public key Google — tidak butuh network call.
   * @param {string} token
   * @returns {Promise<string>} UID user yang terautentikasi
   */
  async verifyToken(token) {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  },

  /**
   * Buat user Firebase Auth baru dari backend.
   * @param {string} email
   * @param {string} password
   * @param {string} displayName
   * @returns {Promise<string>} uid user baru
   */
  async createUser(email, password, displayName) {
    const user = await adminAuth.createUser({ email, password, displayName });
    return user.uid;
  },
};

/** @type {import("./types.js").DatabaseAdapter} */
export const firebaseDb = {
  async ensureProfile(uid, name) {
    try {
      await db.doc(`users/${uid}`).create({ name });
    } catch (error) {
      if (error?.code !== 6 && error?.code !== "already-exists") throw error;
    }
  },

  /**
   * Buat dokumen profil lengkap saat registrasi (dengan email untuk lookup login).
   * @param {string} uid
   * @param {string} name
   * @param {string} email
   */
  async createProfile(uid, name, email) {
    await db.doc(`users/${uid}`).set({ name, email }, { merge: true });
  },

  /**
   * Cari email berdasarkan nama tampilan (username).
   * Dipakai di flow login username -> email.
   * @param {string} name
   * @returns {Promise<string|null>}
   */
  async findEmailByName(name) {
    const snap = await db.collection("users").where("name", "==", name).limit(1).get();
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return typeof data.email === "string" ? data.email : null;
  },

  async updateDisplayName(uid, name) {
    await db.doc(`users/${uid}`).update({ name });
  },

  /**
   * Cek apakah user dengan ID tertentu punya dokumen profil di koleksi users.
   * Dipakai sebelum membuat chat direct supaya penerima benar-benar terdaftar.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async userExists(id) {
    if (!id) return false;
    try {
      const doc = await db.doc(`users/${id}`).get();
      return doc.exists;
    } catch {
      // ID tidak valid atau akses ditolak — anggap user tidak ada.
      return false;
    }
  },

  /**
   * Cari UID mana saja dari daftar yang tidak punya dokumen di Firestore.
   * Firestore hanya bisa getAll maksimal 100 dokumen per request, makanya di-batch per 100.
   * @param {string[]} ids
   * @returns {Promise<string[]>} UID yang tidak ditemukan
   */
  async findMissingUsers(ids) {
    const missing = [];
    for (let index = 0; index < ids.length; index += 100) {
      const chunk = ids.slice(index, index + 100);
      const docs = await db.getAll(...chunk.map((id) => db.doc(`users/${id}`)));
      docs.forEach((doc, position) => {
        if (!doc.exists) missing.push(chunk[position]);
      });
    }
    return missing;
  },

  /**
   * Buat dokumen room dengan ID yang sudah ditentukan (custom ID).
   * Dipakai untuk room direct supaya pasangan user hanya punya satu ruang — tidak duplikat.
   * Kalau dokumen sudah ada, Firestore lempar error "already-exists" (kode 6).
   * @param {string} roomId
   * @param {object} data
   * @returns {Promise<void>}
   */
  async createRoomWithId(roomId, data) {
    const chatRef = db.doc(`rooms/${roomId}`);
    // .create() berbeda dengan .set() — dia gagal kalau dokumen sudah ada.
    await chatRef.create(data);
  },

  /**
   * Buat dokumen room grup dengan ID auto-generated oleh Firestore.
   * @param {object} data
   * @returns {Promise<string>} ID dokumen yang baru dibuat
   */
  async createRoom(data) {
    const doc = await db.collection("rooms").add(data);
    return doc.id;
  },

  /**
   * Ambil satu dokumen room berdasarkan ID.
   * Kalau ID tidak valid (format salah), Firestore lempar error yang di-catch di sini.
   * @param {string} roomId
   * @returns {Promise<import("./types.js").Room|null>}
   */
  async getRoom(roomId) {
    let doc;
    try {
      doc = await db.doc(`rooms/${roomId}`).get();
    } catch {
      // Kalau roomId mengandung karakter tidak valid, Firestore akan error sebelum network call.
      throw new Error(`Invalid room ID: ${roomId}`);
    }

    if (!doc.exists) return null;

    const data = doc.data() || {};
    return {
      id: doc.id,
      type: data.type,
      memberIds: data.memberIds,
      // Hanya sertakan field 'name' kalau memang ada (buat grup punya name, direct tidak).
      ...(data.name !== undefined ? { name: data.name } : {}),
    };
  },

  /**
   * Tambahkan pesan ke subkoleksi messages di dalam dokumen room.
   * Pakai FieldValue.serverTimestamp() supaya timestamp diisi server, bukan klien,
   * sehingga urutan pesan konsisten meskipun jam perangkat user tidak akurat.
   * @param {string} roomId
   * @param {{ senderId: string, text: string }} message
   * @returns {Promise<string>} ID dokumen pesan yang baru dibuat
   */
  async addMessage(roomId, message) {
    const chatRef = db.doc(`rooms/${roomId}`);
    const messageDoc = await chatRef.collection("messages").add({
      senderId: message.senderId,
      text: message.text,
      createdAt: FieldValue.serverTimestamp(),
    });
    return messageDoc.id;
  },

  /**
   * Hapus semua pesan dalam room lalu hapus dokumen room-nya.
   * Firestore membutuhkan penghapusan eksplisit per dokumen — tidak ada cascade delete.
   * Dibatasi 400 per batch karena Firestore max 500 operasi per batch.
   * @param {string} roomId
   * @returns {Promise<number>} jumlah pesan yang terhapus
   */
  async deleteRoom(roomId) {
    const chatRef = db.doc(`rooms/${roomId}`);
    const messagesRef = chatRef.collection("messages");
    let deletedMessages = 0;

    // Loop sampai tidak ada pesan tersisa.
    for (;;) {
      const snapshot = await messagesRef.limit(400).get();
      if (snapshot.empty) break;

      // Gunakan batch write untuk efisiensi — satu round trip per 400 dokumen.
      const batch = db.batch();
      snapshot.docs.forEach((messageDoc) => batch.delete(messageDoc.ref));
      await batch.commit();
      deletedMessages += snapshot.size;
    }

    // Baru hapus dokumen roomnya setelah semua pesan bersih.
    await chatRef.delete();
    return deletedMessages;
  },
};
