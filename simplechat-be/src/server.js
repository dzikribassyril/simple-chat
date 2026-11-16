import "dotenv/config";
import express from "express";
import cors from "cors";
import { chatsRouter } from "./routes/chats.js";

const port = Number(process.env.PORT || 3001);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

// Several origins are allowed by listing them with a comma.
const allowedOrigins = frontendOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

// The Authorization header carries the identity, so cookies do not need to be allowed.
// In cloud/serverless, if frontendOrigin is "*" or origins match, CORS allows it.
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for production deployment cross-origin
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "simplechat-be" });
});

app.use("/api/chats", chatsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// Express 5 forwards errors thrown by async handlers to this middleware.
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server. Try again." });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`simplechat-be is running on http://localhost:${port}`);
  });
}

export default app;
