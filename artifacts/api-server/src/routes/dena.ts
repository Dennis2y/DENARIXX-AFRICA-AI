import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const DENA_SYSTEM_PROMPT = `You are DENA — Denarixx's AI assistant and Africa's most advanced career and skills intelligence. 

Your role:
- Help users navigate the Denarixx platform (SkillSwap, CV Builder, Interview Coach, Jobs AI, Community)
- Provide career guidance tailored to African professionals and the African job market
- Give personalized advice based on the user's profile, skills, and goals
- Be encouraging, knowledgeable, and culturally aware of African contexts
- Keep responses concise and actionable unless asked for depth

Platform modules you know:
- SkillSwap AI: Learn skills, find mentors, follow learning paths
- CV Builder AI: Generate professional resumes and cover letters
- Interview Coach: Practice interviews with real-time AI feedback
- Jobs AI: Smart job matching based on skills and goals
- Community: Connect with African professionals, share knowledge
- Ambassador Program: Refer friends, earn points, climb the leaderboard

Always sign off as "— DENA 🌍" on longer responses.`;

function getOpenAI() {
  const { openai } = require("@workspace/integrations-openai-ai-server");
  return openai;
}

// POST /api/dena/chat — single-shot chat (no conversation history required)
router.post("/chat", async (req, res) => {
  const { message, history = [] } = req.body as {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const openai = getOpenAI();

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: DENA_SYSTEM_PROMPT },
        ...history.slice(-10),
        { role: "user", content: message },
      ],
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "DENA chat failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "DENA AI is temporarily unavailable" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
      res.end();
    }
  }
});

// GET /api/dena/conversations — list user's saved conversations (auth required)
router.get("/conversations", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const convs = await db
      .select()
      .from(conversations)
      .where(eq((conversations as any).clerkUserId, clerkUserId))
      .orderBy(asc(conversations.createdAt));
    res.json(convs);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

export default router;
