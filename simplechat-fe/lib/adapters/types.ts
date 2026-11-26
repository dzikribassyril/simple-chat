// Kontrak antarmuka (interface) buat semua backend adapter di frontend.
// Tujuannya memutus ketergantungan langsung ke SDK spesifik seperti Firebase atau Appwrite.
// Komponen UI cukup manggil method di interface ini tanpa perlu tahu implementasi aslinya.
import type { Room, Message, Contact } from "@/lib/types";

// Kontrak operasi autentikasi (login, logout, session listener, dan token generator).
export interface AuthAdapter {
  // Sign-in via email & password konvensional, dipakai di mode Mock dan Appwrite.
  signInWithEmail(email: string, password: string): Promise<{ uid: string; token: string }>;

  // Hapus sesi login yang sedang aktif di perangkat user.
  signOut(): Promise<void>;

  // Ambil token bearer terbaru untuk disematkan di header request ke backend Express.
  // Fungsi ini dipanggil tiap kali client mau request API biar tokennya nggak kedaluwarsa.
  getToken(): Promise<string>;

  // Pasang listener status autentikasi. Callback dipanggil saat status user berubah (login/logout).
  // Mengembalikan fungsi unsubscribe buat cleanup saat komponen di-unmount.
  onAuthChange(cb: (uid: string | null) => void): () => void;
}

// Kontrak operasi database dan realtime subscription.
export interface DatabaseAdapter {
  // Pastikan user punya dokumen profil di database saat pertama kali sign-in.
  // Kalau dokumen sudah ada, jangan ditimpa biar data lama nggak hilang.
  ensureProfile(uid: string): Promise<void>;

  // Ubah nama tampilan (display name) user di database.
  updateDisplayName(uid: string, name: string): Promise<void>;

  // Dengarkan daftar semua kontak terdaftar secara realtime supaya daftar room selalu up to date.
  subscribeUsers(cb: (users: Contact[]) => void, onError: (e: Error) => void): () => void;

  // Dengarkan daftar room yang melibatkan UID ini secara realtime.
  subscribeRooms(uid: string, cb: (rooms: Room[]) => void, onError: (e: Error) => void): () => void;
  refreshRooms(uid: string): Promise<void>;

  // Dengarkan riwayat pesan dalam satu room tertentu secara realtime.
  subscribeMessages(
    roomId: string,
    cb: (messages: Message[]) => void,
    onError: (e: Error) => void,
  ): () => void;

  refreshMessages(roomId: string): Promise<void>;
}
