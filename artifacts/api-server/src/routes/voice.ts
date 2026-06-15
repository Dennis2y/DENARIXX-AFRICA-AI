import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.post("/tts", requireAuth, async (req, res) => {
  try {
    const { text, voice } = req.body as { text?: string; voice?: string };

    const cleanText = (text ?? "")
      .replace(/```[\s\S]*?```/g, "Code block omitted from voice.")
      .replace(/[#*_>`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    if (!cleanText) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(501).json({ error: "OPENAI_API_KEY missing" });
      return;
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const audio = await client.audio.speech.create({
      model: process.env.OPENAI_TTS_MODEL || "tts-1-hd",
      voice: voice || process.env.OPENAI_TTS_VOICE || "nova",
      input: cleanText,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await audio.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "TTS failed");
    res.status(500).json({ error: "Failed to generate voice" });
  }
});

export default router;
