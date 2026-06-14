import { Router } from "express";
import { generateAI } from "../lib/ai/aiRouter";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { provider, messages, temperature } = req.body;

    const result = await generateAI({
      provider,
      messages,
      temperature: temperature ?? 0.3,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: err?.message ?? "AI generation failed",
    });
  }
});

export default router;
