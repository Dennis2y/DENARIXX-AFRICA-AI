import { Router, type IRouter } from "express";
import { db, jobs, jobApplications, savedJobs, usersTable, userSkillsTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// ── OpenAI helper ────────────────────────────────────────────────────────────

function getOpenAI() {
  const { openai } = require("@workspace/integrations-openai-ai-server");
  return openai;
}
type OpenAIClient = ReturnType<typeof getOpenAI>;
function getOpenAISafe(res: any): OpenAIClient | null {
  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: "AI service not configured." });
    return null;
  }
  try { return getOpenAI(); }
  catch { res.status(503).json({ error: "AI service failed to initialize." }); return null; }
}

// ── Match scoring ────────────────────────────────────────────────────────────

const LEVELS = ["junior", "mid", "senior", "executive"] as const;
type Level = typeof LEVELS[number];

function inferLevel(roleStr: string | null | undefined): Level | null {
  if (!roleStr) return null;
  const r = roleStr.toLowerCase();
  if (r.includes("executive") || r.includes("cto") || r.includes("ceo") || r.includes("vp ") || r.includes("vice president") || r.includes("director")) return "executive";
  if (r.includes("senior") || r.includes("lead") || r.includes("principal") || r.includes("staff")) return "senior";
  if (r.includes("junior") || r.includes("entry") || r.includes("intern") || r.includes("associate")) return "junior";
  return "mid";
}

function computeMatch(
  job: { requiredSkills: string[]; level: string; location: string; title: string },
  userSkills: string[],
  userLocation?: string | null,
  userRole?: string | null,
): { matchScore: number; matchedSkills: string[]; missingSkills: string[] } {
  if (!userSkills.length) return { matchScore: 0, matchedSkills: [], missingSkills: job.requiredSkills };

  const required = job.requiredSkills.map(s => s.toLowerCase());
  const userSkillsLower = userSkills.map(s => s.toLowerCase());

  // Skills: up to 60 points
  const matchedLower = required.filter(r => userSkillsLower.some(u => u.includes(r) || r.includes(u)));
  const missingLower = required.filter(r => !userSkillsLower.some(u => u.includes(r) || r.includes(u)));
  const skillScore = required.length > 0 ? (matchedLower.length / required.length) * 60 : 30;

  // Location: up to 15 points
  let locationScore = 0;
  const jobLoc = job.location.toLowerCase();
  if (jobLoc.includes("remote")) {
    locationScore = 15;
  } else if (userLocation) {
    const userLoc = userLocation.toLowerCase();
    const userCountry = userLoc.split(",").pop()?.trim() ?? userLoc;
    if (userCountry && jobLoc.includes(userCountry)) locationScore = 15;
    else locationScore = 5;
  }

  // Experience level: up to 15 points (inferred from user role string)
  let levelScore = 0;
  const userLevel = inferLevel(userRole);
  const jobLevel = job.level.toLowerCase() as Level;
  if (userLevel && LEVELS.includes(jobLevel)) {
    const diff = Math.abs(LEVELS.indexOf(userLevel) - LEVELS.indexOf(jobLevel));
    if (diff === 0) levelScore = 15;
    else if (diff === 1) levelScore = 8;
    // diff >= 2: 0 pts
  }

  // Target role title match: up to 10 points
  let roleScore = 0;
  if (userRole) {
    const userRoleLower = userRole.toLowerCase();
    const jobTitleLower = job.title.toLowerCase();
    if (jobTitleLower.includes(userRoleLower) || userRoleLower.includes(jobTitleLower)) {
      roleScore = 10;
    } else {
      const words = userRoleLower.split(/\s+/).filter(w => w.length > 3 && !["senior", "junior", "lead"].includes(w));
      const hits = words.filter(w => jobTitleLower.includes(w));
      roleScore = Math.round((hits.length / Math.max(1, words.length)) * 10);
    }
  }

  const total = Math.min(100, Math.round(skillScore + locationScore + levelScore + roleScore));
  const matchedSkills = job.requiredSkills.filter(s => matchedLower.includes(s.toLowerCase()));
  const missingSkills = job.requiredSkills.filter(s => missingLower.includes(s.toLowerCase()));
  return { matchScore: total, matchedSkills, missingSkills };
}

// ── Seed ─────────────────────────────────────────────────────────────────────

const SEED_JOBS = [
  { title: "Senior Frontend Engineer", company: "Andela", location: "Remote, Africa", description: "Join Africa's largest talent accelerator building world-class engineering teams. You'll work with US and European companies on cutting-edge products.", requiredSkills: ["React", "TypeScript", "CSS", "JavaScript"], salary: "$4,000–6,000/month", jobType: "full-time", level: "senior" },
  { title: "Data Scientist", company: "Flutterwave", location: "Lagos, Nigeria", description: "Help Africa's leading fintech company make sense of millions of payment transactions through machine learning and advanced analytics.", requiredSkills: ["Python", "Machine Learning", "SQL", "Data Analysis"], salary: "₦600,000–900,000/month", jobType: "full-time", level: "mid" },
  { title: "Product Designer (UI/UX)", company: "M-Pesa Africa", location: "Nairobi, Kenya", description: "Shape the digital financial experiences of 50+ million mobile money users across Africa. Own end-to-end design for mobile and web products.", requiredSkills: ["UI/UX Design", "Figma", "User Research", "Prototyping"], salary: "KES 250,000–400,000/month", jobType: "full-time", level: "mid" },
  { title: "Backend Engineer (Node.js)", company: "Paystack", location: "Lagos, Nigeria (Hybrid)", description: "Build and scale the payments infrastructure that powers thousands of African businesses. Work on high-throughput systems handling billions in transactions.", requiredSkills: ["Node.js", "JavaScript", "PostgreSQL", "System Design"], salary: "₦500,000–800,000/month", jobType: "full-time", level: "mid" },
  { title: "AI/ML Engineer", company: "InstaDeep", location: "Tunis, Tunisia (Remote-friendly)", description: "Work on cutting-edge AI research and deployment for industrial applications. InstaDeep is a global AI company headquartered in Africa.", requiredSkills: ["Python", "Machine Learning", "Deep Learning", "PyTorch"], salary: "$3,500–5,500/month", jobType: "full-time", level: "mid" },
  { title: "Digital Marketing Manager", company: "Jumia", location: "Cairo, Egypt", description: "Lead performance marketing campaigns for Africa's largest e-commerce platform. Drive user acquisition, retention and revenue across multiple African markets.", requiredSkills: ["Digital Marketing", "SEO", "Data Analysis", "Social Media"], salary: "$2,000–3,500/month", jobType: "full-time", level: "senior" },
  { title: "Mobile Developer (React Native)", company: "Chipper Cash", location: "Remote, Africa", description: "Build mobile payment experiences for Chipper Cash users across 7 African countries. Handle real-money flows and ensure a seamless cross-border transfer experience.", requiredSkills: ["React Native", "JavaScript", "TypeScript", "Mobile Development"], salary: "$3,000–5,000/month", jobType: "full-time", level: "mid" },
  { title: "DevOps / Cloud Engineer", company: "Safaricom PLC", location: "Nairobi, Kenya", description: "Build and maintain the cloud infrastructure powering Kenya's leading telco and digital services platform, including M-Pesa.", requiredSkills: ["AWS", "Kubernetes", "Docker", "CI/CD", "Linux"], salary: "KES 300,000–500,000/month", jobType: "full-time", level: "mid" },
  { title: "Product Manager", company: "Wave Mobile Money", location: "Dakar, Senegal", description: "Lead product strategy for Wave's fastest-growing African markets. Wave is disrupting mobile money with zero fees and an exceptional UX.", requiredSkills: ["Product Management", "Agile", "User Research", "Data Analysis"], salary: "$4,000–7,000/month", jobType: "full-time", level: "senior" },
  { title: "Junior Software Developer", company: "Turing", location: "Remote", description: "Entry-level opportunity to work with top US companies via Turing's talent platform. Comprehensive onboarding and mentorship included.", requiredSkills: ["JavaScript", "Python", "SQL"], salary: "$1,500–2,500/month", jobType: "full-time", level: "junior" },
  { title: "Cybersecurity Analyst", company: "Standard Bank Group", location: "Johannesburg, South Africa", description: "Protect one of Africa's largest banking groups from cyber threats. Work on threat detection, incident response, and security architecture.", requiredSkills: ["Cybersecurity", "Network Security", "SIEM", "Linux"], salary: "R 45,000–70,000/month", jobType: "full-time", level: "mid" },
  { title: "Full-Stack Developer (Contract)", company: "Remoteli.io", location: "Remote", description: "Contract roles connecting African tech talent with remote-first companies globally. Flexible 3–12 month engagements with top clients.", requiredSkills: ["JavaScript", "React", "Node.js", "PostgreSQL"], salary: "$30–60/hour", jobType: "contract", level: "mid" },
];

async function ensureJobsSeeded() {
  try {
    const existing = await db.select({ id: jobs.id }).from(jobs).limit(1);
    if (existing.length === 0) await db.insert(jobs).values(SEED_JOBS);
  } catch {}
}
ensureJobsSeeded();

// ── GET /api/jobs ─────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const clerkUserId: string | undefined = (req as any).clerkUserId;
  try {
    const allJobs = await db.select().from(jobs).where(eq(jobs.isActive, true));
    let userSkills: string[] = [];
    let userLocation: string | null = null;
    let userRole: string | null = null;
    let appliedJobIds = new Set<number>();
    let savedJobIds = new Set<number>();

    if (clerkUserId) {
      const [user] = await db.select({ id: usersTable.id, location: usersTable.location, role: usersTable.role })
        .from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
      if (user) {
        userLocation = user.location;
        userRole = user.role;
        const skillRows = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
        userSkills = skillRows.map(s => s.skill);
        const apps = await db.select({ jobId: jobApplications.jobId }).from(jobApplications).where(eq(jobApplications.userId, user.id));
        appliedJobIds = new Set(apps.map(a => a.jobId));
        const saved = await db.select({ jobId: savedJobs.jobId }).from(savedJobs).where(eq(savedJobs.userId, user.id));
        savedJobIds = new Set(saved.map(s => s.jobId));
      }
    }

    const jobsWithMatch = allJobs.map(job => {
      let matchScore: number | null = null;
      let matchedSkills: string[] = [];
      let missingSkills: string[] = job.requiredSkills;
      if (userSkills.length > 0) {
        const result = computeMatch(job, userSkills, userLocation, userRole);
        matchScore = result.matchScore;
        matchedSkills = result.matchedSkills;
        missingSkills = result.missingSkills;
      }
      return { ...job, matchScore, matchedSkills, missingSkills, applied: appliedJobIds.has(job.id), saved: savedJobIds.has(job.id) };
    });

    jobsWithMatch.sort((a, b) => {
      if (a.applied !== b.applied) return a.applied ? 1 : -1;
      return (b.matchScore ?? 0) - (a.matchScore ?? 0);
    });

    res.json({ jobs: jobsWithMatch, total: jobsWithMatch.length });
  } catch (err) {
    req.log.error({ err }, "Failed to list jobs");
    res.status(500).json({ error: "Failed to load jobs" });
  }
});

// ── GET /api/jobs/my-applications ─────────────────────────────────────────────

router.get("/my-applications", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.json({ applications: [] }); return; }

    const apps = await db.select({
      id: jobApplications.id, jobId: jobApplications.jobId, status: jobApplications.status,
      coverLetter: jobApplications.coverLetter, appliedAt: jobApplications.appliedAt,
      title: jobs.title, company: jobs.company, location: jobs.location,
      jobType: jobs.jobType, level: jobs.level, salary: jobs.salary,
    })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(eq(jobApplications.userId, user.id))
      .orderBy(desc(jobApplications.appliedAt));

    res.json({ applications: apps, total: apps.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get applications");
    res.status(500).json({ error: "Failed to load applications" });
  }
});

// ── GET /api/jobs/saved ───────────────────────────────────────────────────────

router.get("/saved", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const [user] = await db.select({ id: usersTable.id, location: usersTable.location, role: usersTable.role })
      .from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.json({ jobs: [] }); return; }

    const saved = await db.select({ jobId: savedJobs.jobId })
      .from(savedJobs).where(eq(savedJobs.userId, user.id));
    const savedIds = saved.map(s => s.jobId);
    if (!savedIds.length) { res.json({ jobs: [] }); return; }

    const skillRows = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
    const userSkills = skillRows.map(s => s.skill);

    const apps = await db.select({ jobId: jobApplications.jobId }).from(jobApplications).where(eq(jobApplications.userId, user.id));
    const appliedIds = new Set(apps.map(a => a.jobId));

    const jobRows = await db.select().from(jobs).where(inArray(jobs.id, savedIds));
    const result = jobRows.map(job => {
      let matchScore: number | null = null;
      let matchedSkills: string[] = [];
      let missingSkills: string[] = job.requiredSkills;
      if (userSkills.length) {
        const r = computeMatch(job, userSkills, user.location, user.role);
        matchScore = r.matchScore; matchedSkills = r.matchedSkills; missingSkills = r.missingSkills;
      }
      return { ...job, matchScore, matchedSkills, missingSkills, applied: appliedIds.has(job.id), saved: true };
    });

    res.json({ jobs: result });
  } catch (err) {
    req.log.error({ err }, "Failed to get saved jobs");
    res.status(500).json({ error: "Failed to load saved jobs" });
  }
});

// ── PATCH /api/jobs/applications/:appId/status ───────────────────────────────

router.patch("/applications/:appId/status", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const appId = Number(req.params.appId);
  const { status } = req.body as { status: string };
  const VALID = ["applied", "reviewing", "interview", "offered", "rejected"];

  if (!status || !VALID.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID.join(", ")}` });
    return;
  }

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [app] = await db.select({ id: jobApplications.id, userId: jobApplications.userId })
      .from(jobApplications).where(eq(jobApplications.id, appId)).limit(1);
    if (!app || app.userId !== user.id) { res.status(404).json({ error: "Application not found" }); return; }

    const [updated] = await db.update(jobApplications).set({ status }).where(eq(jobApplications.id, appId)).returning();
    res.json({ application: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update application status");
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ── POST /api/jobs/:id/apply ──────────────────────────────────────────────────

router.post("/:id/apply", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(req.params.id);
  const { coverLetter } = req.body as { coverLetter?: string };

  if (!jobId || isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const [existing] = await db.select({ id: jobApplications.id })
      .from(jobApplications).where(and(eq(jobApplications.userId, user.id), eq(jobApplications.jobId, jobId))).limit(1);
    if (existing) { res.status(409).json({ error: "Already applied to this job" }); return; }

    const [application] = await db.insert(jobApplications).values({
      userId: user.id, jobId, status: "applied", coverLetter: coverLetter ?? null,
    }).returning();

    res.status(201).json({ application });
  } catch (err) {
    req.log.error({ err }, "Failed to apply for job");
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// ── POST /api/jobs/:id/save ───────────────────────────────────────────────────

router.post("/:id/save", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(req.params.id);
  if (!jobId || isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    await db.insert(savedJobs).values({ userId: user.id, jobId }).onConflictDoNothing();
    res.json({ saved: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save job");
    res.status(500).json({ error: "Failed to save job" });
  }
});

// ── DELETE /api/jobs/:id/save ─────────────────────────────────────────────────

router.delete("/:id/save", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(req.params.id);
  if (!jobId || isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    await db.delete(savedJobs).where(and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, jobId)));
    res.json({ saved: false });
  } catch (err) {
    req.log.error({ err }, "Failed to unsave job");
    res.status(500).json({ error: "Failed to unsave job" });
  }
});

// ── POST /api/jobs/:id/match-explain ─────────────────────────────────────────

router.post("/:id/match-explain", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(req.params.id);
  if (!jobId || isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  try {
    const [user] = await db.select({ id: usersTable.id, role: usersTable.role, location: usersTable.location })
      .from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const skillRows = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
    const userSkills = skillRows.map(s => s.skill);
    const { matchedSkills, missingSkills } = computeMatch(job, userSkills, user.location, user.role);

    const openai = getOpenAISafe(res);
    if (!openai) return;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are a career coach. Analyze the job match and return ONLY a valid JSON object (no markdown):\n{\n  \"summary\": \"<2-sentence explanation of why this is a good or partial match>\",\n  \"suggestions\": [\"<3 specific, actionable steps to improve the match>\"]\n}",
      }, {
        role: "user",
        content: `Job: ${job.title} at ${job.company}\nRequired skills: ${job.requiredSkills.join(", ")}\nUser skills: ${userSkills.join(", ")}\nMatched skills: ${matchedSkills.join(", ")}\nMissing skills: ${missingSkills.join(", ")}\nUser current role: ${user.role ?? "unknown"}`,
      }],
      temperature: 0.4,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: { summary?: string; suggestions?: string[] } = {};
    try { parsed = JSON.parse(raw); }
    catch { const m = raw.match(/\{[\s\S]*\}/); if (m) try { parsed = JSON.parse(m[0]); } catch {} }

    res.json({ summary: parsed.summary ?? "", matchedSkills, missingSkills, suggestions: parsed.suggestions ?? [] });
  } catch (err: any) {
    req.log.error({ err }, "match-explain failed");
    const msg = err?.status === 429 ? "Rate limit. Try again shortly." : "AI unavailable.";
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/jobs/:id/cover-letter ──────────────────────────────────────────

router.post("/:id/cover-letter", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(req.params.id);
  if (!jobId || isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  try {
    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
      .from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const skillRows = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
    const userSkills = skillRows.map(s => s.skill);

    const openai = getOpenAISafe(res);
    if (!openai) return;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are an expert job application coach. Write a compelling, personalised 3-paragraph cover letter. Be specific about the company and role. Use a professional but warm tone. Return ONLY the cover letter text — no subject line, no date, no address block.",
      }, {
        role: "user",
        content: `Candidate name: ${user.name ?? "Candidate"}\nCurrent role: ${user.role ?? "Professional"}\nSkills: ${userSkills.join(", ")}\n\nApplying for: ${job.title} at ${job.company} (${job.location})\nJob description: ${job.description}\nRequired skills: ${job.requiredSkills.join(", ")}`,
      }],
      temperature: 0.7,
      max_tokens: 600,
    });

    const coverLetter = completion.choices[0]?.message?.content?.trim() ?? "";
    res.json({ coverLetter });
  } catch (err: any) {
    req.log.error({ err }, "cover-letter generation failed");
    const msg = err?.status === 429 ? "Rate limit. Try again shortly." : "AI unavailable.";
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/jobs/:id/tailor-cv ──────────────────────────────────────────────
// Request:  { cvText?: string; targetRole?: string }
// Response: { atsScore, missingKeywords, presentKeywords, suggestions, tailoredSummary, tailoredCv }

router.post("/:id/tailor-cv", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(req.params.id);
  const { cvText, targetRole } = req.body as { cvText?: string; targetRole?: string };
  if (!jobId || isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  try {
    const [user] = await db.select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    let cvContent = cvText ?? "";
    if (!cvContent) {
      const skillRows = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
      cvContent = `Role: ${targetRole ?? user.role ?? "Professional"}\nSkills: ${skillRows.map(s => s.skill).join(", ")}`;
    }

    const resolvedRole = targetRole ?? user.role ?? job.title;

    const openai = getOpenAISafe(res);
    if (!openai) return;

    const systemPrompt = `You are an expert ATS and recruitment consultant. Analyse this CV against the job description for the target role.\n\nReturn ONLY a valid JSON object (no markdown):\n{\n  "atsScore": <integer 0-100>,\n  "missingKeywords": [<up to 8 important keywords missing from CV>],\n  "presentKeywords": [<up to 8 strong matching keywords already present>],\n  "suggestions": [<3-5 actionable steps to improve the CV for this specific role>],\n  "tailoredSummary": "<2-3 sentence professional summary, tailored to this JD and target role>"\n}`;
    const userPrompt = `Target role: ${resolvedRole}\n\nCV:\n${cvContent.slice(0, 2500)}\n\n---\n\nJob: ${job.title} at ${job.company}\nJob Description: ${job.description}\nRequired Skills: ${job.requiredSkills.join(", ")}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.3,
      max_tokens: 900,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(raw); }
    catch { const m = raw.match(/\{[\s\S]*\}/); if (m) try { parsed = JSON.parse(m[0]); } catch {} }

    if (!parsed) { res.status(500).json({ error: "Failed to parse AI response." }); return; }

    // Return both tailoredSummary and tailoredCv (aliases) for forward compat
    res.json({ ...parsed, tailoredCv: parsed.tailoredSummary });
  } catch (err: any) {
    req.log.error({ err }, "tailor-cv failed");
    const msg = err?.status === 429 ? "Rate limit. Try again shortly." : "AI unavailable.";
    res.status(500).json({ error: msg });
  }
});

export default router;
