export function extractCandidateMemories(message: string): string[] {
  const memories: string[] = [];

  const patterns = [
    /I am (.+)/i,
    /My name is (.+)/i,
    /I work as (.+)/i,
    /I work at (.+)/i,
    /I live in (.+)/i,
    /I studied (.+)/i,
    /I graduated from (.+)/i,
    /My skills include (.+)/i,
    /I use (.+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      memories.push(match[0].trim());
    }
  }

  return memories.slice(0, 10);
}
