import { Router, type IRouter } from "express";
import { db, conversations, messages, usersTable, userSkillsTable } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { streamAI } from "../lib/ai/aiRouter";

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


function detectChatLanguage(message: string): string | null {
  const text = message.trim().toLowerCase();

  if (/^(hallo|guten tag|guten morgen|guten abend|wie geht|servus|moin)\b/.test(text)) return "German";
  if (/^(hola|buenos días|buenos dias|buenas tardes|buenas noches|qué tal|que tal)\b/.test(text)) return "Spanish";
  if (/^(bonjour|bonsoir|salut|ça va|ca va)\b/.test(text)) return "French";
  if (/^(ciao|buongiorno|buonasera|come stai)\b/.test(text)) return "Italian";
  if (/^(olá|ola|bom dia|boa tarde|boa noite|tudo bem)\b/.test(text)) return "Portuguese";

  return null;
}

function strictLanguageSystemMessage(message: string) {
  const language = detectChatLanguage(message);
  if (!language) return null;

  return {
    role: "system" as const,
    content:
      `CRITICAL: The user's latest message is in ${language}. ` +
      `Reply ONLY in ${language}. Do not use English. Do not mix languages. ` +
      `Even if the message is only a greeting, continue fully in ${language}.`,
  };
}


function directGreetingResponse(message: string): string | null {
  const text = message.trim().toLowerCase();

  if (/^(hallo|guten tag|guten morgen|guten abend|servus|moin)[!.?\s]*$/.test(text)) {
    return "Hallo! Willkommen bei Denarixx. Wie kann ich dir heute helfen? Möchtest du deine Karriere verbessern, einen Lebenslauf erstellen, neue Fähigkeiten lernen oder passende Jobs finden?";
  }

  if (/^(bonjour|bonsoir|salut)[!.?\s]*$/.test(text)) {
    return "Bonjour ! Bienvenue sur Denarixx. Comment puis-je vous aider aujourd’hui ? Voulez-vous améliorer votre carrière, créer un CV, apprendre de nouvelles compétences ou trouver des offres d’emploi adaptées ?";
  }

  if (/^(hola|buenos días|buenos dias|buenas tardes|buenas noches)[!.?\s]*$/.test(text)) {
    return "¡Hola! Bienvenido a Denarixx. ¿Cómo puedo ayudarte hoy? ¿Quieres mejorar tu carrera, crear un CV, aprender nuevas habilidades o encontrar empleos adecuados?";
  }

  if (/^(ciao|buongiorno|buonasera)[!.?\s]*$/.test(text)) {
    return "Ciao! Benvenuto su Denarixx. Come posso aiutarti oggi? Vuoi migliorare la tua carriera, creare un CV, imparare nuove competenze o trovare lavori adatti?";
  }

  if (/^(olá|ola|bom dia|boa tarde|boa noite)[!.?\s]*$/.test(text)) {
    return "Olá! Bem-vindo ao Denarixx. Como posso ajudar você hoje? Quer melhorar sua carreira, criar um CV, aprender novas habilidades ou encontrar empregos adequados?";
  }

  return null;
}

function writeSseText(res: any, text: string, conversationId?: number) {
  const parts = text.match(/\S+\s*/g) ?? [text];
  for (const part of parts) {
    res.write(`data: ${JSON.stringify({ content: part, conversationId })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);
  res.end();
}
// POST /api/dena/chat — streaming chat, persists to DB when authenticated
router.post("/chat", async (req, res) => {
  const clerkUserId: string | undefined = (req as any).clerkUserId;
  const { message, conversationId, moduleContext, history: inlineHistory, overrideSystemPrompt, activeWorkflow } = req.body as {
    message: string;
    conversationId?: number;
    moduleContext?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    overrideSystemPrompt?: boolean;
    activeWorkflow?: string;
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

  // Load message history — from DB if conversationId, from inline payload if module chat
  let history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (resolvedConvId) {
    try {
      const dbMessages = await db.select().from(messages)
        .where(eq(messages.conversationId, resolvedConvId))
        .orderBy(asc(messages.createdAt));
      history = dbMessages.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    } catch {}
  } else if (Array.isArray(inlineHistory) && inlineHistory.length > 0) {
    history = inlineHistory
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-20);
  }

  // Save user message to DB
  if (resolvedConvId) {
    try {
      await db.insert(messages).values({ conversationId: resolvedConvId, role: "user", content: message });
    } catch (err) {
      req.log.warn({ err }, "Could not save user message");
    }
  }

  let systemPrompt: string;
  if (overrideSystemPrompt && moduleContext) {
    // Module chat: use only the module's own system prompt — no DENA career base
    const userCtxLines: string[] = [];
    if (userContext?.name) userCtxLines.push(`User name: ${userContext.name}`);
    if (userContext?.location) userCtxLines.push(`User location: ${userContext.location}`);

    // Inject activeWorkflow prominently at the TOP so the model never loses task context
    let prompt = moduleContext;
    if (activeWorkflow) {
      const wf = activeWorkflow.trim();
      const topInjection =
        `=== ACTIVE WORKFLOW: "${wf}" ===\n` +
        `This entire conversation is about: ${wf}\n` +
        `Every user reply — including single words like a country name, "yes/no", or a number — is their answer to YOUR last question, advancing the "${wf}" task.\n` +
        `NEVER respond generically. ALWAYS continue the "${wf}" workflow with the user's answer.\n\n`;
      const bottomReminder =
        `\n\n=== REMINDER ===\n` +
        `Active task: "${wf}". Short user replies are answers to your questions. Keep advancing this task.`;
      prompt = topInjection + moduleContext + bottomReminder;
    }

    systemPrompt = prompt + (userCtxLines.length ? `\n\n--- User Context ---\n${userCtxLines.join("\n")}` : "");
  } else {
    systemPrompt = buildSystemPrompt(userContext);
    if (moduleContext) {
      systemPrompt += `\n\n--- Module Context ---\n${moduleContext}\nFocus your responses on this domain. Be specific, practical, and Africa-aware.`;
    }
  }

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (resolvedConvId) {
      res.setHeader("X-Conversation-Id", String(resolvedConvId));
    }

    const directGreeting = directGreetingResponse(message);
    if (directGreeting) {
      writeSseText(res, directGreeting, resolvedConvId);
      return;
    }

    const aiResponse = await streamAI(
      {
        messages: [
          { role: "system", content: systemPrompt },
          ...(strictLanguageSystemMessage(message) ? [strictLanguageSystemMessage(message)!] : []),
          ...history.slice(-20),
          { role: "user", content: message },
        ],
        temperature: 0.7,
      },
      async (content) => {
        res.write(`data: ${JSON.stringify({ content, conversationId: resolvedConvId })}\n\n`);
      },
    );

    const fullResponse = aiResponse.content;

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
