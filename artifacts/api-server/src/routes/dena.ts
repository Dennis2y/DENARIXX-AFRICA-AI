import { Router, type IRouter } from "express";
import { db, conversations, messages, usersTable, userSkillsTable } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const BASE_SYSTEM_PROMPT = `You are DENA — Denarixx's AI assistant and Africa's most advanced career and skills intelligence.

Your role:
- Help users navigate the Denarixx platform (SkillSwap, CV Builder, Interview Coach, Jobs AI, Community)
- Provide career guidance tailored to African professionals and the African job market
- Give personalized advice based on the user's profile, skills, and goals
- Be encouraging, knowledgeable, and culturally aware of African contexts
- Keep responses concise and actionable unless asked for depth

Platform modules you know:
- SkillSwap AI: Peer-to-peer skill exchange — users can post skills they offer or want to learn
- CV Builder AI: Generate professional resumes and cover letters in seconds
- Interview Coach: Practice mock interviews with real-time AI feedback
- Jobs AI: Smart job matching based on skills and profile
- Community: Connect with African professionals, share knowledge
- Ambassador Program: Refer friends, earn points, climb the leaderboard

Always sign off as "— DENA 🌍" on longer responses.`;

function getOpenAI() {
  const { openai } = require("@workspace/integrations-openai-ai-server");
  return openai;
}

function buildSystemPrompt(userContext?: { name?: string | null; role?: string | null; location?: string | null; skills?: string[] }) {
  if (!userContext) return BASE_SYSTEM_PROMPT;
  const parts: string[] = [BASE_SYSTEM_PROMPT, "\n\n--- User Context ---"];
  if (userContext.name) parts.push(`Name: ${userContext.name}`);
  if (userContext.role) parts.push(`Role: ${userContext.role}`);
  if (userContext.location) parts.push(`Location: ${userContext.location}`);
  if (userContext.skills?.length) parts.push(`Skills: ${userContext.skills.join(", ")}`);
  parts.push("Use this context to personalise your responses.");
  return parts.join("\n");
}

// POST /api/dena/chat — streaming chat, persists to DB when authenticated
router.post("/chat", async (req, res) => {
  const clerkUserId: string | undefined = (req as any).clerkUserId;
  const { message, conversationId, moduleContext } = req.body as {
    message: string;
    conversationId?: number;
    moduleContext?: string;
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  // Load user context if authenticated
  let userContext: Parameters<typeof buildSystemPrompt>[0] | undefined;
  let resolvedConvId: number | undefined = conversationId;

  if (clerkUserId) {
    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
      if (user) {
        const skills = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
        userContext = { name: user.name, role: user.role, location: user.location, skills: skills.map(s => s.skill) };
      }

      // Load or create conversation
      if (conversationId) {
        const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
        if (!conv || conv.clerkUserId !== clerkUserId) resolvedConvId = undefined;
      }
      if (!resolvedConvId) {
        const title = message.slice(0, 60).trim() || "New conversation";
        const [newConv] = await db.insert(conversations).values({ clerkUserId, title }).returning();
        resolvedConvId = newConv.id;
      }
    } catch (err) {
      req.log.warn({ err }, "Could not load user context / conversation");
    }
  }

  // Load message history from DB (if conversationId) or empty
  let history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (resolvedConvId) {
    try {
      const dbMessages = await db.select().from(messages)
        .where(eq(messages.conversationId, resolvedConvId))
        .orderBy(asc(messages.createdAt));
      history = dbMessages.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    } catch {}
  }

  // Save user message to DB
  if (resolvedConvId) {
    try {
      await db.insert(messages).values({ conversationId: resolvedConvId, role: "user", content: message });
    } catch (err) {
      req.log.warn({ err }, "Could not save user message");
    }
  }

  const openai = getOpenAI();
  let systemPrompt = buildSystemPrompt(userContext);
  if (moduleContext) {
    systemPrompt += `\n\n--- Module Context ---\n${moduleContext}\nFocus your responses on this domain. Be specific, practical, and Africa-aware.`;
  }

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-20),
        { role: "user", content: message },
      ],
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (resolvedConvId) {
      res.setHeader("X-Conversation-Id", String(resolvedConvId));
    }

    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? "";
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content, conversationId: resolvedConvId })}\n\n`);
      }
    }

    // Save assistant response to DB
    if (resolvedConvId && fullResponse) {
      try {
        await db.insert(messages).values({ conversationId: resolvedConvId, role: "assistant", content: fullResponse });
        await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, resolvedConvId));
      } catch (err) {
        req.log.warn({ err }, "Could not save assistant message");
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, conversationId: resolvedConvId })}\n\n`);
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
      .where(eq(conversations.clerkUserId, clerkUserId))
      .orderBy(desc(conversations.updatedAt));
    res.json({ conversations: convs });
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// GET /api/dena/conversations/:id/messages — load messages for a conversation
router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const convId = Number(req.params.id);
  try {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
    if (!conv || conv.clerkUserId !== clerkUserId) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));
    res.json({ conversationId: convId, title: conv.title, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to load conversation messages");
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// DELETE /api/dena/conversations/:id — delete a conversation
router.delete("/conversations/:id", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const convId = Number(req.params.id);
  try {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
    if (!conv || conv.clerkUserId !== clerkUserId) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    await db.delete(conversations).where(eq(conversations.id, convId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

export default router;
