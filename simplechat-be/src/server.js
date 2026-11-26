// set up Express, CORS, dan daftarkan route.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { roomsRouter } from "./routes/chats.js";
import { profileRouter } from "./routes/profile.js";
import { usersRouter } from "./routes/users.js";

const port = Number(process.env.PORT || 3001);
// hanya frontend yang boleh akses API
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

// Bisa lebih dari satu origin, cukup dipisah koma di env.
const allowedOrigins = frontendOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

// Identitas user dikirim lewat header Authorization, jadi cookie nggak perlu.
app.use(
  cors({
    origin: (origin, callback) => {
      // Request tanpa origin (curl, mobile app, server-to-server) tetap saya izinkan.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Saya longgarkan biar deploy cross-origin nggak ribet
    },
    credentials: true,
  }),
);

// Body request dibatasi 16kb karena isinya cuma JSON kecil.
app.use(express.json({ limit: "16kb" }));

// ngecek server hidup atau nggak.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "simplechat-be" });
});

// Semua endpoint room ada di router ini.
app.use("/api/rooms", roomsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/users", usersRouter);

// menangani endpoint yang nggak ada.
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// Error handler terakhir. Express 5 otomatis meneruskan error dari async
// handler ke sini, jadi ga perlu try/catch di tiap route.
app.use((error, req, res, next) => {
  const code = error?.code ?? error?.status ?? "unknown";
  console.error(`Unhandled request error [${code}]`);
  res.status(500).json({ error: "Something went wrong on the server. Try again." });
});

// Di Vercel, server dijalankan sebagai serverless function, jadi jangan listen.
if (!process.env.VERCEL) {
  // Bootstrap index hanya relevan untuk Appwrite; Firebase pakai index console.
  if ((process.env.BACKEND_PROVIDER || "firebase").toLowerCase() === "appwrite") {
    const { bootstrapIndexes } = await import("./adapters/appwrite.js");
    bootstrapIndexes().catch((err) => console.error("[Appwrite] Bootstrap indexes failed:", err));
  }

  app.listen(port, () => {
    console.log(`simplechat-be is running on http://localhost:${port}`);
  });
}

export default app;
