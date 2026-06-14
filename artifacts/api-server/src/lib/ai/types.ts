export type AIProvider =
  | "openai"
  | "gemini"
  | "anthropic"
  | "groq"
  | "mistral";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  provider?: AIProvider;
  model?: string;
  messages: AIMessage[];
  temperature?: number;
}

export interface AIResponse {
  provider: AIProvider;
  model: string;
  content: string;
}
