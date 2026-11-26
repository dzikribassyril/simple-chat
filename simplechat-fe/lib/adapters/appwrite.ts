// adapter untuk Appwrite
import { Account, Client, DocumentsDB, Query, Realtime } from "appwrite";
import { profileName, writeProfile } from "./profile";
import type { RealtimeResponseEvent, RealtimeSubscription } from "appwrite";
import type { AuthAdapter, DatabaseAdapter } from "./types";
import type { Room, Message, Contact } from "@/lib/types";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "http://localhost/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const usersCollection = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_USERS || "users";
const roomsCollection = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ROOMS || "rooms";
const messagesCollection = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_MESSAGES || "messages";

// Validasi konfigurasi wajib sebelum request dikirim.
function assertAppwriteConfig() {
  if (!projectId || !databaseId) {
    throw new Error(
      "Appwrite configuration missing: NEXT_PUBLIC_APPWRITE_PROJECT_ID dan " +
        "NEXT_PUBLIC_APPWRITE_DATABASE_ID harus diisi di .env.local",
    );
  }
}

// Satu instance client dipakai bersama untuk operasi database.
const client = new Client();
if (endpoint) client.setEndpoint(endpoint);
if (projectId) client.setProject(projectId);

const account = new Account(client);
const databases = new DocumentsDB(client);
const realtime = new Realtime(client);

// Callback listener disimpan per identifier supaya bisa dibersihkan saat komponen unmount.
// Menggunakan WeakMap agar callback Reference tidak menghalangi GC collection.
const messageCallbacks = new Map<string, Set<(messages: Message[]) => void>>();
const roomCallbacks = new Map<string, Set<(rooms: Room[]) => void>>();
const userCallbacks = new Set<(users: Contact[]) => void>();

// Maximal user yang dimuat saat subscribeUsers.
const USERS_LOAD_LIMIT = 200;

// Default halaman pesan yang ditampilkan saat pertama kali membuka room.
const MESSAGES_LOAD_LIMIT = 50;

function mapMessages(roomId: string, documents: Array<{ $id: string; senderId?: unknown; text?: unknown; roomId?: unknown; createdAt?: unknown; $createdAt?: unknown }>) {
  return documents.map((document) => {
      const rawDate = document.createdAt || document.$createdAt;
      const createdAtMs = rawDate
        ? new Date(String(rawDate)).getTime()
        : 0;
      return {
        id: document.$id,
        senderId: String(document.senderId ?? ""),
        text: String(document.text ?? ""),
        createdAt: rawDate
          ? {
              toMillis: () => createdAtMs,
              toDate: () => new Date(createdAtMs),
            }
          : null,
      };
    })
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    });
}

// Bungkus realtime.subscribe (async) jadi fungsi unsubscribe sinkron buat adapter.
// Parameter queries opsional: kalau diisi, Appwrite hanya menyaring event di sisi server.
function listen(
  channels: string,
  cb: (event: RealtimeResponseEvent<unknown>) => void,
  onReady?: () => void,
  onError?: (error: Error) => void,
  queries?: import("appwrite").QueryInput,
) {
  let sub: RealtimeSubscription | null = null;
  let closed = false;

  realtime
    .subscribe(channels, cb, queries)
    .then((s) => {
      if (closed) void s.unsubscribe().catch(() => {});
      else {
        sub = s;
        onReady?.();
      }
    })
    .catch((error: unknown) => {
      if (!closed) onError?.(error instanceof Error ? error : new Error(String(error)));
    });

  return () => {
    closed = true;
    void sub?.unsubscribe().catch(() => {});
  };
}

/**
 * Observasi perubahan di koleksi tertentu dan panggil load() saat ada event realtime.
 * Parameter queries opsional: kalau diisi, Appwrite menyaring event di sisi server
 * sehingga WebSocket hanya menerima perubahan yang relevan.
 * Jika koneksi realtime gagal, fallback ke polling interval sebagai pengaman.
 */
function observeCollection<T>(
  collection: string,
  load: () => Promise<T>,
  cb: (value: T) => void,
  onError: (error: Error) => void,
  matches: (event: RealtimeResponseEvent<unknown>) => boolean = () => true,
  queries?: import("appwrite").QueryInput,
) {
  let closed = false;
  let running = false;
  let pending = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let realtimeConnected = false;
  let realtimeAttempts = 0;

  const refresh = async () => {
    if (closed) return;
    if (running) { pending = true; return; }
    running = true;
    do {
      pending = false;
      try {
        const value = await load();
        if (!closed && !pending) cb(value);
      } catch (error) {
        if (!closed && !pending) onError(error instanceof Error ? error : new Error(String(error)));
      }
    } while (!closed && pending);
    running = false;
  };

  const stop = listen(
    `databases.${databaseId}.collections.${collection}.documents`,
    (event) => {
      realtimeConnected = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (matches(event)) void refresh();
    },
    () => {
      realtimeConnected = true;
      void refresh();
    },
    (error) => {
      realtimeConnected = false;
      realtimeAttempts += 1;
      if (!intervalId && realtimeAttempts <= 3) {
        intervalId = setInterval(() => {
          if (!closed && !realtimeConnected) void refresh();
        }, 15000);
      }
      onError(error);
    },
    queries,
  );

  void refresh();
  return () => {
    closed = true;
    if (intervalId) clearInterval(intervalId);
    stop();
  };
}

export const appwriteAuth: AuthAdapter = {
  // Login email/password ke Appwrite, lalu ambil UID dan JWT untuk dikirim ke backend.
  async signInWithEmail(email, password) {
    assertAppwriteConfig();
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    const jwt = await account.createJWT();
    return { uid: user.$id, token: jwt.jwt };
  },

  // Hapus sesi aktif di Appwrite. Kalau sesi sudah expired, abaikan error.
  async signOut() {
    try {
      await account.deleteSession("current");
    } catch {
    }
  },

  // Buat JWT baru untuk disematkan di header Authorization setiap request API.
  async getToken() {
    assertAppwriteConfig();
    try {
      const jwt = await account.createJWT();
      return jwt.jwt;
    } catch {
      throw new Error("Not signed in or session expired");
    }
  },

  // Periksa status sesi saat komponen pertama kali mount.
  // Appwrite tidak punya listener auth seperti Firebase onAuthStateChanged,
  // jadi cek sekali di awal, lalu subscribe channel "account" kalau sudah login.
  onAuthChange(cb) {
    if (!projectId) {
      cb(null);
      return () => {};
    }

    let stopAccount = () => {};
    let closed = false;

    account
      .get()
      .then((user) => {
        if (closed) return;
        cb(user.$id);
        stopAccount = listen("account", () => {
          account
            .get()
            .then((u) => { if (!closed) cb(u.$id); })
            .catch(() => { if (!closed) cb(null); });
        });
      })
      .catch(() => { if (!closed) cb(null); });

    return () => {
      closed = true;
      stopAccount();
    };
  },
};

export const appwriteDb: DatabaseAdapter = {
  async refreshRooms(uid) {
    assertAppwriteConfig();
    const response = await databases.listDocuments({
      databaseId,
      collectionId: roomsCollection,
      queries: [Query.contains("memberIds", [uid])],
    });
    const rooms: Room[] = response.documents.map((document) => ({
      id: document.$id,
      type: document.type === "group" ? "group" : "direct",
      name: typeof document.name === "string" ? document.name : undefined,
      memberIds: Array.isArray(document.memberIds)
        ? (document.memberIds as string[])
        : [],
    }));
    roomCallbacks.get(uid)?.forEach((callback) => callback(rooms));
  },

  async refreshMessages(roomId) {
    assertAppwriteConfig();
    const response = await databases.listDocuments({
      databaseId,
      collectionId: messagesCollection,
      queries: [
        Query.equal("roomId", roomId),
        Query.orderDesc("$createdAt"),
        Query.limit(MESSAGES_LOAD_LIMIT),
      ],
    });
    const messages = mapMessages(roomId, response.documents);
    messageCallbacks.get(roomId)?.forEach((callback) => callback(messages));
  },

  // Buat dokumen profil user dengan ID custom = UID Appwrite
  async ensureProfile(uid) {
    const user = await account.get();
    if (user.$id !== uid) throw new Error("Not signed in");
    await writeProfile(appwriteAuth.getToken, "POST", profileName(user.name));
  },

  // Perbarui nama tampilan user di koleksi users Appwrite
  async updateDisplayName(uid, name) {
    if ((await account.get()).$id !== uid) throw new Error("Not signed in");
    await writeProfile(appwriteAuth.getToken, "PATCH", name.trim().slice(0, 100));
  },

  /**
   * Dengarkan daftar kontak secara realtime.
   * Memuat maksimal USERS_LOAD_LIMIT kontak.
   * Fallback polling 15 detik jika koneksi realtime putus.
   */
  subscribeUsers(cb, onError) {
    if (!projectId || !databaseId) {
      onError(new Error("Appwrite configuration missing"));
      return () => {};
    }

    userCallbacks.add(cb);

    const stop = observeCollection(usersCollection, async () => {
      const res = await databases.listDocuments({
        databaseId,
        collectionId: usersCollection,
        queries: [Query.limit(USERS_LOAD_LIMIT)],
      });
      return res.documents.flatMap((d): Contact[] => {
        const name = d.name;
        return typeof name === "string" && name.length > 0 ? [{ id: d.$id, name }] : [];
      });
    }, (users) => {
      userCallbacks.forEach((callback) => callback(users));
    }, onError);

    return () => {
      userCallbacks.delete(cb);
      if (userCallbacks.size === 0) stop();
    };
  },

  /**
   * Dengarkan daftar room yang melibatkan UID ini secara realtime.
   * Query filter dikirim ke Appwrite realtime sebagai parameter subscribe(),
   * sehingga WebSocket hanya menerima event room yang memberIds-nya cocok.
   */
  subscribeRooms(uid, cb, onError) {
    if (!projectId || !databaseId) {
      onError(new Error("Appwrite configuration missing"));
      return () => {};
    }

    const callbacks = roomCallbacks.get(uid) ?? new Set();
    callbacks.add(cb);
    roomCallbacks.set(uid, callbacks);

    // Filter server-side: hanya event dengan memberIds yang mengandung uid.
    const serverQueries = [Query.contains("memberIds", [uid])];

    const stopObserving = observeCollection(
      roomsCollection,
      async () => {
        const res = await databases.listDocuments({ databaseId, collectionId: roomsCollection, queries: serverQueries });
        const rooms: Room[] = res.documents.map((d) => ({
          id: d.$id,
          type: d.type === "group" ? "group" : "direct",
          name: typeof d.name === "string" ? d.name : undefined,
          memberIds: Array.isArray(d.memberIds) ? (d.memberIds as string[]) : [],
        }));
        return rooms;
      },
      (rooms) => {
        callbacks.forEach((c) => c(rooms));
      },
      onError,
      undefined,
      serverQueries,
    );

    return () => {
      callbacks.delete(cb);
      if (callbacks.size === 0) roomCallbacks.delete(uid);
      stopObserving();
    };
  },

  /**
   * Dengarkan riwayat pesan dalam satu room tertentu secara realtime.
   * Query filter dikirim ke Appwrite realtime sebagai parameter ketiga subscribe(),
   * sehingga WebSocket hanya menerima event pesan milik room yang dibuka.
   * MaxIMAL MESSAGES_LOAD_LIMIT pesan terakhir dimuat sekaligus.
   */
  subscribeMessages(roomId, cb, onError) {
    if (!projectId || !databaseId) {
      onError(new Error("Appwrite configuration missing"));
      return () => {};
    }

    const callbacks = messageCallbacks.get(roomId) ?? new Set();
    callbacks.add(cb);
    messageCallbacks.set(roomId, callbacks);

    // Filter server-side: hanya event dengan roomId yang cocok yang dikirim via WebSocket.
    const serverQueries = [Query.equal("roomId", roomId)];

    const stopObserving = observeCollection(
      messagesCollection,
      async () => {
        const res = await databases.listDocuments({ databaseId, collectionId: messagesCollection, queries: [
          ...serverQueries,
          Query.orderDesc("$createdAt"),
          Query.limit(MESSAGES_LOAD_LIMIT),
        ] });
        return mapMessages(roomId, res.documents);
      },
      (messages) => {
        callbacks.forEach((c) => c(messages));
      },
      onError,
      // matches() hanya menangani event delete yang tidak punya payload chatId.
      (event) => event.events.some((name) => name.endsWith(".delete")),
      serverQueries,
    );

    return () => {
      callbacks.delete(cb);
      if (callbacks.size === 0) messageCallbacks.delete(roomId);
      stopObserving();
    };
  },
};
