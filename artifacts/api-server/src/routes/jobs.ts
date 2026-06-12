import { Router, type IRouter } from "express";
import { db, jobs, jobApplications, usersTable, userSkillsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const SEED_JOBS = [
  {
    title: "Senior Frontend Engineer",
    company: "Andela",
    location: "Remote, Africa",
    description: "Join Africa's largest talent accelerator building world-class engineering teams. You'll work with US and European companies on cutting-edge products.",
    requiredSkills: ["React", "TypeScript", "CSS", "JavaScript"],
    salary: "$4,000–6,000/month",
    jobType: "full-time",
    level: "senior",
  },
  {
    title: "Data Scientist",
    company: "Flutterwave",
    location: "Lagos, Nigeria",
    description: "Help Africa's leading fintech company make sense of millions of payment transactions through machine learning and advanced analytics.",
    requiredSkills: ["Python", "Machine Learning", "SQL", "Data Analysis"],
    salary: "₦600,000–900,000/month",
    jobType: "full-time",
    level: "mid",
  },
  {
    title: "Product Designer (UI/UX)",
    company: "M-Pesa Africa",
    location: "Nairobi, Kenya",
    description: "Shape the digital financial experiences of 50+ million mobile money users across Africa. Own end-to-end design for mobile and web products.",
    requiredSkills: ["UI/UX Design", "Figma", "User Research", "Prototyping"],
    salary: "KES 250,000–400,000/month",
    jobType: "full-time",
    level: "mid",
  },
  {
    title: "Backend Engineer (Node.js)",
    company: "Paystack",
    location: "Lagos, Nigeria (Hybrid)",
    description: "Build and scale the payments infrastructure that powers thousands of African businesses. Work on high-throughput systems handling billions in transactions.",
    requiredSkills: ["Node.js", "JavaScript", "PostgreSQL", "System Design"],
    salary: "₦500,000–800,000/month",
    jobType: "full-time",
    level: "mid",
  },
  {
    title: "AI/ML Engineer",
    company: "InstaDeep",
    location: "Tunis, Tunisia (Remote-friendly)",
    description: "Work on cutting-edge AI research and deployment for industrial applications. InstaDeep is a global AI company headquartered in Africa.",
    requiredSkills: ["Python", "Machine Learning", "Deep Learning", "PyTorch"],
    salary: "$3,500–5,500/month",
    jobType: "full-time",
    level: "mid",
  },
  {
    title: "Digital Marketing Manager",
    company: "Jumia",
    location: "Cairo, Egypt",
    description: "Lead performance marketing campaigns for Africa's largest e-commerce platform. Drive user acquisition, retention and revenue across multiple African markets.",
    requiredSkills: ["Digital Marketing", "SEO", "Data Analysis", "Social Media"],
    salary: "$2,000–3,500/month",
    jobType: "full-time",
    level: "senior",
  },
  {
    title: "Mobile Developer (React Native)",
    company: "Chipper Cash",
    location: "Remote, Africa",
    description: "Build mobile payment experiences for Chipper Cash users across 7 African countries. Handle real-money flows and ensure a seamless cross-border transfer experience.",
    requiredSkills: ["React Native", "JavaScript", "TypeScript", "Mobile Development"],
    salary: "$3,000–5,000/month",
    jobType: "full-time",
    level: "mid",
  },
  {
    title: "DevOps / Cloud Engineer",
    company: "Safaricom PLC",
    location: "Nairobi, Kenya",
    description: "Build and maintain the cloud infrastructure powering Kenya's leading telco and digital services platform, including M-Pesa.",
    requiredSkills: ["AWS", "Kubernetes", "Docker", "CI/CD", "Linux"],
    salary: "KES 300,000–500,000/month",
    jobType: "full-time",
    level: "mid",
  },
  {
    title: "Product Manager",
    company: "Wave Mobile Money",
    location: "Dakar, Senegal",
    description: "Lead product strategy for Wave's fastest-growing African markets. Wave is disrupting mobile money with zero fees and an exceptional UX.",
    requiredSkills: ["Product Management", "Agile", "User Research", "Data Analysis"],
    salary: "$4,000–7,000/month",
    jobType: "full-time",
    level: "senior",
  },
  {
    title: "Junior Software Developer",
    company: "Turing",
    location: "Remote",
    description: "Entry-level opportunity to work with top US companies via Turing's talent platform. Comprehensive onboarding and mentorship included.",
    requiredSkills: ["JavaScript", "Python", "SQL"],
    salary: "$1,500–2,500/month",
    jobType: "full-time",
    level: "junior",
  },
  {
    title: "Cybersecurity Analyst",
    company: "Standard Bank Group",
    location: "Johannesburg, South Africa",
    description: "Protect one of Africa's largest banking groups from cyber threats. Work on threat detection, incident response, and security architecture.",
    requiredSkills: ["Cybersecurity", "Network Security", "SIEM", "Linux"],
    salary: "R 45,000–70,000/month",
    jobType: "full-time",
    level: "mid",
  },
  {
    title: "Full-Stack Developer (Contract)",
    company: "Remoteli.io",
    location: "Remote",
    description: "Contract roles connecting African tech talent with remote-first companies globally. Flexible 3–12 month engagements with top clients.",
    requiredSkills: ["JavaScript", "React", "Node.js", "PostgreSQL"],
    salary: "$30–60/hour",
    jobType: "contract",
    level: "mid",
  },
];

async function ensureJobsSeeded() {
  try {
    const existing = await db.select({ id: jobs.id }).from(jobs).limit(1);
    if (existing.length === 0) {
      await db.insert(jobs).values(SEED_JOBS);
    }
  } catch {}
}

// Run seed once on module load
ensureJobsSeeded();

// GET /api/jobs — list active jobs, with match scores for authenticated users
router.get("/", async (req, res) => {
  const clerkUserId: string | undefined = (req as any).clerkUserId;

  try {
    const allJobs = await db.select().from(jobs).where(eq(jobs.isActive, true));

    let userSkills: string[] = [];
    let appliedJobIds = new Set<number>();

    if (clerkUserId) {
      const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
      if (user) {
        const skillRows = await db.select({ skill: userSkillsTable.skill }).from(userSkillsTable).where(eq(userSkillsTable.userId, user.id));
        userSkills = skillRows.map(s => s.skill.toLowerCase());

        const applications = await db.select({ jobId: jobApplications.jobId }).from(jobApplications).where(eq(jobApplications.userId, user.id));
        appliedJobIds = new Set(applications.map(a => a.jobId));
      }
    }

    const jobsWithMatch = allJobs.map(job => {
      let matchScore: number | null = null;
      if (userSkills.length > 0 && job.requiredSkills.length > 0) {
        const required = job.requiredSkills.map((s: string) => s.toLowerCase());
        const matches = required.filter((r: string) => userSkills.some((u: string) => u.includes(r) || r.includes(u)));
        matchScore = Math.round((matches.length / required.length) * 100);
      }
      return { ...job, matchScore, applied: appliedJobIds.has(job.id) };
    });

    // Sort: applied last, then by match score desc
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

// POST /api/jobs/:id/apply — apply for a job (auth required)
router.post("/:id/apply", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const jobId = Number(req.params.id);
  const { coverLetter } = req.body as { coverLetter?: string };

  if (!jobId || isNaN(jobId)) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    // Check already applied
    const [existing] = await db.select({ id: jobApplications.id })
      .from(jobApplications)
      .where(and(eq(jobApplications.userId, user.id), eq(jobApplications.jobId, jobId)))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Already applied to this job" });
      return;
    }

    const [application] = await db.insert(jobApplications).values({
      userId: user.id,
      jobId,
      status: "applied",
      coverLetter: coverLetter ?? null,
    }).returning();

    res.status(201).json({ application });
  } catch (err) {
    req.log.error({ err }, "Failed to apply for job");
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// GET /api/jobs/my-applications — user's job applications
router.get("/my-applications", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
    if (!user) {
      res.json({ applications: [] });
      return;
    }

    const apps = await db
      .select({
        id: jobApplications.id,
        jobId: jobApplications.jobId,
        status: jobApplications.status,
        appliedAt: jobApplications.appliedAt,
        title: jobs.title,
        company: jobs.company,
        location: jobs.location,
        jobType: jobs.jobType,
        level: jobs.level,
        salary: jobs.salary,
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

export default router;
