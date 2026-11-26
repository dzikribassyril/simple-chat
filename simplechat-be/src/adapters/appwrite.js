import { Account, Client, DocumentsDB, ID, Permission, Query, Role, Users } from "node-appwrite";

// Konfigurasi Appwrite dari env.
const endpoint = process.env.APPWRITE_ENDPOINT || "http://localhost/v1";
const projectId = process.env.APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const usersCollection = process.env.APPWRITE_COLLECTION_USERS || "users";
const roomsCollection = process.env.APPWRITE_COLLECTION_ROOMS || "rooms";
const messagesCollection = process.env.APPWRITE_COLLECTION_MESSAGES || "messages";

// Client admin dipakai untuk operasi database menggunakan API key server-side.
// API key memberi akses langsung tanpa membutuhkan JWT user.
const adminClient = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new DocumentsDB(adminClient);

// Default konkurensi maksimum untuk operasi paralel.
// Nilai ini menyeimbangkan tekanan ke Appwrite dan kecepatan eksekusi.
const CONCURRENCY_LIMIT = 5;

// Akses tulis tetap lewat backend agar keanggotaan selalu diperiksa.
const memberPermissions = (memberIds) => [...new Set(memberIds)].map((id) => Permission.read(Role.user(id)));

/** @type {import("./types.js").AuthAdapter} */
export const appwriteAuth = {
  /**
   * Verifikasi JWT yang dikirim client via header Authorization: Bearer.
   * Client baru dibuat per-request dengan JWT yang berbeda supaya tidak ada state bocor antar user.
   * @param {string} token
   * @returns {Promise<string>} UID user dari Appwrite
   */
  async verifyToken(token) {
    // Buat client sementara dengan JWT user, bukan API key.
    const userClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setJWT(token);

    const account = new Account(userClient);
    const user = await account.get();
    return user.$id;
  },

  /**
   * Buat user Appwrite Auth baru dari backend.
   * @param {string} email
   * @param {string} password
   * @param {string} name
   * @returns {Promise<string>} uid user baru
   */
  async createUser(email, password, name) {
    const users = new Users(adminClient);
    const user = await users.create(ID.unique(), email, undefined, password, name);
    return user.$id;
  },
};

/**
 * Jalankan fungsi async untuk setiap item dengan batas konkurensi.
 * Mencegah lonjakan request yang bisa membuat Appwrite throttling.
 */
async function runWithConcurrency(tasks, fn, limit) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(tasks[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** @type {import("./types.js").DatabaseAdapter} */
export const appwriteDb = {
  async ensureProfile(uid, name) {
    try {
      await databases.createDocument({ databaseId, collectionId: usersCollection, documentId: ID.custom(uid), data: { name }, permissions: [Permission.read(Role.users())] });
    } catch (error) {
      if (error?.code !== 409) throw error;
    }
  },

  /**
   * Buat dokumen profil lengkap saat registrasi (dengan email untuk lookup login).
   * @param {string} uid
   * @param {string} name
   * @param {string} email
   */
  async createProfile(uid, name, email) {
    try {
      await databases.updateDocument({ databaseId, collectionId: usersCollection, documentId: uid, data: { name, email } });
    } catch (error) {
      if (error?.code !== 404) throw error;
      await databases.createDocument({ databaseId, collectionId: usersCollection, documentId: ID.custom(uid), data: { name, email }, permissions: [Permission.read(Role.users())] });
    }
  },

  /**
   * Cari email berdasarkan nama tampilan (username).
   * @param {string} name
   * @returns {Promise<string|null>}
   */
  async findEmailByName(name) {
    const res = await databases.listDocuments({
      databaseId,
      collectionId: usersCollection,
      queries: [Query.equal("name", name), Query.limit(1)],
    });
    const doc = res.documents[0];
    return doc && typeof doc.email === "string" ? doc.email : null;
  },

  async updateDisplayName(uid, name) {
    await databases.updateDocument({ databaseId, collectionId: usersCollection, documentId: uid, data: { name } });
  },

  /**
   * Cek apakah dokumen user ada di koleksi users Appwrite.
   * Kalau document tidak ditemukan (404), return false alih-alih throw.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async userExists(id) {
    if (!id) return false;
    try {
      await databases.getDocument({ databaseId, collectionId: usersCollection, documentId: id });
      return true;
    } catch (error) {
      if (error?.code === 404) return false;
      throw error;
    }
  },

  /**
   * Cari UID yang tidak ada di koleksi users Appwrite secara paralel.
   * Dibagi menjadi batch konkuren maksimal CONCURRENCY_LIMIT untuk menghindari
   * rate limit Appwrite saat memeriksa banyak user sekaligus.
   * @param {string[]} ids
   * @returns {Promise<string[]>}
   */
  async findMissingUsers(ids) {
    if (ids.length === 0) return [];

    const results = await runWithConcurrency(
      ids,
      async (id) => {
        const exists = await this.userExists(id);
        return { id, exists };
      },
      CONCURRENCY_LIMIT,
    );

    return results.filter((r) => !r.exists).map((r) => r.id);
  },

  /**
   * Buat dokumen room dengan ID kustom di Appwrite.
   * ID.custom() dipakai supaya ID room deterministik (dm_uid1_uid2) untuk mencegah duplikat.
   * Kalau sudah ada (409), lempar error yang bisa dibedakan dari error lain oleh route handler.
   * @param {string} roomId
   * @param {object} data
   * @returns {Promise<void>}
   */
  async createRoomWithId(roomId, data) {
    try {
      await databases.createDocument({ databaseId, collectionId: roomsCollection, documentId: ID.custom(roomId), data, permissions: memberPermissions(data.memberIds) });
    } catch (error) {
      if (error?.code === 409) {
        const err = new Error("Room already exists");
        err.code = "already-exists";
        err.status = 409;
        throw err;
      }
      throw error;
    }
  },

  /**
   * Buat dokumen room grup dengan ID auto-generated oleh Appwrite.
   * @param {object} data
   * @returns {Promise<string>} $id dokumen yang baru dibuat
   */
  async createRoom(data) {
    const doc = await databases.createDocument({ databaseId, collectionId: roomsCollection, documentId: ID.unique(), data, permissions: memberPermissions(data.memberIds) });
    return doc.$id;
  },

  /**
   * Ambil satu dokumen room dari Appwrite berdasarkan ID.
   * @param {string} roomId
   * @returns {Promise<import("./types.js").Room|null>}
   */
  async getRoom(roomId) {
    try {
      const doc = await databases.getDocument({ databaseId, collectionId: roomsCollection, documentId: roomId });
      return {
        id: doc.$id,
        type: doc.type,
        memberIds: doc.memberIds,
        ...(doc.name !== undefined ? { name: doc.name } : {}),
      };
    } catch (error) {
      if (error?.code === 404) return null;
      throw error;
    }
  },

  /**
   * Tambah pesan ke koleksi messages Appwrite.
   * Timestamp diisi manual karena Appwrite menyimpan $createdAt otomatis di metadata dokumen.
   * @param {string} roomId
   * @param {{ senderId: string, text: string }} message
   * @param {string[]} memberIds Anggota room yang sudah diverifikasi route
   * @returns {Promise<string>} $id pesan yang baru dibuat
   */
  async addMessage(roomId, message, memberIds) {
    const doc = await databases.createDocument({ databaseId, collectionId: messagesCollection, documentId: ID.unique(), data: {
      senderId: message.senderId,
      text: message.text,
      roomId: roomId,
      createdAt: new Date().toISOString(),
    }, permissions: memberPermissions(memberIds) });
    return doc.$id;
  },

  /**
   * Hapus semua pesan dalam satu room lalu hapus dokumen room-nya.
   * Menggunakan batch delete konkuren dengan CONCURRENCY_LIMIT untuk mempercepat
   * penghapusan room besar. Appwrite tidak mendukung bulk delete, jadi setiap
   * dokumen tetap dihapus satu per satu namun dijalankan secara paralel.
   * @param {string} roomId
   * @returns {Promise<number>} jumlah pesan yang terhapus
   */
  async deleteRoom(roomId) {
    let deletedMessages = 0;

    for (;;) {
      const res = await databases.listDocuments({ databaseId, collectionId: messagesCollection, queries: [
        Query.equal("roomId", roomId),
        Query.limit(100),
      ] });

      if (!res.documents || res.documents.length === 0) break;

      // Hapus beberapa dokumen secara paralel untuk menghemat waktu.
      // CONCURRENCY_LIMIT mencegah Appwrite membatasi karena terlalu banyak request.
      await runWithConcurrency(
        res.documents,
        async (doc) => {
          await databases.deleteDocument({ databaseId, collectionId: messagesCollection, documentId: doc.$id });
        },
        CONCURRENCY_LIMIT,
      );

      deletedMessages += res.documents.length;
    }

    await databases.deleteDocument({ databaseId, collectionId: roomsCollection, documentId: roomId });
    return deletedMessages;
  },
};

/**
 * Buat index yang diperlukan agar query room & message berjalan cepat.
 * Dipanggil sekali saat server startup (hanya di self-hosted).
 * Jika index sudah ada, Appwrite akan lempar 409 dan diabaikan.
 */
export async function bootstrapIndexes() {
  const indexes = [
    {
      collectionId: messagesCollection,
      key: "idx_messages_room",
      attributes: ["roomId"],
      type: "key",
    },
    {
      collectionId: roomsCollection,
      key: "idx_rooms_members",
      attributes: ["memberIds"],
      type: "key",
    },
  ];

  for (const idx of indexes) {
    try {
      await databases.createIndex({ databaseId, collectionId: idx.collectionId, key: idx.key, attributes: idx.attributes, type: idx.type });
      console.log(`[Appwrite] Index created: ${idx.key} on ${idx.collectionId}`);
    } catch (error) {
      // 409 = index already exists, itu tidak masalah
      if (error?.code === 409) {
        console.log(`[Appwrite] Index already exists: ${idx.key}`);
      } else {
        console.warn(`[Appwrite] Failed to create index ${idx.key}:`, error?.message ?? error);
      }
    }
  }
}
