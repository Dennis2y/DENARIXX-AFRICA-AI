import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY must be set. Please add your OpenAI API key to Replit Secrets.",
  );
}

export const openai = new OpenAI({ apiKey });
