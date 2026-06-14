import OpenAI from "openai";
import { AIRequest, AIResponse } from "../types";

export async function callGroq(
  request: AIRequest
): Promise<AIResponse> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY missing");
  }

  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const model =
    request.model ||
    process.env.GROQ_MODEL ||
    "llama-3.3-70b-versatile";

  const response =
    await client.chat.completions.create({
      model,
      messages: request.messages,
    });

  return {
    provider: "groq",
    model,
    content:
      response.choices[0]?.message?.content ?? "",
  };
}
