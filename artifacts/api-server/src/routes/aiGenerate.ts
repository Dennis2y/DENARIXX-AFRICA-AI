import { Router } from "express";
import { generateAI } from "../lib/ai/aiRouter";
import { requireAuth } from "../middlewares/requireAuth";
import { buildDenaUserContext } from "../lib/denaContextEngine";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body as {
      prompt?: string;
      message?: string;
      messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      provider?: "openai" | "gemini" | "anthropic" | "groq" | "mistral";
      model?: string;
    };

    const prompt = (body.prompt || body.message || "").trim();
    const clerkUserId = (req as any).clerkUserId as string | undefined;
    const denaContext = clerkUserId ? await buildDenaUserContext(clerkUserId) : null;

    const messages =
      Array.isArray(body.messages) && body.messages.length
        ? [
            {
              role: "system" as const,
              content: denaContext?.context || "No verified user context available. Do not invent personal details.",
            },
            ...body.messages,
          ]
        : [
            {
              role: "system" as const,
              content: denaContext?.context || "No verified user context available. Do not invent personal details.",
            },
            {
              role: "user" as const,
              content: prompt,
            },
          ];

    if (!messages.some((msg) => msg.content?.trim())) {
      res.status(400).json({ error: "prompt, message, or messages are required" });
      return;
    }

    const result = await generateAI({
      provider: body.provider,
      model: body.model,
      messages,
      temperature: 0.7,
    });

    res.json({
      content: result.content,
      provider: result.provider,
      model: result.model,
    });
  } catch (err) {
    req.log.error({ err }, "AI generate failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "AI generation failed" });
  }
});

export default router;
