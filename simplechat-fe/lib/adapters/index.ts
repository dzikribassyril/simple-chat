// Titik pusat pemilihan backend adapter di sisi frontend.
// Komponen UI dan hooks nggak boleh peduli backend-nya pakai Firebase atau Appwrite.
// Cukup ganti nilai NEXT_PUBLIC_BACKEND_PROVIDER di .env, adapter yang sesuai bakal aktif.
import type { AuthAdapter, DatabaseAdapter } from "./types";
import { firebaseAuth, firebaseDb } from "./firebase";
import { appwriteAuth, appwriteDb } from "./appwrite";

// Ambil provider dari environment variable. Kalau kosong, default-nya Firebase
// biar kompatibel sama konfigurasi awal proyek ini.
const provider = process.env.NEXT_PUBLIC_BACKEND_PROVIDER || "firebase";

// Fungsi buat milih pasangan adapter (auth & db) berdasarkan nama provider.
function getAdapters(): { authAdapter: AuthAdapter; dbAdapter: DatabaseAdapter } {
  switch (provider.toLowerCase()) {
    case "appwrite":
      return { authAdapter: appwriteAuth, dbAdapter: appwriteDb };
    case "firebase":
    default:
      return { authAdapter: firebaseAuth, dbAdapter: firebaseDb };
  }
}

export const { authAdapter, dbAdapter } = getAdapters();
export * from "./types";
