import { Router } from "express";
import { dbAdapter } from "../adapters/index.js";
import { requireAuth } from "../middleware/auth.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);
profileRouter.post("/", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name || name.length > 100) {
    return res.status(400).json({ error: "Name must be between 1 and 100 characters." });
  }
  await dbAdapter.ensureProfile(req.uid, name);
  res.json({ success: true });
});

profileRouter.patch("/", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name || name.length > 100) {
    return res.status(400).json({ error: "Name must be between 1 and 100 characters." });
  }
  await dbAdapter.updateDisplayName(req.uid, name);
  res.json({ success: true });
});
