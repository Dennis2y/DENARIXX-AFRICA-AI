import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, usersTable, userSkillsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function getOpenAI() {
  const { openai } = require("@workspace/integrations-openai-ai-server");
  return openai;
}

type OpenAIClient = ReturnType<typeof getOpenAI>;

function getOpenAISafe(res: { status: (c: number) => { json: (b: unknown) => void } }): OpenAIClient | null {
  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: "AI service is not configured. Please add your OPENAI_API_KEY in environment settings." });
    return null;
  }
  try {
    return getOpenAI();
  } catch {
    res.status(503).json({ error: "AI service failed to initialize. Please verify your OPENAI_API_KEY is valid." });
    return null;
  }
}

// POST /api/cv-builder/generate
router.post("/generate", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const {
    name, targetRole, currentRole, experience, skills = [], education,
    achievements, tone = "professional", summary, email, phone, location,
    linkedin, targetCompany, language = "English", spokenLanguages,
  } = req.body as {
    name: string; targetRole: string; currentRole?: string; experience: string;
    skills?: string[]; education?: string; achievements?: string;
    tone?: "professional" | "creative" | "executive"; summary?: string;
    email?: string; phone?: string; location?: string; linkedin?: string;
    targetCompany?: string; language?: string; spokenLanguages?: string;
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

  const langInstruction = language && language !== "English"
    ? `\n\nCRITICAL LANGUAGE REQUIREMENT: Write the ENTIRE resume and cover letter in ${language}. Every word — section headings, bullet points, summary, cover letter body — must be in ${language}. Do not mix languages.`
    : "";

  const systemPrompt = `You are an expert CV writer specialising in professionals seeking global opportunities. ${toneGuide}${langInstruction}

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

## Languages
List every spoken/written language with proficiency level (e.g. Native, Fluent, B1, Intermediate).

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
${spokenLanguages ? `Languages (spoken/written): ${spokenLanguages}` : ""}
Tone: ${tone}`;

  const openai = getOpenAISafe(res);
  if (!openai) return;

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
  } catch (err: any) {
    req.log.error({ err }, "CV generation failed");
    const msg = err?.status === 401 ? "Invalid OpenAI API key." : err?.status === 429 ? "OpenAI rate limit reached. Please wait and try again." : "AI is temporarily unavailable. Please try again.";
    res.status(500).json({ error: msg });
  }
});

// POST /api/cv-builder/assist
router.post("/assist", requireAuth, async (req, res) => {
  const { action, content, targetRole, skills, experience, language = "English" } = req.body as {
    action: "experienceSummary" | "improveAchievements" | "suggestSkills" | "atsOptimize" | "rewriteProfessionally";
    content?: string; targetRole?: string; skills?: string[]; experience?: string; language?: string;
  };

  if (!action) { res.status(400).json({ error: "action is required" }); return; }

  const openai = getOpenAISafe(res);
  if (!openai) return;

  const langSuffix = language && language !== "English" ? ` Respond entirely in ${language}.` : "";

  const prompts: Record<string, { system: string; user: string }> = {
    experienceSummary: {
      system: `You are an expert CV writer. Write a compelling 2-3 sentence professional summary. Be specific and impactful. Return ONLY the summary text, no labels or headers.${langSuffix}`,
      user: `Target Role: ${targetRole ?? "Professional"}\nExperience Background: ${experience ?? content ?? ""}`,
    },
    improveAchievements: {
      system: `You are an expert CV writer. Rewrite these achievements to be more impactful, quantified, and action-oriented. Use strong verbs (Led, Drove, Built, Achieved). Return bullet points, one per line starting with -.${langSuffix}`,
      user: content ?? "",
    },
    suggestSkills: {
      system: "You are a talent expert. Suggest 8-12 highly relevant, ATS-friendly skills for this professional. Return ONLY a JSON array of strings like [\"Skill1\",\"Skill2\"]. No other text.",
      user: `Target Role: ${targetRole ?? "Professional"}\nCurrent Skills: ${(skills ?? []).join(", ")}\nExperience: ${experience ?? ""}`,
    },
    atsOptimize: {
      system: `You are an ATS optimization expert. Rewrite the following text to be more ATS-friendly: incorporate industry keywords, strong action verbs, and quantified results. Return only the rewritten text.${langSuffix}`,
      user: content ?? "",
    },
    rewriteProfessionally: {
      system: `You are a senior professional CV writer. Rewrite the following text to sound more professional, confident, and impactful. Preserve all factual content but elevate the language. Return only the rewritten text.${langSuffix}`,
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
  } catch (err: any) {
    req.log.error({ err }, "CV assist failed");
    const msg = err?.status === 401 ? "Invalid OpenAI API key." : err?.status === 429 ? "Rate limit reached. Please try again shortly." : "AI assist is temporarily unavailable.";
    res.status(500).json({ error: msg });
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

  const openai = getOpenAISafe(res);
  if (!openai) return;

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
  } catch (err: any) {
    req.log.error({ err }, "CV tailor failed");
    const msg = err?.status === 401 ? "Invalid OpenAI API key." : err?.status === 429 ? "Rate limit reached. Please try again shortly." : "AI analysis is temporarily unavailable.";
    res.status(500).json({ error: msg });
  }
});

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extract raw JPEG images embedded in a PDF binary (covers most scanner-generated PDFs). */
function extractJpegsFromBuffer(buf: Buffer): Buffer[] {
  const result: Buffer[] = [];
  let i = 0;
  while (i < buf.length - 1) {
    if (buf[i] === 0xFF && buf[i + 1] === 0xD8) {
      let j = i + 2;
      while (j < buf.length - 1) {
        if (buf[j] === 0xFF && buf[j + 1] === 0xD9) {
          const jpeg = buf.subarray(i, j + 2);
          if (jpeg.length > 5000) result.push(jpeg); // skip tiny artifacts
          i = j + 2;
          break;
        }
        j++;
      }
      if (j >= buf.length - 1) break;
    } else {
      i++;
    }
  }
  return result;
}

interface PdfExtractResult {
  text: string;
  pageCount: number;
  ocrUsed: boolean;
  method: "pdf-parse" | "pdfjs-text" | "ocr-jpeg" | "ocr-failed" | "plain";
}

async function extractTextFromPdf(
  buffer: Buffer,
  log: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void },
): Promise<PdfExtractResult> {
  let pageCount = 0;

  // ── Tier 1: pdf-parse v2 (class-based API) ──────────────────────────────
  try {
    const { PDFParse } = require("pdf-parse") as { PDFParse: new (opts: Record<string, unknown>) => { getText: () => Promise<{ text: string; pages: number }> } };
    const parser = new PDFParse({ data: buffer, verbosity: 0 });
    const data = await parser.getText();
    pageCount = data.pages ?? 0;
    const text = (data.text ?? "").trim();
    if (text.length >= 80) {
      log.info({ textLen: text.length, pages: pageCount }, "pdf-parse: text extracted OK");
      return { text, pageCount, ocrUsed: false, method: "pdf-parse" };
    }
    log.info({ textLen: text.length, pages: pageCount }, "pdf-parse: minimal text — trying pdfjs");
  } catch (e) {
    log.warn({ err: e }, "pdf-parse failed");
  }

  // ── Tier 2: pdfjs-dist text extraction (handles more PDF encodings) ─────
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
    const resolvedWorker = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (pdfjs as any).GlobalWorkerOptions.workerSrc = `file://${resolvedWorker}`;

    const doc = await (pdfjs as any).getDocument({ data: new Uint8Array(buffer) }).promise;
    pageCount = doc.numPages ?? pageCount;
    let text = "";
    for (let p = 1; p <= Math.min(doc.numPages, 15); p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      text += (tc.items as { str: string }[]).map(it => it.str).join(" ") + "\n";
    }
    text = text.trim();
    if (text.length >= 80) {
      log.info({ textLen: text.length, pages: pageCount }, "pdfjs: text extracted OK");
      return { text, pageCount, ocrUsed: false, method: "pdfjs-text" };
    }
    log.info({ textLen: text.length, pages: pageCount }, "pdfjs: minimal text — attempting OCR");
  } catch (e) {
    log.warn({ err: e }, "pdfjs text extraction failed");
  }

  // ── Tier 3: OCR — extract embedded JPEGs + tesseract.js ─────────────────
  try {
    const jpegs = extractJpegsFromBuffer(buffer);
    log.info({ jpegCount: jpegs.length }, "JPEG images extracted from PDF for OCR");
    if (jpegs.length === 0) throw new Error("no embedded JPEG images found");

    const { createWorker } = require("tesseract.js") as typeof import("tesseract.js");
    const worker = await createWorker("eng", 1, {
      cachePath: "/tmp/tesseract-cache",
      logger: () => undefined,
    } as Parameters<typeof createWorker>[2]);

    let ocrText = "";
    for (const jpeg of jpegs.slice(0, Math.max(pageCount, 5))) {
      const { data } = await worker.recognize(jpeg);
      ocrText += data.text + "\n";
    }
    await worker.terminate();

    const text = ocrText.trim();
    log.info({ ocrLen: text.length }, "OCR complete");
    return { text, pageCount, ocrUsed: true, method: "ocr-jpeg" };
  } catch (e) {
    log.warn({ err: e }, "OCR failed");
  }

  return {
    text: "",
    pageCount,
    ocrUsed: true,
    method: "ocr-failed",
  };
}

// ── route ─────────────────────────────────────────────────────────────────────

// POST /api/cv-builder/parse  — accepts base64-encoded file OR raw cvText
router.post("/parse", requireAuth, async (req, res) => {
  const { fileBase64, filename, cvText: cvTextBody } = req.body as {
    fileBase64?: string; filename?: string; cvText?: string;
  };

  let cvText = cvTextBody ?? "";
  const diagnostics: {
    fileType: string; pageCount: number; textExtracted: number; ocrUsed: boolean; method: string;
  } = { fileType: "text", pageCount: 0, textExtracted: 0, ocrUsed: false, method: "plain" };

  if (fileBase64 && filename) {
    const buffer = Buffer.from(fileBase64, "base64");
    const ext = (filename as string).split(".").pop()?.toLowerCase() ?? "";
    diagnostics.fileType = ext;

    if (ext === "pdf") {
      let result: PdfExtractResult;
      try {
        result = await extractTextFromPdf(buffer, req.log);
      } catch {
        result = { text: "", pageCount: 0, ocrUsed: false, method: "ocr-failed" };
      }

      diagnostics.pageCount = result.pageCount;
      diagnostics.ocrUsed = result.ocrUsed;
      diagnostics.method = result.method;

      if (result.method === "ocr-failed" || result.text.length < 50) {
        const msg = result.ocrUsed
          ? "This appears to be a scanned document. OCR processing was attempted but no readable text was found. Try a text-based PDF or paste your CV text directly."
          : "Could not extract text from this PDF. It may be a scanned/image PDF. Try saving it as a text PDF or paste your CV content directly.";
        res.status(400).json({ error: msg, diagnostics });
        return;
      }
      cvText = result.text;

    } else if (ext === "docx") {
      try {
        const mammoth = require("mammoth") as any;
        const extractedImages: string[] = [];

        const htmlResult = await mammoth.convertToHtml(
          { buffer },
          {
            convertImage: mammoth.images.inline(async (element: any) => {
              try {
                const data: string = await element.read("base64");
                const mimeType: string = element.contentType || "image/png";
                if (data && data.length < 4 * 1024 * 1024) {
                  extractedImages.push(`data:${mimeType};base64,${data}`);
                }
              } catch { /* ignore individual image errors */ }
              return {};
            }),
          }
        );

        cvText = htmlResult.value
          .replace(/<img[^>]*>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s{2,}/g, " ")
          .trim();

        diagnostics.method = "mammoth";

        if (extractedImages.length > 0) {
          (diagnostics as any).photo = extractedImages[0];
        }
      } catch (err) {
        req.log.error({ err }, "DOCX extraction failed");
        res.status(400).json({ error: "Could not extract text from this DOCX file.", diagnostics });
        return;
      }
    } else {
      cvText = buffer.toString("utf-8");
      diagnostics.method = "plain";
    }
  }

  diagnostics.textExtracted = cvText.trim().length;

  if (!cvText || cvText.trim().length < 50) {
    res.status(400).json({ error: "Not enough text found (need at least 50 characters). For scanned PDFs, try a text-based PDF or paste your CV content directly.", diagnostics });
    return;
  }

  const openai = getOpenAISafe(res);
  if (!openai) return;

  const systemPrompt = `You are an expert CV/resume parser. Extract ALL structured information from the CV text — do not truncate, summarise, or skip any content.

Return ONLY a valid JSON object (no markdown, no code blocks, no trailing text):
{
  "name": "<full name>",
  "email": "<email address>",
  "phone": "<phone number>",
  "location": "<city and country>",
  "linkedin": "<full LinkedIn URL or username>",
  "currentRole": "<most recent job title>",
  "targetRole": "<best-fit target role inferred from CV>",
  "summary": "<professional summary or objective verbatim, or empty string>",
  "experience": "<ALL work experience entries — company, title, dates, and bullet points — formatted as plain readable text preserving every role and bullet point>",
  "education": "<ALL education entries — institution, degree, dates, grades>",
  "achievements": "<ALL achievements, certifications, awards, and publications>",
  "languages": "<ALL spoken/written languages and proficiency levels — e.g. English (Fluent), German (B1), Twi (Native)>",
  "skills": [<complete array of every technical skill, tool, and technology mentioned — NOT spoken languages>]
}

Rules:
- Copy experience, education, achievements, and languages in FULL — never paraphrase or drop entries
- Include every skill mentioned anywhere in the document
- Put spoken/written languages ONLY in the "languages" field, not in "skills"
- If a field is absent from the CV, return an empty string or empty array`;

  const MAX_CV_CHARS = 12000;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse this CV:\n\n${cvText.slice(0, MAX_CV_CHARS)}` },
      ],
      temperature: 0.05,
      max_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const photo = (diagnostics as any).photo as string | undefined;

    const tryParse = (s: string) => {
      const parsed = JSON.parse(s);
      const response: Record<string, unknown> = { ...parsed, _diagnostics: diagnostics };
      if (photo) response.photo = photo;
      return response;
    };

    try {
      res.json(tryParse(raw));
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { res.json(tryParse(match[0])); return; } catch { /* fall through */ }
      }
      res.status(500).json({ error: "Failed to parse your CV structure. Please try again.", _diagnostics: diagnostics });
    }
  } catch (err: any) {
    req.log.error({ err }, "CV parse failed");
    const msg = err?.status === 401 ? "Invalid OpenAI API key."
      : err?.status === 429 ? "Rate limit reached. Please try again shortly."
      : "CV parsing is temporarily unavailable.";
    res.status(500).json({ error: msg });
  }
});

export default router;
