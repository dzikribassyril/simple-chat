import { adminAuth } from "../firebase.js";

// verifyIdToken() checks the token signature, its expiry, and its issuer.
export async function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (!token) {
    res.status(401).json({
      error: "No token found. Send the Authorization: Bearer <firebase id token> header.",
    });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    // The UID from the token becomes the sender identity; the backend never
    // trusts a value coming from the request body.
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({
      error: "The token is invalid or has expired. Please sign in again.",
    });
  }
}
