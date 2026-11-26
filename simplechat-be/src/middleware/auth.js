import { authAdapter } from "../adapters/index.js";

// Middleware dipakai buat logic yang butuh login.
// Memastikan request punya token yang valid via AuthAdapter.
export async function requireAuth(req, res, next) {
  // Format headernya harus "Bearer <token>"
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (!token) {
    res.status(401).json({
      error: "No token found. Send the Authorization: Bearer <firebase id token> header.",
    });
    return;
  }

  try {
    // Token dicek ke auth adapter. Kalau valid, uid-nya simpan di req
    // supaya route di bawahnya tahu siapa yang sedang request.
    const uid = await authAdapter.verifyToken(token);
    req.uid = uid;
    next();
  } catch {
    // jika tokennya salah atau sudah kedaluwarsa, user harus login ulang.
    res.status(401).json({
      error: "The token is invalid or has expired. Please sign in again.",
    });
  }
}
