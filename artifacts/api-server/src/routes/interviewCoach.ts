import { Router, type IRouter } from "express";
import { db, interviewSessions, usersTable, userSkillsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { generateAI } from "../lib/ai/aiRouter";

const router: IRouter = Router();

const INTERVIEW_SYSTEM = `You are an expert interview coach specialising in African tech and professional talent.
You give honest, direct, constructive feedback. Be specific — reference what was said, what was missing, and how to improve.
Always be encouraging but never vague. Score answers 1–10.`;

async function callAI(messages: { role: "system" | "user" | "assistant"; content: string }[]): Promise<string> {
  const completion = await generateAI({
    messages,
    temperature: 0.7,
  });

  return completion.content ?? "";
}

// POST /api/interview-coach/sessions — start a new session (generate questions)
router.post("/sessions", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { role, interviewType = "mixed" } = req.body as { role: string; interviewType?: string };

  if (!role?.trim()) {
    res.status(400).json({ error: "Role is required" });
    return;
  }

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get user skills for context
    const skills = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
    const skillList = skills.map(s => s.skill).join(", ");

    const typeDescription =
      interviewType === "behavioral" ? "behavioral (STAR-method)"
      : interviewType === "technical" ? "technical / skills-based"
      : "mixed (behavioral + technical)";

    const prompt = `Generate exactly 5 ${typeDescription} interview questions for a candidate applying for: ${role}.
${skillList ? `The candidate has skills in: ${skillList}.` : ""}

Return ONLY a JSON array of 5 question strings, no other text. Example:
["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]`;

    const raw = await callAI([
      { role: "system", content: INTERVIEW_SYSTEM },
      { role: "user", content: prompt },
    ]);

    let questions: string[] = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      questions = match ? JSON.parse(match[0]) : [];
    } catch {
      questions = raw.split("\n").filter(l => l.trim().match(/^[\d"]/)).map(l => l.replace(/^\d+\.\s*"?|"?,?\s*$/g, "")).filter(Boolean).slice(0, 5);
    }

    if (questions.length === 0) {
      res.status(500).json({ error: "Failed to generate questions" });
      return;
    }

    const [session] = await db.insert(interviewSessions).values({
      userId: user.id,
      role: role.trim(),
      interviewType,
      questions,
      answers: [],
    }).returning();

    res.status(201).json({ session: { ...session, questions, answers: [] } });
  } catch (err) {
    req.log.error({ err }, "Failed to start interview session");
    res.status(500).json({ error: "Failed to start session" });
  }
});

// POST /api/interview-coach/sessions/:id/answer — submit an answer, get feedback
router.post("/sessions/:id/answer", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const sessionId = Number(req.params.id);
  const { questionIndex, answer } = req.body as { questionIndex: number; answer: string };

  if (!answer?.trim()) {
    res.status(400).json({ error: "Answer is required" });
    return;
  }

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [session] = await db.select().from(interviewSessions)
      .where(eq(interviewSessions.id, sessionId))
      .limit(1);

    if (!session || session.userId !== user.id) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const questions = session.questions as string[];
    const question = questions[questionIndex];
    if (!question) {
      res.status(400).json({ error: "Invalid question index" });
      return;
    }

    const feedbackPrompt = `Role: ${session.role}
Interview type: ${session.interviewType}

Question: "${question}"

Candidate's answer: "${answer}"

Evaluate this answer. Return a JSON object with exactly these fields:
{
  "score": <number 1-10>,
  "strengths": "<1-2 specific strengths in this answer>",
  "improvements": "<1-2 specific things to improve>",
  "betterAnswer": "<a short example of a stronger answer or key points to include>"
}
Return ONLY the JSON, no other text.`;

    const raw = await callAI([
      { role: "system", content: INTERVIEW_SYSTEM },
      { role: "user", content: feedbackPrompt },
    ]);

    let feedback: { score: number; strengths: string; improvements: string; betterAnswer: string };
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      feedback = match ? JSON.parse(match[0]) : { score: 5, strengths: "Answer provided.", improvements: "Add more specifics.", betterAnswer: "" };
    } catch {
      feedback = { score: 5, strengths: "Answer provided.", improvements: "Add more specifics.", betterAnswer: "" };
    }

    const existingAnswers = (session.answers as any[]) ?? [];
    const newAnswer = { question, answer, feedback, questionIndex };
    const updatedAnswers = [...existingAnswers.filter((a: any) => a.questionIndex !== questionIndex), newAnswer];

    await db.update(interviewSessions)
      .set({ answers: updatedAnswers })
      .where(eq(interviewSessions.id, sessionId));

    res.json({ feedback, answer: newAnswer });
  } catch (err) {
    req.log.error({ err }, "Failed to evaluate answer");
    res.status(500).json({ error: "Failed to evaluate answer" });
  }
});

// POST /api/interview-coach/sessions/:id/complete — finish session, get overall feedback
router.post("/sessions/:id/complete", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const sessionId = Number(req.params.id);

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [session] = await db.select().from(interviewSessions).where(eq(interviewSessions.id, sessionId)).limit(1);
    if (!session || session.userId !== user.id) { res.status(404).json({ error: "Session not found" }); return; }

    const answers = (session.answers as any[]) ?? [];
    const scores = answers.map((a: any) => a.feedback?.score ?? 5);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 5;

    const summaryPrompt = `The candidate just completed a ${session.interviewType} interview for ${session.role}.
Their answers and scores: ${answers.map((a: any) => `Q: "${a.question}" — Score: ${a.feedback?.score}/10`).join("\n")}
Average score: ${avgScore}/10.

Write a concise 2-3 sentence overall performance summary. Be direct, motivating, and actionable. Focus on their biggest strength and one clear area to improve.`;

    const overallFeedback = await callAI([
      { role: "system", content: INTERVIEW_SYSTEM },
      { role: "user", content: summaryPrompt },
    ]);

    const [updated] = await db.update(interviewSessions)
      .set({ overallFeedback, score: avgScore, completedAt: new Date() })
      .where(eq(interviewSessions.id, sessionId))
      .returning();

    res.json({ session: updated, overallFeedback, score: avgScore });
  } catch (err) {
    req.log.error({ err }, "Failed to complete session");
    res.status(500).json({ error: "Failed to complete session" });
  }
});

// GET /api/interview-coach/sessions — list past sessions
router.get("/sessions", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.json({ sessions: [] }); return; }

    const sessions = await db.select({
      id: interviewSessions.id,
      role: interviewSessions.role,
      interviewType: interviewSessions.interviewType,
      score: interviewSessions.score,
      overallFeedback: interviewSessions.overallFeedback,
      completedAt: interviewSessions.completedAt,
      createdAt: interviewSessions.createdAt,
      questionCount: interviewSessions.questions,
      answerCount: interviewSessions.answers,
    }).from(interviewSessions)
      .where(eq(interviewSessions.userId, user.id))
      .orderBy(desc(interviewSessions.createdAt))
      .limit(20);

    const result = sessions.map(s => ({
      ...s,
      questionCount: Array.isArray(s.questionCount) ? (s.questionCount as any[]).length : 0,
      answerCount: Array.isArray(s.answerCount) ? (s.answerCount as any[]).length : 0,
    }));

    res.json({ sessions: result });
  } catch (err) {
    req.log.error({ err }, "Failed to list sessions");
    res.status(500).json({ error: "Failed to load sessions" });
  }
});

export default router;
