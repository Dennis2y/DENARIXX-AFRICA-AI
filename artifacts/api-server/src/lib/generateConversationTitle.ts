export function generateConversationTitle(message: string): string {
  const cleaned = message
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= 50) return cleaned;

  return cleaned.slice(0, 50) + "...";
}
