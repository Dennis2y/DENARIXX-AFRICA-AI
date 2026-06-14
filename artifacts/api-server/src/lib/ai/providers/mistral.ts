import { Mistral } from "@mistralai/mistralai";
import { AIRequest, AIResponse } from "../types";

export async function callMistral(
  request: AIRequest
): Promise<AIResponse> {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY missing");
  }

  const client = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  const model =
    request.model ||
    process.env.MISTRAL_MODEL ||
    "mistral-large-latest";

  const response = await client.chat.complete({
    model,
    messages: request.messages,
  });

  return {
    provider: "mistral",
    model,
    content:
      response.choices?.[0]?.message?.content?.toString() ?? "",
  };
}
