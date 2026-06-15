import { Router, type Request, type Response } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, size } = req.body as { prompt?: string; size?: "1024x1024" | "1024x1536" | "1536x1024" };

    const cleanPrompt = (prompt || "").trim();

    if (!cleanPrompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY missing" });
      return;
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const image = await client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt: cleanPrompt,
      size: size || "1024x1024",
      n: 1,
    });

    const b64 = image.data?.[0]?.b64_json;

    if (!b64) {
      res.status(500).json({ error: "No image returned" });
      return;
    }

    res.json({
      image: `data:image/png;base64,${b64}`,
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    });
  } catch (err) {
    req.log.error({ err }, "Image generation failed");
    res.status(500).json({ error: "Image generation failed" });
  }
});

export default router;
