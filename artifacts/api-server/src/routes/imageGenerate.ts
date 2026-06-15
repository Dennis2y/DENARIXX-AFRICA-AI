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

    const model = process.env.OPENAI_IMAGE_MODEL || "dall-e-3";

    const image = await client.images.generate({
      model,
      prompt: cleanPrompt,
      size: size || "1024x1024",
      n: 1,
    });

    const item = image.data?.[0];
    const b64 = item?.b64_json;
    const url = item?.url;

    if (!b64 && !url) {
      res.status(500).json({ error: "No image returned" });
      return;
    }

    res.json({
      image: b64 ? `data:image/png;base64,${b64}` : url,
      model,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    req.log.error({ err, message }, "Image generation failed");
    res.status(500).json({
      error: "Image generation failed",
      detail: process.env.NODE_ENV === "production" ? undefined : message,
    });
  }
});

export default router;
