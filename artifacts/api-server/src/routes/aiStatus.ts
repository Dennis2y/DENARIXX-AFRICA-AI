import { Router } from "express";
import { AI_CONFIG } from "../lib/ai/config";

const router = Router();

router.get("/", async (_req, res) => {
  res.json({
    providers: AI_CONFIG.providers,
    defaultProvider: AI_CONFIG.defaultProvider,
    fallbackOrder: AI_CONFIG.fallbackOrder,
  });
});

export default router;
