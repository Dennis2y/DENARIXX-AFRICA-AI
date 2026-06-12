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
  const {
    name, targetRole, currentRole, experience, skills = [], education,
    achievements, tone = "professional", summary, email, phone, location,
    linkedin, targetCompany,
  } = req.body as {
    name: string; targetRole: string; currentRole?: string; experience: string;
    skills?: string[]; education?: string; achievements?: string;
    tone?: "professional" | "creative" | "executive"; summary?: string;
    email?: string; phone?: string; location?: string; linkedin?: string;
    targetCompany?: string;
  };

  if (!name || !targetRole || !experience) {
    res.status(400).json({ error: "name, targetRole, and experience are required" });
    return;
  }

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

  const contactParts = [email, phone, location, linkedin].filter(Boolean);
  const contactLine = contactParts.length ? ` | ${contactParts.join(" | ")}` : "";

  const systemPrompt = `You are an expert CV writer specialising in African professionals seeking global and continental opportunities. ${toneGuide}

Format the resume in markdown with exactly these sections:
# [Full Name]
**[Target Role]**${contactLine}

## Professional Summary
2-3 impactful sentences tailored to the target role.

## Core Skills
Comma-separated key skills.

## Professional Experience
Most recent first. Bold company name and role. Use bullet points with quantified metrics.

## Education
Degrees, institutions, and years.

## Achievements & Certifications
Notable accomplishments with impact.

---

Then immediately output:
---COVER LETTER---
A compelling 3-4 paragraph cover letter addressed to "${targetCompany ? `Hiring Manager at ${targetCompany}` : "Hiring Manager"}". Reference the company if provided.`;

  const userPrompt = `Generate a complete resume and cover letter for:
Name: ${name}
Target Role: ${targetRole}
${currentRole ? `Current Role: ${currentRole}` : ""}
${summary ? `Summary hint: ${summary}` : ""}
Experience: ${experience}
${resolvedSkills.length ? `Skills: ${resolvedSkills.join(", ")}` : ""}
${education ? `Education: ${education}` : ""}
${achievements ? `Achievements: ${achievements}` : ""}
Tone: ${tone}`;

  const openai = getOpenAI();
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
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

// POST /api/cv-builder/assist
router.post("/assist", requireAuth, async (req, res) => {
  const { action, content, targetRole, skills, experience } = req.body as {
    action: "experienceSummary" | "improveAchievements" | "suggestSkills" | "atsOptimize" | "rewriteProfessionally";
    content?: string; targetRole?: string; skills?: string[]; experience?: string;
  };

  if (!action) { res.status(400).json({ error: "action is required" }); return; }

  const openai = getOpenAI();

  const prompts: Record<string, { system: string; user: string }> = {
    experienceSummary: {
      system: "You are an expert CV writer for African professionals. Write a compelling 2-3 sentence professional summary. Be specific and impactful. Return ONLY the summary text, no labels or headers.",
      user: `Target Role: ${targetRole ?? "Professional"}\nExperience Background: ${experience ?? content ?? ""}`,
    },
    improveAchievements: {
      system: "You are an expert CV writer. Rewrite these achievements to be more impactful, quantified, and action-oriented. Use strong verbs (Led, Drove, Built, Achieved). Return bullet points, one per line starting with -.",
      user: content ?? "",
    },
    suggestSkills: {
      system: "You are a talent expert. Suggest 8-12 highly relevant, ATS-friendly skills for this professional. Return ONLY a JSON array of strings like [\"Skill1\",\"Skill2\"]. No other text.",
      user: `Target Role: ${targetRole ?? "Professional"}\nCurrent Skills: ${(skills ?? []).join(", ")}\nExperience: ${experience ?? ""}`,
    },
    atsOptimize: {
      system: "You are an ATS optimization expert. Rewrite the following text to be more ATS-friendly: incorporate industry keywords, strong action verbs, and quantified results. Return only the rewritten text.",
      user: content ?? "",
    },
    rewriteProfessionally: {
      system: "You are a senior professional CV writer. Rewrite the following text to sound more professional, confident, and impactful. Preserve all factual content but elevate the language. Return only the rewritten text.",
      user: content ?? "",
    },
  };

  const prompt = prompts[action];
  if (!prompt) { res.status(400).json({ error: "Invalid action" }); return; }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const result = completion.choices[0]?.message?.content?.trim() ?? "";

    if (action === "suggestSkills") {
      try {
        const parsed = JSON.parse(result);
        res.json({ skills: Array.isArray(parsed) ? parsed : [] });
      } catch {
        const extracted = result.match(/"([^"]+)"/g)?.map((s: string) => s.replace(/"/g, "")) ?? result.split(",").map((s: string) => s.trim()).filter(Boolean);
        res.json({ skills: extracted });
      }
    } else {
      res.json({ result });
    }
  } catch (err) {
    req.log.error({ err }, "CV assist failed");
    res.status(500).json({ error: "AI assist is temporarily unavailable." });
  }
});

// POST /api/cv-builder/tailor
router.post("/tailor", requireAuth, async (req, res) => {
  const { cvContent, jobDescription, targetRole } = req.body as {
    cvContent: string; jobDescription: string; targetRole?: string;
  };

  if (!cvContent || !jobDescription) {
    res.status(400).json({ error: "cvContent and jobDescription are required" });
    return;
  }

  const openai = getOpenAI();

  const systemPrompt = `You are an expert ATS and recruitment consultant. Analyze this CV against the job description.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "atsScore": <integer 0-100>,
  "missingKeywords": [<up to 10 important JD keywords missing from CV>],
  "presentKeywords": [<up to 10 strong matching keywords>],
  "suggestions": [<3-5 specific, actionable improvement suggestions as strings>],
  "tailoredSummary": "<2-3 sentence professional summary tailored specifically to this JD>"
}`;

  const userPrompt = `CV:\n${cvContent.slice(0, 2500)}\n\n---\n\nJob Description:\n${jobDescription.slice(0, 1500)}${targetRole ? `\n\nTarget Role: ${targetRole}` : ""}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.3,
      max_tokens: 900,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    try {
      res.json(JSON.parse(raw));
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) res.json(JSON.parse(match[0]));
      else res.status(500).json({ error: "Failed to parse ATS analysis. Please try again." });
    }
  } catch (err) {
    req.log.error({ err }, "CV tailor failed");
    res.status(500).json({ error: "AI is temporarily unavailable." });
  }
});

// POST /api/cv-builder/parse
router.post("/parse", requireAuth, async (req, res) => {
  const { cvText } = req.body as { cvText: string };

  if (!cvText || cvText.trim().length < 50) {
    res.status(400).json({ error: "Please provide at least 50 characters of CV text" });
    return;
  }

  const openai = getOpenAI();

  const systemPrompt = `You are an expert CV parser. Extract structured information from the provided CV text.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "name": "<full name or empty string>",
  "email": "<email or empty string>",
  "phone": "<phone or empty string>",
  "location": "<city, country or empty string>",
  "linkedin": "<linkedin URL or empty string>",
  "currentRole": "<current/most recent job title or empty string>",
  "targetRole": "<inferred best-fit target role or empty string>",
  "summary": "<professional summary if present or empty string>",
  "experience": "<work experience as plain text summary or empty string>",
  "education": "<education details or empty string>",
  "achievements": "<key achievements and certifications or empty string>",
  "skills": [<array of skill strings>]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: cvText.slice(0, 3500) }],
      temperature: 0.1,
      max_tokens: 900,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    try {
      res.json(JSON.parse(raw));
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) res.json(JSON.parse(match[0]));
      else res.status(500).json({ error: "Failed to parse CV. Please try again." });
    }
  } catch (err) {
    req.log.error({ err }, "CV parse failed");
    res.status(500).json({ error: "AI is temporarily unavailable." });
  }
});

export default router;
