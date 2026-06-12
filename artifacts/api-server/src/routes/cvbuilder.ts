import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, usersTable, userSkillsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function getOpenAI() {
  const { openai } = require("@workspace/integrations-openai-ai-server");
  return openai;
}

// POST /api/cv-builder/generate
router.post("/generate", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { name, targetRole, currentRole, experience, skills = [], education, achievements, tone = "professional" } = req.body as {
    name: string;
    targetRole: string;
    currentRole?: string;
    experience: string;
    skills?: string[];
    education?: string;
    achievements?: string;
    tone?: "professional" | "creative" | "executive";
  };

  if (!name || !targetRole || !experience) {
    res.status(400).json({ error: "name, targetRole, and experience are required" });
    return;
  }

  // Supplement with saved profile skills if none provided
  let resolvedSkills = skills;
  if (!resolvedSkills.length) {
    try {
      const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
      if (user) {
        const dbSkills = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
        resolvedSkills = dbSkills.map(s => s.skill);
      }
    } catch {}
  }

  const toneGuide = {
    professional: "Use clear, structured, corporate language. Bullet points for achievements. Formal tone.",
    creative: "Use dynamic, energetic language that shows personality while staying credible. Results-first writing.",
    executive: "Use strategic, high-level language. Focus on leadership, impact, and vision. Concise and commanding.",
  }[tone] ?? "";

  const systemPrompt = `You are an expert CV and cover letter writer specialising in African professionals seeking global and continental opportunities. ${toneGuide}

Format the resume with these exact sections, using markdown:
# [Full Name]
**[Target Role]** | [Location if known] | [LinkedIn/email placeholders]

## Professional Summary
2-3 sentences.

## Core Skills
Comma-separated key skills.

## Professional Experience
Current/most recent role first. Use bullet points for achievements with metrics where possible.

## Education
Degrees and institutions.

## Achievements & Certifications
Notable accomplishments.

---

Then after the resume, output:
---COVER LETTER---
A compelling cover letter for the target role, 3-4 paragraphs. Address it to "Hiring Manager".`;

  const userPrompt = `Generate a complete resume and cover letter for:
Name: ${name}
Target Role: ${targetRole}
${currentRole ? `Current Role: ${currentRole}` : ""}
Experience: ${experience}
${resolvedSkills.length ? `Skills: ${resolvedSkills.join(", ")}` : ""}
${education ? `Education: ${education}` : ""}
${achievements ? `Achievements: ${achievements}` : ""}
Tone: ${tone}`;

  const openai = getOpenAI();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const splitIdx = raw.indexOf("---COVER LETTER---");
    const resume = splitIdx > -1 ? raw.slice(0, splitIdx).trim() : raw.trim();
    const coverLetter = splitIdx > -1 ? raw.slice(splitIdx + "---COVER LETTER---".length).trim() : "";

    res.json({ resume, coverLetter });
  } catch (err) {
    req.log.error({ err }, "CV generation failed");
    res.status(500).json({ error: "AI is temporarily unavailable. Please try again." });
  }
});

export default router;
