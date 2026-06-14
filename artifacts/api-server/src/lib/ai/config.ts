export const AI_CONFIG = {
  defaultProvider:
    (process.env.DEFAULT_AI_PROVIDER as any) || "openai",

  fallbackOrder: (
    process.env.AI_FALLBACK_ORDER ||
    "openai,gemini,groq,anthropic,mistral"
  ).split(","),

  providers: {
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    mistral: !!process.env.MISTRAL_API_KEY,
  },
};
