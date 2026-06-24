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
      : interviewType === "live-coding" ? "live coding interview. Include practical coding tasks. Ask the candidate to explain approach, write code, discuss edge cases, and analyze time complexity"
      : interviewType === "live-debugging" ? "live debugging interview. Include broken code snippets or bug scenarios. Ask the candidate to identify the bug, explain the cause, and propose a fix"
      : "mixed (behavioral + technical + coding + debugging)";

    const prompt = `Generate exactly 5 ${typeDescription} interview questions for a candidate applying for: ${role}.
${skillList ? `The candidate has skills in: ${skillList}.` : ""}

Return the questions in English.
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

// POST /api/interview-coach/live-reply — real interviewer style response
router.post("/live-reply", requireAuth, async (req, res) => {
  const { role, question, answer, interviewType = "mixed" } = req.body as {
    role?: string;
    question?: string;
    answer?: string;
    interviewType?: string;
  };

  if (!role?.trim() || !question?.trim() || !answer?.trim()) {
    res.status(400).json({ error: "role, question and answer are required" });
    return;
  }

  try {
    const prompt = `
You are a real human-style AI interviewer.

Role being interviewed for: ${role}
Interview type: ${interviewType}

Question asked:
${question}

Candidate answer:
${answer}

Respond like a real interviewer:
1. Give short natural feedback.
2. Mention one specific strength.
3. Mention one weakness.
4. Ask one follow-up question.
5. Keep it conversational, not robotic.
6. Return ONLY valid JSON:

{
  "spokenReply": "...",
  "strength": "...",
  "weakness": "...",
  "followUpQuestion": "...",
  "score": 1
}
`;

    const raw = await callAI([
      { role: "system", content: INTERVIEW_SYSTEM },
      { role: "user", content: prompt },
    ]);

    let parsed: any = null;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : JSON.parse(raw);
    } catch {
      parsed = {
        spokenReply: raw,
        strength: "",
        weakness: "",
        followUpQuestion: "",
        score: 5,
      };
    }

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed to generate live interview reply");
    res.status(500).json({ error: "Failed to generate live reply" });
  }
});

// POST /api/interview-coach/review-code — live coding/debugging review
router.post("/review-code", requireAuth, async (req, res) => {
  const { role, question, approach, code, language = "python", difficulty = "medium" } = req.body as {
    role?: string;
    question?: string;
    approach?: string;
    code?: string;
    language?: string;
    difficulty?: string;
  };

  if (!role?.trim() || !question?.trim() || !code?.trim()) {
    res.status(400).json({ error: "role, question and code are required" });
    return;
  }

  try {
    const prompt = `
You are a senior live coding interviewer.

Role: ${role}
Difficulty: ${difficulty}
Language: ${language}

Interview question:
${question}

Candidate spoken/thinking approach:
${approach || "No spoken approach provided."}

Candidate code:
\`\`\`${language}
${code}
\`\`\`

Review like a real coding interview. Be direct but helpful.
Return ONLY JSON:
{
  "score": 1-10,
  "correctness": "short assessment",
  "complexity": "time and space complexity",
  "bugs": ["bug or risk 1", "bug or risk 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "interviewerReply": "natural spoken interviewer response",
  "followUpQuestion": "one next live coding follow-up question"
}
`;

    const raw = await callAI([
      { role: "system", content: "You are a strict but fair senior software engineering interviewer." },
      { role: "user", content: prompt },
    ]);

    const match = raw.match(/\{[\s\S]*\}/);
    const review = match ? JSON.parse(match[0]) : { interviewerReply: raw, score: 5 };

    res.json({ review });
  } catch (err) {
    req.log.error({ err }, "Failed to review code");
    res.status(500).json({ error: "Failed to review code" });
  }
});

// POST /api/interview-coach/test-cases — generate live coding test cases
router.post("/test-cases", requireAuth, async (req, res) => {
  const { question, code, language = "python", difficulty = "medium" } = req.body as {
    question?: string;
    code?: string;
    language?: string;
    difficulty?: string;
  };

  if (!question?.trim()) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  try {
    const prompt = `
Generate practical interview test cases for this coding/debugging question.

Difficulty: ${difficulty}
Language: ${language}

Question:
${question}

Candidate code:
\`\`\`${language}
${code || "No code yet"}
\`\`\`

Return ONLY JSON:
{
  "testCases": [
    {
      "name": "short test name",
      "input": "example input",
      "expected": "expected output",
      "reason": "why this test matters"
    }
  ]
}

Include normal cases, edge cases, empty input, invalid/unusual input, and performance-related cases where relevant.
`;

    const raw = await callAI([
      { role: "system", content: "You generate precise software engineering interview test cases." },
      { role: "user", content: prompt },
    ]);

    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { testCases: [] };

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed to generate test cases");
    res.status(500).json({ error: "Failed to generate test cases" });
  }
});

// POST /api/interview-coach/run-code — simulated safe code execution review
router.post("/run-code", requireAuth, async (req, res) => {
  const { question, code, language = "python", testCases = [] } = req.body as {
    question?: string;
    code?: string;
    language?: string;
    testCases?: any[];
  };

  if (!question?.trim() || !code?.trim()) {
    res.status(400).json({ error: "question and code are required" });
    return;
  }

  try {
    const prompt = `
You are a live coding judge. Do NOT actually execute code. Analyze the code against the test cases.

Language: ${language}

Question:
${question}

Candidate code:
\`\`\`${language}
${code}
\`\`\`

Test cases:
${JSON.stringify(testCases, null, 2)}

Return ONLY JSON:
{
  "passed": number,
  "failed": number,
  "results": [
    {
      "name": "test name",
      "status": "pass" or "fail",
      "reason": "short reason"
    }
  ],
  "runtimeAnalysis": "time/space complexity",
  "interviewerComment": "natural interviewer response"
}
`;

    const raw = await callAI([
      { role: "system", content: "You are a strict senior coding interview judge." },
      { role: "user", content: prompt },
    ]);

    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { passed: 0, failed: 0, results: [], interviewerComment: raw };

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed to run code review");
    res.status(500).json({ error: "Failed to run code review" });
  }
});

// POST /api/interview-coach/system-design-review
router.post("/system-design-review", requireAuth, async (req, res) => {
  const { role, prompt: designPrompt, answer, difficulty = "senior" } = req.body as {
    role?: string;
    prompt?: string;
    answer?: string;
    difficulty?: string;
  };

  if (!designPrompt?.trim() || !answer?.trim()) {
    res.status(400).json({ error: "prompt and answer are required" });
    return;
  }

  try {
    const raw = await callAI([
      { role: "system", content: "You are a FAANG-style system design interviewer." },
      { role: "user", content: `
Role: ${role || "Software Engineer"}
Difficulty: ${difficulty}

System design prompt:
${designPrompt}

Candidate answer:
${answer}

Return ONLY JSON:
{
  "score": 1-10,
  "architecture": "assessment",
  "scalability": "assessment",
  "dataModel": "assessment",
  "apiDesign": "assessment",
  "tradeoffs": "assessment",
  "missingPieces": ["item 1", "item 2"],
  "interviewerReply": "natural spoken response",
  "followUpQuestion": "next system design follow-up"
}
` },
    ]);

    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { score: 5, interviewerReply: raw };

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed system design review");
    res.status(500).json({ error: "Failed system design review" });
  }
});

// POST /api/interview-coach/faang-rounds
router.post("/faang-rounds", requireAuth, async (req, res) => {
  const { role = "Software Engineer", level = "junior" } = req.body as { role?: string; level?: string };

  try {
    const raw = await callAI([
      { role: "system", content: "You generate FAANG-style interview loops." },
      { role: "user", content: `
Create a FAANG-style multi-round interview plan.

Role: ${role}
Level: ${level}

Return ONLY JSON:
{
  "rounds": [
    {
      "round": 1,
      "title": "Round title",
      "type": "behavioral | live-coding | live-debugging | system-design",
      "focus": "what this round tests",
      "samplePrompt": "one realistic interview prompt"
    }
  ]
}

Include 5 rounds.
` },
    ]);

    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { rounds: [] };

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Failed to generate FAANG rounds");
    res.status(500).json({ error: "Failed to generate FAANG rounds" });
  }
});


// POST /api/interview-coach/debug-code — AI live debugging analysis
router.post("/debug-code", requireAuth, async (req, res) => {
  const { question, code, language = "python" } = req.body as {
    question?: string;
    code?: string;
    language?: string;
  };

  if (!question?.trim() || !code?.trim()) {
    res.status(400).json({ error: "question and code are required" });
    return;
  }

  try {
    const prompt = `
You are a senior software engineer debugging code in a live technical interview.

Question:
${question}

Language:
${language}

Candidate code:
\`\`\`${language}
${code}
\`\`\`

Find real bugs, edge cases, missing handling, runtime risks, and interview-level improvements.

Return ONLY JSON:
{
  "errorType": "short bug category",
  "severity": "low | medium | high",
  "line": "line number or approximate location",
  "explanation": "clear explanation of the issue",
  "fix": "short corrected code or fix strategy",
  "improvements": ["improvement 1", "improvement 2"],
  "interviewerComment": "natural spoken interviewer feedback"
}
`;

    const raw = await callAI([
      { role: "system", content: "You are a strict senior debugging interviewer. Return valid JSON only." },
      { role: "user", content: prompt },
    ]);

    const match = raw.match(/\{[\s\S]*\}/);
    const debug = match ? JSON.parse(match[0]) : {
      errorType: "Analysis",
      severity: "medium",
      line: "unknown",
      explanation: raw,
      fix: "",
      improvements: [],
      interviewerComment: raw,
    };

    res.json({ debug });
  } catch (err) {
    req.log.error({ err }, "Failed to debug code");
    res.status(500).json({ error: "Failed to debug code" });
  }
});


export default router;
