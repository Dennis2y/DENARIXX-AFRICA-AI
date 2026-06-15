import { db, usersTable, userSkillsTable, userMemories, documentUploads, resumes } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

export async function buildDenaUserContext(clerkUserId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  if (!user) {
    return {
      userId: null,
      context: "No verified user profile found. Do not invent personal details.",
    };
  }

  const [skills, memories, docs, savedResumes] = await Promise.all([
    db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, user.id)).limit(30),

    db
      .select()
      .from(userMemories)
      .where(and(eq(userMemories.userId, user.id), eq(userMemories.isActive, true)))
      .orderBy(desc(userMemories.updatedAt))
      .limit(20),

    db
      .select({
        filename: documentUploads.filename,
        summary: documentUploads.summary,
        content: documentUploads.content,
      })
      .from(documentUploads)
      .where(and(eq(documentUploads.userId, user.id), eq(documentUploads.isActive, true)))
      .orderBy(desc(documentUploads.updatedAt))
      .limit(5),

    db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, user.id))
      .orderBy(desc(resumes.updatedAt))
      .limit(3),
  ]);

  const context = `
=== VERIFIED USER CONTEXT ===

User Profile:
- Name: ${user.name || "[Not provided]"}
- Email: ${user.email || "[Not provided]"}
- Location: ${(user as any).location || "[Not provided]"}
- User type: ${(user as any).userType || "[Not provided]"}

User Skills:
${skills.length ? skills.map((s: any) => `- ${s.name || s.skill || JSON.stringify(s)}`).join("\n") : "- [No skills provided]"}

User Memories:
${memories.length ? memories.map((m: any) => `- ${m.content}`).join("\n") : "- [No memories provided]"}

Saved Resumes:
${savedResumes.length ? savedResumes.map((r: any) => `- ${r.title || "Resume"}\n${String(r.content || r.summary || "").slice(0, 2500)}`).join("\n\n") : "- [No saved resumes provided]"}

Uploaded Documents:
${docs.length ? docs.map((d) => `Document: ${d.filename}\n${String(d.summary || d.content || "").slice(0, 3000)}`).join("\n\n---\n\n") : "- [No uploaded documents provided]"}

=== STRICT GROUNDING RULES ===
You are generating content for a real user on a public platform.

NON-NEGOTIABLE:
- Use ONLY the verified context above and the user's latest instruction.
- Never invent degrees, universities, employers, job dates, years of experience, certifications, addresses, phone numbers, meetings, salaries, achievements, or personal claims.
- Never invent enthusiasm such as "I am a fan of BMW" unless the user clearly said it.
- Never change the user's gender.
- If a detail is missing, write [Add accurate detail].
- If experience level is not proven, do not say "experienced", "senior", or "5+ years".
- Keep the output in ONE language only.
- Use the same language as the user's instruction unless the user explicitly asks for another language.
- Do not mix German and English.
- For cover letters and CVs, be realistic, truthful, ATS-friendly, and conservative.
- For business plans, do not invent financial numbers unless the user asks for assumptions; label assumptions clearly.
`;

  return {
    userId: user.id,
    context,
  };
}
