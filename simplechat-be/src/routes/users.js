// Endpoint untuk registrasi user baru dan lookup username -> email.
import { Router } from "express";
import { authAdapter, dbAdapter } from "../adapters/index.js";

const router = Router();

// POST /api/users/register
// Body: { email, username, password }
// Buat akun auth + simpan profil di koleksi users
router.post("/register", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !username || !password) {
    return res.status(400).json({ error: "Email, username, and password are required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    const uid = await authAdapter.createUser(email, password, username);

    // Simpan profil dengan documentId = uid auth, plus email untuk lookup login.
    await dbAdapter.createProfile(uid, username, email);

    res.status(201).json({ success: true, uid });
  } catch (error) {
    // 409 / email-already-exists = email sudah terdaftar
    if (
      error?.code === 409 ||
      error?.code === "auth/email-already-exists" ||
      error?.code === "email-already-exists" ||
      error?.status === 409
    ) {
      return res.status(409).json({ error: "Email already registered." });
    }
    if (error?.code === "auth/invalid-password" || error?.code === "auth/invalid-email") {
      return res.status(400).json({ error: "Invalid email or password." });
    }
    console.error("[users/register] error:", error?.message ?? error);
    res.status(500).json({ error: "Registration failed. Try again." });
  }
});

// GET /api/users/lookup?username=x
// Cari email dari username untuk login
router.get("/lookup", async (req, res) => {
  const username = typeof req.query?.username === "string" ? req.query.username.trim() : "";

  if (!username) {
    return res.status(400).json({ error: "Username query parameter is required." });
  }

  try {
    const email = await dbAdapter.findEmailByName(username);
    if (!email) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ email });
  } catch (error) {
    console.error("[users/lookup] error:", error?.message ?? error);
    res.status(500).json({ error: "Lookup failed. Try again." });
  }
});

export { router as usersRouter };
