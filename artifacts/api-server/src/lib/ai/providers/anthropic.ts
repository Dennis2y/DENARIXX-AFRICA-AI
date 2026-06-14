import Anthropic from "@anthropic-ai/sdk";
import { AIRequest, AIResponse } from "../types";

export async function callAnthropic(
  request: AIRequest
): Promise<AIResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing");
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const model =
    request.model ||
    process.env.ANTHROPIC_MODEL ||
    "claude-sonnet-4-20250514";

  const response = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: request.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  });

  return {
    provider: "anthropic",
    model,
    content:
      response.content[0]?.type === "text"
        ? response.content[0].text
        : "",
  };
}
