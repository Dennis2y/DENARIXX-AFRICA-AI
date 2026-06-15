import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function cleanVoiceText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "Code block omitted from voice.")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

async function elevenLabsTts(text: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing");

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs failed: ${response.status} ${await response.text()}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function openAiTtsFallback(text: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const audio = await client.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL || "tts-1",
    voice: process.env.OPENAI_TTS_VOICE || "nova",
    input: text,
    response_format: "mp3",
  });

  return Buffer.from(await audio.arrayBuffer());
}

router.post("/tts", requireAuth, async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    const cleanText = cleanVoiceText(text ?? "");

    if (!cleanText) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    let buffer: Buffer;

    try {
      buffer = await elevenLabsTts(cleanText);
    } catch (err) {
      req.log.warn({ err }, "ElevenLabs TTS failed, falling back to OpenAI TTS");
      buffer = await openAiTtsFallback(cleanText);
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "TTS failed");
    res.status(500).json({ error: "Failed to generate voice" });
  }
});

export default router;
