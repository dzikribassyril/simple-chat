// Titik pusat pemilihan backend adapter di sisi server (Express).
// Routes dan middleware tidak boleh import SDK spesifik (Firebase/Appwrite) langsung.
// Cukup ganti nilai BACKEND_PROVIDER di .env, adapter yang sesuai aktif tanpa ubah kode lain.

const provider = (process.env.BACKEND_PROVIDER || "firebase").toLowerCase();

/** @type {import("./types.js").AuthAdapter} */
let authAdapter;

/** @type {import("./types.js").DatabaseAdapter} */
let dbAdapter;

// Dynamic import dipakai supaya SDK yang tidak dipakai tidak ikut di-load.
switch (provider) {
  case "appwrite": {
    const { appwriteAuth, appwriteDb } = await import("./appwrite.js");
    authAdapter = appwriteAuth;
    dbAdapter = appwriteDb;
    break;
  }
  case "firebase":
  default: {
    const { firebaseAuth, firebaseDb } = await import("./firebase.js");
    authAdapter = firebaseAuth;
    dbAdapter = firebaseDb;
    break;
  }
}

export { authAdapter, dbAdapter };
