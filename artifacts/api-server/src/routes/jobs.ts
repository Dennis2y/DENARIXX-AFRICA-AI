import { Router, type IRouter } from "express";
import { db, jobs, jobApplications, savedJobs, usersTable, userSkillsTable } from "@workspace/db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { sendApplicationStatusEmail, sendJobMatchEmail } from "../email";

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
  job: { requiredSkills: string[]; level: string; location: string; title: string; remoteType?: string | null },
  userSkills: string[],
  userLocation?: string | null,
  userRole?: string | null,
  targetJobTitle?: string | null,
  cvSkills?: string[],
): { matchScore: number; matchedSkills: string[]; missingSkills: string[] } {
  // Merge profile skills with any additional CV-extracted skills
  const allSkills = [...new Set([...userSkills, ...(cvSkills ?? [])])];
  if (!allSkills.length) return { matchScore: 0, matchedSkills: [], missingSkills: job.requiredSkills };

  const required = job.requiredSkills.map(s => s.toLowerCase());
  const allSkillsLower = allSkills.map(s => s.toLowerCase());

  // Skills: up to 60 points
  const matchedLower = required.filter(r => allSkillsLower.some(u => u.includes(r) || r.includes(u)));
  const missingLower = required.filter(r => !allSkillsLower.some(u => u.includes(r) || r.includes(u)));
  const skillScore = required.length > 0 ? (matchedLower.length / required.length) * 60 : 30;

  // Location: up to 15 points
  let locationScore = 0;
  const jobIsRemote = job.remoteType === "remote" || job.location.toLowerCase().includes("remote");
  if (jobIsRemote) {
    locationScore = 15;
  } else if (userLocation) {
    const userLoc = userLocation.toLowerCase();
    const jobLoc = job.location.toLowerCase();
    const userCountry = userLoc.split(",").pop()?.trim() ?? userLoc;
    if (userCountry && jobLoc.includes(userCountry)) locationScore = 15;
    else locationScore = 3;
  }

  // Experience level: up to 15 points (inferred from user role or explicit target)
  let levelScore = 0;
  const effectiveRole = targetJobTitle ?? userRole;
  const userLevel = inferLevel(effectiveRole);
  const jobLevel = job.level.toLowerCase() as Level;
  if (userLevel && LEVELS.includes(jobLevel)) {
    const diff = Math.abs(LEVELS.indexOf(userLevel) - LEVELS.indexOf(jobLevel));
    if (diff === 0) levelScore = 15;
    else if (diff === 1) levelScore = 8;
  }

  // Target job title match: up to 10 points
  let roleScore = 0;
  if (effectiveRole) {
    const roleLower = effectiveRole.toLowerCase();
    const jobTitleLower = job.title.toLowerCase();
    if (jobTitleLower.includes(roleLower) || roleLower.includes(jobTitleLower)) {
      roleScore = 10;
    } else {
      const words = roleLower.split(/\s+/).filter(w => w.length > 3 && !["senior", "junior", "lead", "staff"].includes(w));
      const hits = words.filter(w => jobTitleLower.includes(w));
      roleScore = Math.round((hits.length / Math.max(1, words.length)) * 10);
    }
  }

  const total = Math.min(100, Math.round(skillScore + locationScore + levelScore + roleScore));
  // Use profile skills for matched/missing display (not CV extras — they're a bonus)
  const profileSkillsLower = userSkills.map(s => s.toLowerCase());
  const matchedSkills = job.requiredSkills.filter(s => allSkillsLower.some(u => u.includes(s.toLowerCase()) || s.toLowerCase().includes(u)));
  const missingSkills = job.requiredSkills.filter(s => !allSkillsLower.some(u => u.includes(s.toLowerCase()) || s.toLowerCase().includes(u)));
  return { matchScore: total, matchedSkills, missingSkills };
}

// ── Job-match notifications ───────────────────────────────────────────────────

const MATCH_THRESHOLD = 70;

async function notifyMatchingCandidates(
  job: { id: number; title: string; company: string; location: string; requiredSkills: string[]; level: string; remoteType: string | null },
  logger: { error: (obj: Record<string, unknown>, msg: string) => void },
): Promise<void> {
  try {
    const candidates = await db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, location: usersTable.location, role: usersTable.role })
      .from(usersTable)
      .where(and(eq(usersTable.userType, "candidate"), eq(usersTable.emailNotifications, true)));

    if (!candidates.length) return;

    const userIds = candidates.map(c => c.id);
    const skillRows = await db
      .select({ userId: userSkillsTable.userId, skill: userSkillsTable.skill })
      .from(userSkillsTable)
      .where(inArray(userSkillsTable.userId, userIds));

    const skillsByUser = new Map<number, string[]>();
    for (const row of skillRows) {
      const arr = skillsByUser.get(row.userId) ?? [];
      arr.push(row.skill);
      skillsByUser.set(row.userId, arr);
    }

    const sends: Promise<void>[] = [];
    for (const candidate of candidates) {
      const userSkills = skillsByUser.get(candidate.id) ?? [];
      if (!userSkills.length) continue;

      const { matchScore } = computeMatch(job, userSkills, candidate.location, candidate.role);
      if (matchScore < MATCH_THRESHOLD) continue;

      sends.push(
        sendJobMatchEmail({
          name: candidate.name,
          email: candidate.email,
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          matchScore,
          jobId: job.id,
        }).catch(err => {
          logger.error({ err, candidateId: candidate.id }, "Failed to send job-match email");
        }),
      );
    }

    await Promise.all(sends);
  } catch (err) {
    logger.error({ err }, "notifyMatchingCandidates failed");
  }
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_JOBS = [
  // ── External listings (apply on company's site) ──────────────────────────
  {
    title: "Senior Frontend Engineer",
    company: "Andela",
    location: "Remote, Africa",
    description: "Join Africa's largest talent accelerator building world-class engineering teams. You'll work with US and European companies on cutting-edge products. Andela vets and places top African developers with global tech companies.",
    requiredSkills: ["React", "TypeScript", "CSS", "JavaScript"],
    salary: "$4,000–6,000/month",
    jobType: "full-time",
    level: "senior",
    source: "andela",
    externalApplyUrl: "https://www.andela.com/talent/",
    postedDate: new Date("2026-06-05"),
    remoteType: "remote",
    country: null,
  },
  {
    title: "Data Scientist",
    company: "Flutterwave",
    location: "Lagos, Nigeria",
    description: "Help Africa's leading fintech company make sense of millions of payment transactions through machine learning and advanced analytics. You'll build models that directly impact fraud detection and risk scoring.",
    requiredSkills: ["Python", "Machine Learning", "SQL", "Data Analysis"],
    salary: "₦600,000–900,000/month",
    jobType: "full-time",
    level: "mid",
    source: "flutterwave",
    externalApplyUrl: "https://flutterwave.com/us/careers",
    postedDate: new Date("2026-06-03"),
    remoteType: "on-site",
    country: "Nigeria",
  },
  {
    title: "Product Designer (UI/UX)",
    company: "M-Pesa Africa",
    location: "Nairobi, Kenya",
    description: "Shape the digital financial experiences of 50+ million mobile money users across Africa. Own end-to-end design for mobile and web products — from discovery and wireframes to high-fidelity prototypes.",
    requiredSkills: ["UI/UX Design", "Figma", "User Research", "Prototyping"],
    salary: "KES 250,000–400,000/month",
    jobType: "full-time",
    level: "mid",
    source: "safaricom",
    externalApplyUrl: "https://www.safaricom.co.ke/careers",
    postedDate: new Date("2026-06-08"),
    remoteType: "on-site",
    country: "Kenya",
  },
  {
    title: "Backend Engineer (Node.js)",
    company: "Paystack",
    location: "Lagos, Nigeria (Hybrid)",
    description: "Build and scale the payments infrastructure that powers thousands of African businesses. Work on high-throughput systems handling billions in transactions. Paystack is a Stripe company.",
    requiredSkills: ["Node.js", "JavaScript", "PostgreSQL", "System Design"],
    salary: "₦500,000–800,000/month",
    jobType: "full-time",
    level: "mid",
    source: "paystack",
    externalApplyUrl: "https://paystack.com/careers",
    postedDate: new Date("2026-06-01"),
    remoteType: "hybrid",
    country: "Nigeria",
  },
  {
    title: "AI/ML Engineer",
    company: "InstaDeep",
    location: "Tunis, Tunisia (Remote-friendly)",
    description: "Work on cutting-edge AI research and deployment for industrial applications. InstaDeep is a global AI company headquartered in Africa, with offices in London, Paris, and Cape Town.",
    requiredSkills: ["Python", "Machine Learning", "Deep Learning", "PyTorch"],
    salary: "$3,500–5,500/month",
    jobType: "full-time",
    level: "mid",
    source: "instadeep",
    externalApplyUrl: "https://www.instadeep.com/careers/",
    postedDate: new Date("2026-06-10"),
    remoteType: "hybrid",
    country: "Tunisia",
  },
  {
    title: "Digital Marketing Manager",
    company: "Jumia",
    location: "Cairo, Egypt",
    description: "Lead performance marketing campaigns for Africa's largest e-commerce platform. Drive user acquisition, retention, and revenue across multiple African markets using data-driven strategies.",
    requiredSkills: ["Digital Marketing", "SEO", "Data Analysis", "Social Media"],
    salary: "$2,000–3,500/month",
    jobType: "full-time",
    level: "senior",
    source: "jumia",
    externalApplyUrl: "https://group.jumia.com/careers",
    postedDate: new Date("2026-06-04"),
    remoteType: "on-site",
    country: "Egypt",
  },
  {
    title: "Mobile Developer (React Native)",
    company: "Chipper Cash",
    location: "Remote, Africa",
    description: "Build mobile payment experiences for Chipper Cash users across 7 African countries. Handle real-money flows and ensure a seamless cross-border transfer experience on iOS and Android.",
    requiredSkills: ["React Native", "JavaScript", "TypeScript", "Mobile Development"],
    salary: "$3,000–5,000/month",
    jobType: "full-time",
    level: "mid",
    source: "chippercash",
    externalApplyUrl: "https://chippercash.com/careers",
    postedDate: new Date("2026-06-07"),
    remoteType: "remote",
    country: null,
  },
  {
    title: "DevOps / Cloud Engineer",
    company: "Safaricom PLC",
    location: "Nairobi, Kenya",
    description: "Build and maintain the cloud infrastructure powering Kenya's leading telco and digital services platform, including M-Pesa. Own reliability, automation, and cost optimisation for production systems.",
    requiredSkills: ["AWS", "Kubernetes", "Docker", "CI/CD", "Linux"],
    salary: "KES 300,000–500,000/month",
    jobType: "full-time",
    level: "mid",
    source: "safaricom",
    externalApplyUrl: "https://www.safaricom.co.ke/careers",
    postedDate: new Date("2026-06-02"),
    remoteType: "on-site",
    country: "Kenya",
  },
  {
    title: "Product Manager",
    company: "Wave Mobile Money",
    location: "Dakar, Senegal",
    description: "Lead product strategy for Wave's fastest-growing African markets. Wave is disrupting mobile money with zero fees and an exceptional UX across Senegal, Côte d'Ivoire, Uganda, and Tanzania.",
    requiredSkills: ["Product Management", "Agile", "User Research", "Data Analysis"],
    salary: "$4,000–7,000/month",
    jobType: "full-time",
    level: "senior",
    source: "wave",
    externalApplyUrl: "https://www.wave.com/en/careers/",
    postedDate: new Date("2026-06-06"),
    remoteType: "on-site",
    country: "Senegal",
  },
  {
    title: "Junior Software Developer",
    company: "Turing",
    location: "Remote",
    description: "Entry-level opportunity to work with top US companies via Turing's talent platform. Comprehensive onboarding and mentorship included. Turing matches African developers with Silicon Valley companies.",
    requiredSkills: ["JavaScript", "Python", "SQL"],
    salary: "$1,500–2,500/month",
    jobType: "full-time",
    level: "junior",
    source: "turing",
    externalApplyUrl: "https://www.turing.com/jobs/",
    postedDate: new Date("2026-06-09"),
    remoteType: "remote",
    country: null,
  },
  {
    title: "Cybersecurity Analyst",
    company: "Standard Bank Group",
    location: "Johannesburg, South Africa",
    description: "Protect one of Africa's largest banking groups from cyber threats. Work on threat detection, incident response, and security architecture across 20 African countries.",
    requiredSkills: ["Cybersecurity", "Network Security", "SIEM", "Linux"],
    salary: "R 45,000–70,000/month",
    jobType: "full-time",
    level: "mid",
    source: "standardbank",
    externalApplyUrl: "https://careers.standardbank.com/",
    postedDate: new Date("2026-06-03"),
    remoteType: "on-site",
    country: "South Africa",
  },
  {
    title: "Full-Stack Developer (Contract)",
    company: "Remoteli.io",
    location: "Remote",
    description: "Contract roles connecting African tech talent with remote-first companies globally. Flexible 3–12 month engagements with top clients. Remoteli specialises in placing African developers in international contract roles.",
    requiredSkills: ["JavaScript", "React", "Node.js", "PostgreSQL"],
    salary: "$30–60/hour",
    jobType: "contract",
    level: "mid",
    source: "remoteli",
    externalApplyUrl: "https://remoteli.io/jobs",
    postedDate: new Date("2026-06-11"),
    remoteType: "remote",
    country: null,
  },
  // ── DENARIXX-internal listings (apply via Denarixx) ──────────────────────
  {
    title: "Full-Stack Engineer",
    company: "DENARIXX",
    location: "Remote, Africa",
    description: "Help build Africa's AI Operating System. You'll work across the entire stack — React frontend, Express/Node backend, PostgreSQL database — shipping features that empower African professionals with AI tools.",
    requiredSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "REST APIs"],
    salary: "$2,500–4,000/month",
    jobType: "full-time",
    level: "mid",
    source: "denarixx",
    externalApplyUrl: null,
    postedDate: new Date("2026-06-12"),
    remoteType: "remote",
    country: null,
  },
  {
    title: "AI Prompt Engineer",
    company: "DENARIXX",
    location: "Remote, Africa",
    description: "Design and optimise the prompts powering DENARIXX's AI features — CV generation, job matching, interview coaching, and more. You'll work closely with product and engineering to craft prompts that deliver reliable, high-quality results.",
    requiredSkills: ["Prompt Engineering", "Python", "OpenAI API", "Data Analysis"],
    salary: "$2,000–3,500/month",
    jobType: "full-time",
    level: "mid",
    source: "denarixx",
    externalApplyUrl: null,
    postedDate: new Date("2026-06-12"),
    remoteType: "remote",
    country: null,
  },
  {
    title: "Growth & Partnerships Lead",
    company: "DENARIXX",
    location: "Remote, Africa",
    description: "Drive user growth and build partnerships with African universities, bootcamps, and tech communities. Own our go-to-market strategy across key African markets including Nigeria, Kenya, Ghana, South Africa, and Egypt.",
    requiredSkills: ["Growth Marketing", "Partnerships", "Digital Marketing", "Data Analysis"],
    salary: "$2,000–3,500/month",
    jobType: "full-time",
    level: "mid",
    source: "denarixx",
    externalApplyUrl: null,
    postedDate: new Date("2026-06-12"),
    remoteType: "remote",
    country: null,
  },
];

async function ensureJobsSeeded() {
  try {
    const existing = await db.select({ id: jobs.id, title: jobs.title, company: jobs.company, source: jobs.source }).from(jobs);

    if (existing.length === 0) {
      await db.insert(jobs).values(SEED_JOBS);
      return;
    }

    const existingKeys = new Set(existing.map(j => `${j.title}||${j.company}`));
    const needsMigration = existing.some(j => j.source === null);

    // Insert any new seed jobs not yet in DB
    const newSeeds = SEED_JOBS.filter(s => !existingKeys.has(`${s.title}||${s.company}`));
    if (newSeeds.length > 0) await db.insert(jobs).values(newSeeds);

    // Backfill metadata fields for existing rows missing `source`
    if (needsMigration) {
      for (const seed of SEED_JOBS) {
        if (existingKeys.has(`${seed.title}||${seed.company}`)) {
          await db.update(jobs)
            .set({
              source: seed.source ?? null,
              externalApplyUrl: seed.externalApplyUrl ?? null,
              postedDate: seed.postedDate ?? null,
              remoteType: seed.remoteType ?? null,
              country: seed.country ?? null,
            })
            .where(and(eq(jobs.title, seed.title), eq(jobs.company, seed.company)));
        }
      }
    }
  } catch {}
}
ensureJobsSeeded();

// ── GET /api/jobs ─────────────────────────────────────────────────────────────
// Query params: ?targetTitle=<string> ?cvSkills=<comma-separated>

router.get("/", async (req, res) => {
  const clerkUserId: string | undefined = (req as any).clerkUserId;
  const targetTitle = (req.query.targetTitle as string | undefined) || null;
  const cvSkillsRaw = (req.query.cvSkills as string | undefined) || "";
  const cvSkills = cvSkillsRaw ? cvSkillsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

  try {
    const allJobs = await db.select().from(jobs).where(and(eq(jobs.isActive, true), eq(jobs.moderationStatus, "approved")));
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

    const hasMatchContext = userSkills.length > 0 || cvSkills.length > 0;

    const jobsWithMatch = allJobs.map(job => {
      let matchScore: number | null = null;
      let matchedSkills: string[] = [];
      let missingSkills: string[] = job.requiredSkills;
      if (hasMatchContext) {
        const result = computeMatch(job, userSkills, userLocation, userRole, targetTitle, cvSkills);
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

// ── POST /api/jobs ─────────────────────────────────────────────────────────────
// Employer posts a new job listing. New listings start with moderationStatus="pending".

router.post("/", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { title, company, location, description, requiredSkills, salary, jobType, level, remoteType, country } =
    req.body as {
      title?: string;
      company?: string;
      location?: string;
      description?: string;
      requiredSkills?: string[];
      salary?: string | null;
      jobType?: string;
      level?: string;
      remoteType?: string;
      country?: string | null;
    };

  if (!title?.trim() || !company?.trim() || !location?.trim() || !description?.trim()) {
    res.status(400).json({ error: "title, company, location, and description are required" });
    return;
  }

  try {
    const [user] = await db.select({ id: usersTable.id, userType: usersTable.userType }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.userType !== "employer" && user.userType !== "admin") {
      res.status(403).json({ error: "Employer account required. Activate your employer account to post jobs." });
      return;
    }

    const [job] = await db.insert(jobs).values({
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      description: description.trim(),
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills.filter(Boolean) : [],
      salary: salary ?? null,
      jobType: jobType ?? "full-time",
      level: level ?? "mid",
      remoteType: remoteType ?? null,
      country: country ?? null,
      source: "employer",
      externalApplyUrl: null,
      postedDate: new Date(),
      postedByUserId: user.id,
      moderationStatus: "pending",
      isActive: true,
    }).returning();

    res.status(201).json({ job });
  } catch (err) {
    req.log.error({ err }, "Failed to create job listing");
    res.status(500).json({ error: "Failed to create job listing" });
  }
});

// ── GET /api/jobs/mine ─────────────────────────────────────────────────────────
// Returns all jobs posted by the authenticated employer with application counts.

router.get("/mine", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.json({ jobs: [] }); return; }

    const myJobs = await db.select().from(jobs).where(eq(jobs.postedByUserId, user.id)).orderBy(desc(jobs.createdAt));

    if (!myJobs.length) { res.json({ jobs: [], total: 0 }); return; }

    const jobIds = myJobs.map(j => j.id);
    const appCounts = await db
      .select({ jobId: jobApplications.jobId, count: sql<number>`cast(count(*) as int)` })
      .from(jobApplications)
      .where(inArray(jobApplications.jobId, jobIds))
      .groupBy(jobApplications.jobId);

    const countMap = Object.fromEntries(appCounts.map(r => [r.jobId, r.count]));

    const result = myJobs.map(j => ({ ...j, applicationCount: countMap[j.id] ?? 0 }));
    res.json({ jobs: result, total: result.length });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch employer listings");
    res.status(500).json({ error: "Failed to load your listings" });
  }
});

// ── PATCH /api/jobs/:id/moderate ──────────────────────────────────────────────
// Admin-only: approve or reject a pending job listing.

router.patch("/:id/moderate", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(req.params.id);
  const { status } = req.body as { status?: string };

  if (!jobId || isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
    return;
  }

  try {
    const [user] = await db.select({ id: usersTable.id, userType: usersTable.userType }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.userType !== "admin") { res.status(403).json({ error: "Admin access required" }); return; }

    const [updated] = await db
      .update(jobs)
      .set({ moderationStatus: status })
      .where(eq(jobs.id, jobId))
      .returning();

    if (!updated) { res.status(404).json({ error: "Job not found" }); return; }
    res.json({ job: updated });

    if (status === "approved") {
      notifyMatchingCandidates(updated, req.log).catch(() => {});
    }
  } catch (err) {
    req.log.error({ err }, "Failed to moderate job listing");
    res.status(500).json({ error: "Failed to moderate listing" });
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
      externalApplyUrl: jobs.externalApplyUrl,
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

    const saved = await db.select({ jobId: savedJobs.jobId }).from(savedJobs).where(eq(savedJobs.userId, user.id));
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
// Employer (job owner) or admin can update; email is sent to the applicant.

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
    const [caller] = await db
      .select({ id: usersTable.id, userType: usersTable.userType })
      .from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!caller) { res.status(404).json({ error: "User not found" }); return; }

    // Join application with its job to get postedByUserId and applicant userId
    const [appRow] = await db
      .select({
        id: jobApplications.id,
        applicantUserId: jobApplications.userId,
        jobId: jobApplications.jobId,
        postedByUserId: jobs.postedByUserId,
      })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(eq(jobApplications.id, appId))
      .limit(1);

    if (!appRow) { res.status(404).json({ error: "Application not found" }); return; }

    const isEmployer = appRow.postedByUserId === caller.id;
    const isAdmin = caller.userType === "admin";

    if (!isEmployer && !isAdmin) {
      res.status(403).json({ error: "Only the job's employer or an admin can update application status" });
      return;
    }

    const [updated] = await db.update(jobApplications).set({ status }).where(eq(jobApplications.id, appId)).returning();
    res.json({ application: updated });

    // Fire-and-forget: email goes to the APPLICANT
    db.select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, emailNotifications: usersTable.emailNotifications })
      .from(usersTable).where(eq(usersTable.id, appRow.applicantUserId)).limit(1)
      .then(([applicant]) => {
        if (!applicant || applicant.emailNotifications === false) return;
        return db.select({ title: jobs.title, company: jobs.company })
          .from(jobs).where(eq(jobs.id, appRow.jobId)).limit(1)
          .then(([job]) => {
            if (!job) return;
            return sendApplicationStatusEmail({ name: applicant.name, email: applicant.email, jobTitle: job.title, company: job.company, status });
          });
      })
      .catch(emailErr => req.log.error({ err: emailErr }, "Failed to send application status email"));
  } catch (err) {
    req.log.error({ err }, "Failed to update application status");
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ── GET /api/jobs/:id/applicants ──────────────────────────────────────────────
// Employer sees all applicants for their job listing with candidate details.

router.get("/:id/applicants", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(String(req.params.id));
  if (!jobId || isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  try {
    const [caller] = await db
      .select({ id: usersTable.id, userType: usersTable.userType })
      .from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!caller) { res.status(404).json({ error: "User not found" }); return; }

    const [job] = await db
      .select({ id: jobs.id, postedByUserId: jobs.postedByUserId })
      .from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    if (job.postedByUserId !== caller.id && caller.userType !== "admin") {
      res.status(403).json({ error: "You can only view applicants for your own listings" }); return;
    }

    const applicants = await db
      .select({
        id: jobApplications.id,
        userId: jobApplications.userId,
        jobId: jobApplications.jobId,
        status: jobApplications.status,
        coverLetter: jobApplications.coverLetter,
        appliedAt: jobApplications.appliedAt,
        candidateName: usersTable.name,
        candidateEmail: usersTable.email,
        candidateRole: usersTable.role,
        candidateAvatarUrl: usersTable.avatarUrl,
      })
      .from(jobApplications)
      .innerJoin(usersTable, eq(jobApplications.userId, usersTable.id))
      .where(eq(jobApplications.jobId, jobId))
      .orderBy(desc(jobApplications.appliedAt));

    res.json({ applicants, total: applicants.length });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch applicants");
    res.status(500).json({ error: "Failed to load applicants" });
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

    const [job] = await db.select({ id: jobs.id, externalApplyUrl: jobs.externalApplyUrl, moderationStatus: jobs.moderationStatus }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    if (job.moderationStatus !== "approved") {
      res.status(403).json({ error: "This job listing is not available for applications." });
      return;
    }

    if (job.externalApplyUrl) {
      res.status(400).json({ error: "This job uses an external application process.", externalApplyUrl: job.externalApplyUrl });
      return;
    }

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
// Body: { cvText?: string; targetTitle?: string }

router.post("/:id/match-explain", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(req.params.id);
  const { cvText, targetTitle } = req.body as { cvText?: string; targetTitle?: string };
  if (!jobId || isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  try {
    const [user] = await db.select({ id: usersTable.id, role: usersTable.role, location: usersTable.location })
      .from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const skillRows = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
    const userSkills = skillRows.map(s => s.skill);

    // Extract additional skills from CV text (keyword intersection with job skills)
    const cvSkills: string[] = cvText
      ? job.requiredSkills.filter(s => cvText.toLowerCase().includes(s.toLowerCase()))
      : [];

    const effectiveRole = targetTitle ?? user.role;
    const { matchedSkills, missingSkills } = computeMatch(job, userSkills, user.location, user.role, effectiveRole, cvSkills);

    const openai = getOpenAISafe(res);
    if (!openai) return;

    const cvNote = cvText ? `\nCV excerpt: ${cvText.slice(0, 600)}` : "";
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "You are a career coach for African tech professionals. Analyze the job match and return ONLY a valid JSON object (no markdown):\n{\n  \"summary\": \"<2-sentence explanation of why this is a good or partial match>\",\n  \"suggestions\": [\"<3 specific, actionable steps to improve the match>\"]\n}",
      }, {
        role: "user",
        content: `Job: ${job.title} at ${job.company} (${job.level} level, ${job.location})\nRequired skills: ${job.requiredSkills.join(", ")}\nUser profile skills: ${userSkills.join(", ")}\nTarget role: ${effectiveRole ?? "not specified"}\nMatched skills: ${matchedSkills.join(", ") || "none"}\nMissing skills: ${missingSkills.join(", ") || "none"}${cvNote}`,
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
    const msg = err?.status === 429 ? "Rate limit — try again shortly." : "AI unavailable.";
    res.status(500).json({ error: msg });
  }
});

// ── POST /api/jobs/:id/cover-letter ──────────────────────────────────────────

router.post("/:id/cover-letter", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(req.params.id);
  const { cvText } = req.body as { cvText?: string };
  if (!jobId || isNaN(jobId)) { res.status(400).json({ error: "Invalid job ID" }); return; }

  try {
    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
      .from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }

    const skillRows = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
    const userSkills = skillRows.map(s => s.skill);

    const cvNote = cvText ? `\nRelevant CV background:\n${cvText.slice(0, 800)}` : "";

    const openai = getOpenAISafe(res);
    if (!openai) return;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "You are an expert job application coach specialising in African tech careers. Write a compelling, personalised 3-paragraph cover letter. Be specific about the company and role. Use a professional but warm tone. Return ONLY the cover letter text — no subject line, no date, no address block.",
      }, {
        role: "user",
        content: `Candidate name: ${user.name ?? "Candidate"}\nCurrent role: ${user.role ?? "Professional"}\nSkills: ${userSkills.join(", ")}${cvNote}\n\nApplying for: ${job.title} at ${job.company} (${job.location})\nJob description: ${job.description}\nRequired skills: ${job.requiredSkills.join(", ")}`,
      }],
      temperature: 0.7,
      max_tokens: 600,
    });

    const coverLetter = completion.choices[0]?.message?.content?.trim() ?? "";
    res.json({ coverLetter });
  } catch (err: any) {
    req.log.error({ err }, "cover-letter generation failed");
    const msg = err?.status === 429 ? "Rate limit — try again shortly." : "AI unavailable.";
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

    const systemPrompt = `You are an expert ATS and recruitment consultant specialising in African tech careers. Analyse this CV against the job description for the target role.\n\nReturn ONLY a valid JSON object (no markdown):\n{\n  "atsScore": <integer 0-100>,\n  "missingKeywords": [<up to 8 important keywords missing from CV>],\n  "presentKeywords": [<up to 8 strong matching keywords already present>],\n  "suggestions": [<3-5 actionable steps to improve the CV for this specific role>],\n  "tailoredSummary": "<2-3 sentence professional summary, tailored to this JD and target role>"\n}`;
    const userPrompt = `Target role: ${resolvedRole}\n\nCV:\n${cvContent.slice(0, 2500)}\n\n---\n\nJob: ${job.title} at ${job.company}\nJob Description: ${job.description}\nRequired Skills: ${job.requiredSkills.join(", ")}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.3,
      max_tokens: 900,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(raw); }
    catch { const m = raw.match(/\{[\s\S]*\}/); if (m) try { parsed = JSON.parse(m[0]); } catch {} }

    if (!parsed) { res.status(500).json({ error: "Failed to parse AI response." }); return; }
    res.json({ ...parsed, tailoredCv: parsed.tailoredSummary });
  } catch (err: any) {
    req.log.error({ err }, "tailor-cv failed");
    const msg = err?.status === 429 ? "Rate limit — try again shortly." : "AI unavailable.";
    res.status(500).json({ error: msg });
  }
});

export default router;
