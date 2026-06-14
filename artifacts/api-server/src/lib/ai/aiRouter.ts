import OpenAI from "openai";
import { AIRequest, AIResponse, AIProvider } from "./types";
import { AI_CONFIG } from "./config";
import { callAnthropic } from "./providers/anthropic";
import { callMistral } from "./providers/mistral";

const VALID_PROVIDERS: AIProvider[] = ["openai", "gemini", "anthropic", "groq", "mistral"];

function isAIProvider(value: unknown): value is AIProvider {
  return typeof value === "string" && VALID_PROVIDERS.includes(value as AIProvider);
}

const MULTILINGUAL_SYSTEM_RULE = `You are multilingual.
Automatically detect the user's language from their latest message.
Always respond fully in the same language the user used.
If the user mixes languages, respond in the main language while preserving important names, brands, technical terms, and quoted text.
You can understand, read, write, translate, rewrite, summarize, and explain in any language.
Never force English unless the user explicitly asks for English.

Short greeting language rules:
- If the user writes "Hallo", "Guten Tag", "Guten Morgen", "Guten Abend", "Wie geht's", or similar German greetings, respond fully in German.
- If the user writes "Hola", "Buenos días", "Buenas tardes", or similar Spanish greetings, respond fully in Spanish.
- If the user writes "Bonjour", "Bonsoir", "Salut", or similar French greetings, respond fully in French.
- If the user writes "Ciao", "Buongiorno", or similar Italian greetings, respond fully in Italian.
- If the user writes "Olá", "Bom dia", or similar Portuguese greetings, respond fully in Portuguese.
- For short greetings, treat the greeting language as the user's language.
- Do not answer partly in English after a non-English greeting.
- Only use English when the user writes in English or explicitly asks for English.`;

function detectForcedLanguage(messages: AIRequest["messages"]): string | null {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content?.trim().toLowerCase();
  if (!lastUser) return null;

  if (/^(hallo|guten tag|guten morgen|guten abend|wie geht|servus|moin)\b/.test(lastUser)) return "German";
  if (/^(hola|buenos días|buenos dias|buenas tardes|buenas noches|qué tal|que tal)\b/.test(lastUser)) return "Spanish";
  if (/^(bonjour|bonsoir|salut|ça va|ca va)\b/.test(lastUser)) return "French";
  if (/^(ciao|buongiorno|buonasera|come stai)\b/.test(lastUser)) return "Italian";
  if (/^(olá|ola|bom dia|boa tarde|boa noite|tudo bem)\b/.test(lastUser)) return "Portuguese";

  return null;
}

function languageOverrideRule(messages: AIRequest["messages"]) {
  const language = detectForcedLanguage(messages);
  if (!language) return "";

  return `\n\nCRITICAL LANGUAGE OVERRIDE:
The user's latest message is in ${language}.
You MUST respond fully in ${language}.
Do NOT use English.
Do NOT mix English with ${language}.
Even if the message is only a short greeting, continue fully in ${language}.`;
}

function normalizeMessages(messages: AIRequest["messages"]) {
  const hasSystem = messages.some((m) => m.role === "system");

  const normalized = messages.map((m) => ({
    role: m.role,
    content:
      m.role === "system"
        ? `${MULTILINGUAL_SYSTEM_RULE}${languageOverrideRule(messages)}\n\n${m.content}`
        : m.content,
  }));

  if (!hasSystem) {
    return [
      { role: "system" as const, content: `${MULTILINGUAL_SYSTEM_RULE}${languageOverrideRule(messages)}` },
      ...normalized,
    ];
  }

  return normalized;
}

async function callOpenAI(request: AIRequest): Promise<AIResponse> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = request.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

  const result = await client.chat.completions.create({
    model,
    messages: normalizeMessages(request.messages),
    temperature: request.temperature ?? 0.7,
  });

  return {
    provider: "openai",
    model,
    content: result.choices[0]?.message?.content || "",
  };
}

async function callGroq(request: AIRequest): Promise<AIResponse> {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");

  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const model = request.model || process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  const result = await client.chat.completions.create({
    model,
    messages: normalizeMessages(request.messages),
    temperature: request.temperature ?? 0.7,
  });

  return {
    provider: "groq",
    model,
    content: result.choices[0]?.message?.content || "",
  };
}

async function callGemini(request: AIRequest): Promise<AIResponse> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const model = request.model || process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const prompt = request.messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: request.temperature ?? 0.7 },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as any;

  return {
    provider: "gemini",
    model,
    content:
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .filter(Boolean)
        .join("\n") || "",
  };
}

async function callProvider(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
  if (!AI_CONFIG.providers[provider]) {
    throw new Error(`${provider.toUpperCase()} is not configured`);
  }

  if (provider === "openai") return callOpenAI(request);
  if (provider === "gemini") return callGemini(request);
  if (provider === "groq") return callGroq(request);
  if (provider === "anthropic") return callAnthropic(request);
  if (provider === "mistral") return callMistral(request);

  throw new Error(`Unsupported provider: ${provider}`);
}

export async function generateAI(request: AIRequest): Promise<AIResponse> {
  if (request.provider) {
    if (!isAIProvider(request.provider)) {
      throw new Error(`Invalid AI provider: ${request.provider}`);
    }

    // Explicit provider = no fallback. If OpenAI fails, say OpenAI failed.
    return callProvider(request.provider, request);
  }

  const order = AI_CONFIG.fallbackOrder.filter(isAIProvider);
  let lastError: unknown;

  for (const provider of order) {
    try {
      return await callProvider(provider, request);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("No configured AI provider available");
}

export async function streamAI(
  request: AIRequest,
  onToken: (token: string) => void | Promise<void>,
): Promise<AIResponse> {
  const provider = request.provider || AI_CONFIG.defaultProvider;

console.log("STREAM_AI_PROVIDER =", provider);

  if (provider !== "openai") {
    const response = await generateAI(request);

    const parts = response.content.match(/\S+\s*/g) ?? [response.content];
    for (const part of parts) {
      await onToken(part);
      await new Promise((resolve) => setTimeout(resolve, 18));
    }

    return response;
  }

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = request.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: normalizeMessages(request.messages),
    temperature: request.temperature ?? 0.7,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content ?? "";
    if (content) {
      fullResponse += content;
      await onToken(content);
    }
  }

  return {
    provider: "openai",
    model,
    content: fullResponse,
  };
}
