import { Router, type IRouter } from "express";
import { db, conversations, messages, usersTable, userSkillsTable, userMemories, documentUploads, documentChunks } from "@workspace/db";
import { eq, desc, asc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { streamAI, generateAI } from "../lib/ai/aiRouter";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

const BASE_SYSTEM_PROMPT = `You are DENA — Denarixx's AI assistant and Africa's most advanced career and skills intelligence.

Your role:
- Help users navigate the Denarixx platform (SkillSwap, CV Builder, Interview Coach, Jobs AI, Community)
- Help users write code, debug code, explain code, build software projects, design APIs, and create frontend/backend applications
- Provide career guidance tailored to African professionals and the African job market
- Give personalized advice based on the user's profile, skills, and goals
- Be encouraging, knowledgeable, and culturally aware of African contexts
- Keep responses concise and actionable unless asked for depth
- When giving general help/career advice, mention that you can also help with coding, debugging, project building, CVs, documents, and interview prep

Platform modules you know:
- SkillSwap AI: Peer-to-peer skill exchange — users can post skills they offer or want to learn
- CV Builder AI: Generate professional resumes and cover letters in seconds
- Interview Coach: Practice mock interviews with real-time AI feedback
- Jobs AI: Smart job matching based on skills and profile
- Community: Connect with African professionals, share knowledge
- Ambassador Program: Refer friends, earn points, climb the leaderboard

Coding assistant capability:
Coding Assistant Rules:

When the user asks for:

- code
- html
- css
- javascript
- typescript
- react
- nextjs
- node
- express
- fastify
- prisma
- drizzle
- sql
- python
- api
- backend
- frontend
- bug fixing
- debugging

You MUST behave as a software engineer.

If the user requests code:
- Output working code first.
- Do not explain before the code.
- Use markdown code blocks.
- Give complete examples whenever possible.

If the user asks for an application:
- Generate file-by-file implementation.

If the user asks for a bug fix:
- Show corrected code.

Never respond with:
"I am not a coding platform"
or
"I can only give guidance"

Always provide actual code when code is requested.

Code formatting rules:
- ALWAYS use triple-backtick fenced markdown blocks for multi-line code.
- Use language tags: html, css, javascript, typescript, python, sql.
- NEVER use single backticks for multi-line code.
- Output code first when code is requested.


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

  // Explicit non-English detection first
  if (/(hallo|guten tag|guten morgen|guten abend|wie geht|servus|moin|danke|bitte|lebenslauf|karriere)/.test(text)) return "German";
  if (/(hola|buenos días|buenos dias|buenas tardes|buenas noches|qué tal|que tal|gracias|trabajo|habilidades)/.test(text)) return "Spanish";
  if (/(bonjour|bonsoir|salut|ça va|ca va|merci|emploi|compétences|carrière)/.test(text)) return "French";
  if (/(ciao|buongiorno|buonasera|come stai|grazie|lavoro)/.test(text)) return "Italian";
  if (/(olá|ola|bom dia|boa tarde|boa noite|tudo bem|obrigado|trabalho)/.test(text)) return "Portuguese";

  // Strong English detection
  if (/(hi|hello|hey|thanks|thank you|you are welcome|code|coding|html|css|javascript|python|write|give|show|make|build|create|what|which|who|where|when|why|how|can|could|would|should|is|are|do|does|did|experience|skills|backend|frontend|career|job|document|cv|resume|strongest)/.test(text)) {
    return "English";
  }

  // If the text uses normal Latin letters and no clear non-English signal, default to English.
  if (/[a-z]/.test(text)) return "English";

  return null;
}


function detectReplyLanguage(message: string): string | null {
  return detectChatLanguage(message);
}


function strictLanguageSystemMessage(message: string) {
  const language = detectChatLanguage(message);
  if (!language) return null;

  return {
    role: "system" as const,
    content:
      `NON-NEGOTIABLE LANGUAGE RULE: Reply ONLY in ${language}. ` +
      `The user's latest message controls the reply language. ` +
      `Uploaded documents, retrieved chunks, summaries, memories, and conversation history may be in another language, but they must NOT control the response language. ` +
      `Use the facts from documents, but translate/explain them fully in ${language}. ` +
      `Do not start in the document language. Do not mix languages.`,
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



function tokenizeForSearch(text: string): string[] {
  const stopwords = new Set([
    "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "was", "were",
    "what", "how", "why", "when", "where", "who", "does", "about", "into", "eine", "der",
    "die", "das", "und", "ist", "mit", "pour", "les", "des", "que", "qui", "como", "para",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopwords.has(w))
    .slice(0, 20);
}

async function loadRelevantDocumentChunks(
  userId: number,
  query: string,
): Promise<Array<{ filename: string; content: string; score: number }>> {
  try {
    const terms = tokenizeForSearch(query);

    const rows = await db
      .select({
        filename: documentUploads.filename,
        content: documentChunks.content,
      })
      .from(documentChunks)
      .innerJoin(documentUploads, eq(documentChunks.documentId, documentUploads.id))
      .where(and(
        eq(documentUploads.userId, userId),
        eq(documentUploads.isActive, true),
        eq(documentChunks.isActive, true),
      ))
      .orderBy(desc(documentChunks.createdAt))
      .limit(240);

    const scored = rows
      .map((row) => {
        const lower = row.content.toLowerCase();
        const filenameLower = row.filename.toLowerCase();
        const score = terms.reduce((sum, term) => {
          const inContent = lower.includes(term) ? 2 : 0;
          const inFile = filenameLower.includes(term) ? 1 : 0;
          return sum + inContent + inFile;
        }, 0);

        return { ...row, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    if (scored.length > 0) return scored;

    return rows.slice(0, 8).map((row) => ({ ...row, score: 0 }));
  } catch {
    return [];
  }
}


async function loadRecentDocuments(userId: number): Promise<Array<{ filename: string; summary: string | null; content: string }>> {
  try {
    return await db
      .select({
        filename: documentUploads.filename,
        summary: documentUploads.summary,
        content: documentUploads.content,
      })
      .from(documentUploads)
      .where(and(eq(documentUploads.userId, userId), eq(documentUploads.isActive, true)))
      .orderBy(desc(documentUploads.updatedAt))
      .limit(3);
  } catch {
    return [];
  }
}

async function loadUserMemories(userId: number): Promise<string[]> {
  try {
    const rows = await db
      .select({ content: userMemories.content })
      .from(userMemories)
      .where(and(eq(userMemories.userId, userId), eq(userMemories.isActive, true)))
      .orderBy(desc(userMemories.updatedAt))
      .limit(12);

    return rows.map((r) => r.content).filter(Boolean);
  } catch {
    return [];
  }
}

function extractSimpleMemories(message: string): string[] {
  const text = message.trim();
  const memories: string[] = [];

  const patterns = [
    /\bmy name is\s+(.+)/i,
    /\bi am\s+(.+)/i,
    /\bi'm\s+(.+)/i,
    /\bi work as\s+(.+)/i,
    /\bi want to\s+(.+)/i,
    /\bmein name ist\s+(.+)/i,
    /\bich bin\s+(.+)/i,
    /\bje suis\s+(.+)/i,
    /\bme llamo\s+(.+)/i,
    /\bsoy\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) memories.push(match[0].trim());
  }

  return [...new Set(memories)].slice(0, 5);
}

async function saveUserMemories(userId: number, rawMemories: string[]) {
  const memories = rawMemories
    .map((m) => m.trim())
    .filter((m) => m.length >= 6 && m.length <= 300);

  for (const content of memories) {
    try {
      const existing = await db
        .select({ id: userMemories.id })
        .from(userMemories)
        .where(and(eq(userMemories.userId, userId), eq(userMemories.content, content)))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(userMemories).values({
          userId,
          category: "profile",
          content,
          source: "dena_chat",
        });
      }
    } catch {
      // Memory should never break chat
    }
  }
}



function normalizeCodeFences(text: string): string {
  return text
    .replace(/`(html|css|javascript|js|typescript|ts|python|sql)\n([\s\S]*?)\n`/gi, (_match, lang, code) => {
      const fixedLang = String(lang).toLowerCase()
        .replace("js", "javascript")
        .replace("ts", "typescript");
      return "```" + fixedLang + "\n" + String(code).trim() + "\n```";
    })
    .replace(/`(html|css|javascript|js|typescript|ts|python|sql)\s+([\s\S]*?)`/gi, (_match, lang, code) => {
      const fixedLang = String(lang).toLowerCase()
        .replace("js", "javascript")
        .replace("ts", "typescript");
      return "```" + fixedLang + "\n" + String(code).trim() + "\n```";
    });
}


async function forceReplyLanguage(targetLanguage: string, answer: string): Promise<string> {
  if (!targetLanguage || !answer.trim()) return answer;

  // Never rewrite code-heavy responses; language normalization can corrupt code blocks.
  if (/```[\s\S]*?```/.test(answer) || /`(?:html|css|javascript|typescript|python|sql)[\s\S]*?`/i.test(answer)) {
    return answer;
  }

  try {
    const fixed = await generateAI({
      messages: [
        {
          role: "system",
          content:
            `You are a strict language normalizer. Rewrite the assistant answer ONLY in ${targetLanguage}. ` +
            `Do not add an introduction. Do not say "here is the revised answer". Do not say "It seems you are writing in English". ` +
            `Preserve ALL code blocks exactly as-is. Do not translate, explain, summarize, remove, or reformat code. ` +
            `Preserve all facts, names, technologies, company names, and meaning. ` +
            `If the answer is already in ${targetLanguage}, return it cleanly in ${targetLanguage}.`,
        },
        {
          role: "user",
          content: answer,
        },
      ],
      temperature: 0.1,
    });

    return fixed.content?.trim() || answer;
  } catch {
    return answer;
  }
}







function isJobMatchRequest(message: string): boolean {
  const text = message.toLowerCase();

  return (
    text.includes("match this job") ||
    text.includes("job match") ||
    text.includes("match my cv") ||
    text.includes("compare my cv") ||
    text.includes("compare this job") ||
    text.includes("am i fit for this job") ||
    text.includes("should i apply") ||
    text.includes("job description") ||
    text.includes("jd:")
  );
}

function isCVAnalysisRequest(message: string): boolean {
  const text = message.toLowerCase();

  return (
    text.includes("analyze my cv") ||
    text.includes("analyse my cv") ||
    text.includes("review my cv") ||
    text.includes("rate my cv") ||
    text.includes("cv score") ||
    text.includes("resume score") ||
    text.includes("improve my cv") ||
    text.includes("ats score")
  );
}

function isRoadmapRequest(message: string): boolean {
  const text = message.toLowerCase();

  return (
    text.includes("roadmap") ||
    text.includes("career roadmap") ||
    text.includes("career path") ||
    text.includes("learning path") ||
    text.includes("skills roadmap") ||
    text.includes("become ai engineer") ||
    text.includes("ai engineer roadmap") ||
    text.includes("software engineer roadmap") ||
    text.includes("data scientist roadmap") ||
    text.includes("machine learning roadmap") ||
    text.includes("how do i become") ||
    text.includes("create an ai engineer roadmap") ||
    text.includes("create a roadmap")
  );
}

function isCodingRequest(message: string): boolean {
  const text = message.toLowerCase();

  return (
    text.includes("code") ||
    text.includes("coding") ||
    text.includes("html") ||
    text.includes("css") ||
    text.includes("javascript") ||
    text.includes("typescript") ||
    text.includes("react") ||
    text.includes("nextjs") ||
    text.includes("node") ||
    text.includes("express") ||
    text.includes("fastify") ||
    text.includes("prisma") ||
    text.includes("drizzle") ||
    text.includes("python") ||
    text.includes("sql") ||
    text.includes("api") ||
    text.includes("backend") ||
    text.includes("frontend") ||
    text.includes("portfolio page") ||
    text.includes("website") ||
    text.includes("application") ||
    text.includes("bug") ||
    text.includes("debug")
  );
}


// POST /api/dena/chat — streaming chat, persists to DB when authenticated
router.post("/chat", async (req, res) => {
  const clerkUserId: string | undefined = (req as any).clerkUserId || getAuth(req)?.userId;
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
  let resolvedUserId: number | undefined;
  let savedMemoryLines: string[] = [];
  let recentDocuments: Array<{ filename: string; summary: string | null; content: string }> = [];
  let relevantDocumentChunks: Array<{ filename: string; content: string; score: number }> = [];
  let resolvedConvId: number | undefined = conversationId;

  if (clerkUserId) {
    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
      if (user) {
        resolvedUserId = user.id;
        const skills = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
        savedMemoryLines = await loadUserMemories(user.id);
        recentDocuments = await loadRecentDocuments(user.id);
        relevantDocumentChunks = await loadRelevantDocumentChunks(user.id, message);
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

  if (savedMemoryLines.length) {
    systemPrompt += `\n\n--- Long-term User Memory ---\n${savedMemoryLines.map((m) => `- ${m}`).join("\n")}\nUse these memories carefully to personalize help. Do not mention memory unless it is useful.`;
  }

  const isSpecialAnalysisMode =
    isCVAnalysisRequest(message) || isJobMatchRequest(message) || isRoadmapRequest(message);

  if (isSpecialAnalysisMode && recentDocuments.length) {
    systemPrompt += `\n\n--- FULL RECENT UPLOADED DOCUMENT CONTEXT ---\n${recentDocuments.map((doc, index) => {
      const preview = (doc.content || doc.summary || "").slice(0, 9000);
      return `Document ${index + 1}: ${doc.filename}\n${preview}`;
    }).join("\n\n---\n\n")}\nFor CV analysis, job matching, and roadmaps, treat this as SOURCE A/profile evidence. Use only this document evidence when saying a skill is found.`;
  } else if (relevantDocumentChunks.length) {
    systemPrompt += `\n\n--- Relevant Uploaded Document Chunks ---\n${relevantDocumentChunks.map((chunk, index) => {
      return `Source ${index + 1}: ${chunk.filename}\n${chunk.content.slice(0, 3500)}`;
    }).join("\n\n---\n\n")}\nUse these chunks when answering questions about uploaded files, CVs, notes, documents, or when the user says "this document". If the chunks do not contain the answer, say that clearly.`;
  } else if (recentDocuments.length) {
    systemPrompt += `\n\n--- Recently Uploaded Documents ---\n${recentDocuments.map((doc) => {
      const preview = (doc.summary || doc.content).slice(0, 4000);
      return `Document: ${doc.filename}\n${preview}`;
    }).join("\n\n---\n\n")}\nUse these documents when the user asks about uploaded files, CVs, notes, documents, or says "this document".`;
  }


  if (isJobMatchRequest(message)) {
    console.log("JOB MATCH ENGINE ACTIVATED");

    systemPrompt += `

=== JOB MATCH ENGINE MODE ===

Use any document context provided below as SOURCE A. If document context exists, you MUST use it.

You are ONLY a CV-grounded job matching engine, recruiter, ATS evaluator, and technical hiring manager.

You MUST compare:

SOURCE A:
Uploaded CV/resume/profile/document chunks.

SOURCE B:
The pasted job description from the user's latest message. Extract all requirements from SOURCE B and compare them against SOURCE A.

CRITICAL RULES:
- Never invent skills.
- Only mark a skill as FOUND if it clearly appears in SOURCE A.
- If a skill is not clearly found in SOURCE A, mark it as MISSING or PARTIAL.
- Always provide evidence from the CV when marking a skill as FOUND.
- Evidence must be copied or closely paraphrased only from SOURCE A.
- Never invent quoted CV evidence.
- If exact evidence is not available, write "Not found in CV".
- Mark a skill as FOUND when it clearly appears in SOURCE A.
- Mark a skill as PARTIAL when SOURCE A shows related experience, adjacent technology, or equivalent practical experience.
- Mark a skill as MISSING only when SOURCE A has no evidence for it.
- Do NOT write code.
- Do NOT give generic career advice.
- Do NOT write an email or cover letter.
- If no CV/profile/document information is available, say exactly: "CV/profile not found."
- If no job description is available, ask the user to paste the job description.
- Your first line MUST be: # Job Match Score

Return ONLY this structure:

# Job Match Score
Score: XX/100
Verdict: Strong Match / Good Match / Medium Match / Weak Match / Not Recommended

# ATS Match Score
Score: XX/100
Reason:

# CV Skills Found
- Skill — evidence from CV

# Job Requirements Found
- Skill

# Skill Match Matrix
| Requirement | Status | CV Evidence |
|---|---|---|
| Python | Found / Partial / Missing | Evidence or "Not found in CV" |

# Strong Matches
- 

# Missing Skills
- 

# Partial Matches
- 

# Missing Keywords
- 

# Risk Factors
- 

# Interview Probability
XX%

# Apply Recommendation
Apply / Apply after improving CV / Do not apply yet

# CV Tailoring Suggestions
1.
2.
3.
4.
5.

# Best Next Step

Do not output anything outside this structure.
`;


  }

  if (isCVAnalysisRequest(message)) {
    console.log("CV INTELLIGENCE ACTIVATED");

    systemPrompt += `

=== CV INTELLIGENCE MODE ===

You are ONLY a professional CV/resume analyst.

You are acting as:
- Senior recruiter
- ATS scanner
- Technical hiring manager
- Career coach

CRITICAL RULES:
- Ignore all coding assistant instructions.
- Ignore all project-building instructions.
- Do NOT write code.
- Do NOT write Python.
- Do NOT write JavaScript.
- Do NOT write TypeScript.
- Do NOT write HTML.
- Do NOT write CSS.
- Do NOT write Bash.
- Do NOT give command examples.
- Do NOT write a letter or email.
- Do NOT give generic career advice.
- ONLY evaluate the uploaded CV/resume.

If uploaded CV content is available, use it.
If no CV document is available, say exactly: "CV document not found."

Return ONLY this structure:

# CV Score
Score: XX/100
Reason:

# ATS Score
Score: XX/100
Reason:

# Best Matching Roles
- Role — XX%
- Role — XX%
- Role — XX%

# Strengths
- 

# Weaknesses
- 

# Missing Skills
List only requirements from SOURCE B that are NOT found in SOURCE A.
- 

# Missing Keywords
- 

# Recruiter Impression

# Interview Probability
XX%

# Priority Improvements
1.
2.
3.
4.
5.

# Best Next Step

CRITICAL OUTPUT RULES:
- Your first line MUST be: # CV Score
- If you output anything before "# CV Score", your answer is wrong.
- If you output code, your answer is wrong.
- If you output generic career advice, your answer is wrong.
- Do not output anything outside this structure.
`;
  }
  if (isRoadmapRequest(message)) {
    console.log("CAREER ROADMAP MODE ACTIVATED");

    systemPrompt += `

=== CAREER ROADMAP MODE ===

You are ONLY a career roadmap strategist and technical career coach.

CRITICAL RULES:
- Your first line MUST be: # Career Roadmap
- Do NOT write code.
- Do NOT output Python.
- Do NOT output JavaScript.
- Do NOT output Bash.
- Do NOT provide code samples.
- Do NOT translate your answer into another language unless the user asks.
- Do NOT continue old roadmap history.
- Do NOT give generic motivation.
- Use uploaded CV/profile/document chunks when available.
- Use the user's latest target role/location.
- If target role is unclear, infer it and state the assumption.

Return ONLY this structure:

# Career Roadmap
Target Role:
Location:
Current Level:
Estimated Timeline:

# Current Strengths
- 

# Skills Gap
- 

# 30-Day Plan
- 

# 60-Day Plan
- 

# 90-Day Plan
- 

# Portfolio Projects To Build
1.
2.
3.

# Certifications / Learning
- 

# Job Search Strategy
- 

# Weekly Routine
- 

# Milestones
- 

# Best Next Step

Do not output anything outside this structure.
`;
  }

  if (!isCVAnalysisRequest(message) && !isJobMatchRequest(message) && !isRoadmapRequest(message) && isCodingRequest(message)) {
    console.log("CODING MODE ACTIVATED");

    systemPrompt += `

--- CODING ASSISTANT MODE ---

CRITICAL:

If user asks for HTML:
Return HTML code immediately.

If user asks for CSS:
Return CSS code immediately.

If user asks for JavaScript:
Return JavaScript code immediately.

If user asks for React:
Return React code immediately.

If user asks for Python:
Return Python code immediately.

Do NOT explain before code.
Do NOT describe before code.
Do NOT review before code.

Output code first.
ALWAYS use triple-backtick fenced markdown code blocks.
Use language tags like html, css, javascript, typescript, python, sql.
NEVER use single-backtick blocks for multi-line code.


`;

  }


  const detectedReplyLanguage = detectReplyLanguage(message);
  if (detectedReplyLanguage) {
    systemPrompt += `\n\n--- Reply Language Rule ---\nThe latest user message is in ${detectedReplyLanguage}. Reply only in ${detectedReplyLanguage}, even if uploaded documents are in another language. Use document facts but translate the answer into ${detectedReplyLanguage}.`;
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

    const finalReplyLanguage = detectReplyLanguage(message);
    console.log("DENA_REPLY_LANGUAGE_DEBUG", { message, finalReplyLanguage });
    const finalUserMessage =
      finalReplyLanguage &&
      !isCodingRequest(message) &&
      !isCVAnalysisRequest(message) &&
      !isJobMatchRequest(message) &&
      !isRoadmapRequest(message)
        ? `REPLY LANGUAGE: ${finalReplyLanguage}\n\nYou MUST answer only in ${finalReplyLanguage}.\nIf uploaded documents or retrieved chunks are in another language, translate the facts into ${finalReplyLanguage}.\nDo not answer in the uploaded document language unless it is also ${finalReplyLanguage}.\n\nUSER QUESTION:\n${message}`
      : message;

    const analysisDocumentContext = (recentDocuments.length ? recentDocuments : []).map((doc, index) => {
      const text = (doc.content || doc.summary || "").slice(0, 12000);
      return `SOURCE A DOCUMENT ${index + 1}: ${doc.filename}\n${text}`;
    }).join("\n\n---\n\n");

    if ((isCVAnalysisRequest(message) || isJobMatchRequest(message) || isRoadmapRequest(message)) && analysisDocumentContext) {
      systemPrompt += `\n\n=== SOURCE A: UPLOADED CV / PROFILE DOCUMENT CONTEXT ===\n${analysisDocumentContext}\n\n=== END SOURCE A ===\nUse this SOURCE A content as the candidate CV/profile evidence. If a skill appears here, it is FOUND. If it does not appear here, it is MISSING or PARTIAL.`;
    }

    console.log("FINAL_SYSTEM_PROMPT");
    console.log(systemPrompt);
    console.log("FINAL_USER_MESSAGE");
    console.log(finalUserMessage);
    console.log("DENA_DOC_DEBUG", {
      recentDocuments: recentDocuments.length,
      relevantDocumentChunks: relevantDocumentChunks.length,
      recentDocumentPreview: recentDocuments.map((doc) => ({
        filename: doc.filename,
        contentLength: doc.content?.length ?? 0,
        summaryLength: doc.summary?.length ?? 0,
        preview: (doc.content || doc.summary || "").slice(0, 300),
      })),
      chunkPreview: relevantDocumentChunks.map((chunk) => ({
        filename: chunk.filename,
        contentLength: chunk.content?.length ?? 0,
        score: chunk.score,
        preview: chunk.content.slice(0, 300),
      })),
      isCV: isCVAnalysisRequest(message),
      isJobMatch: isJobMatchRequest(message),
      isRoadmap: isRoadmapRequest(message),
    });

    console.log("MODE_DEBUG", {
      isCV: isCVAnalysisRequest(message),
      isJobMatch: isJobMatchRequest(message),
      isRoadmap: isRoadmapRequest(message),
      isCoding: isCodingRequest(message),
    });

    const aiResponse = await generateAI({
      messages: [
        { role: "system", content: systemPrompt },
        ...((isCVAnalysisRequest(message) || isJobMatchRequest(message) || isRoadmapRequest(message)) ? [] : history.slice(-20)),
        ...((isCVAnalysisRequest(message) || isJobMatchRequest(message) || isRoadmapRequest(message)) ? [] : (strictLanguageSystemMessage(message) ? [strictLanguageSystemMessage(message)!] : [])),
        { role: "user", content: finalUserMessage },
      ],
      temperature: 0.4,
    });

    console.log("RAW_AI_RESPONSE");
    console.log(aiResponse.content);

    let fullResponse = aiResponse.content || "";

    fullResponse = normalizeCodeFences(fullResponse);

    const responseHasCode = /```[\s\S]*?```/.test(fullResponse) || /`(?:html|css|javascript|typescript|python|sql)[\s\S]*?`/i.test(fullResponse);

    if (!isCVAnalysisRequest(message) && !isJobMatchRequest(message) && !isRoadmapRequest(message) && isCodingRequest(message)) {
      fullResponse = await forceReplyLanguage(finalReplyLanguage!, fullResponse);
    }

    fullResponse = normalizeCodeFences(fullResponse);

    if (resolvedUserId) {
      await saveUserMemories(resolvedUserId, extractSimpleMemories(message));
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

    res.write(`data: ${JSON.stringify({ content: fullResponse, conversationId: resolvedConvId })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, conversationId: resolvedConvId })}\n\n`);
    res.end();
    return;

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
