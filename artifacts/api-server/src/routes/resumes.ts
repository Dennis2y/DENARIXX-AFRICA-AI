import { Router } from "express";
import { db, resumes } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/resumes — list all active resumes for current user, newest first
router.get("/", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const rows = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, user.id), eq(resumes.isActive, true)))
    .orderBy(desc(resumes.createdAt));
  return res.json({ resumes: rows });
});

// GET /api/resumes/latest — most recent active resume (used by Jobs AI)
router.get("/latest", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, user.id), eq(resumes.isActive, true)))
    .orderBy(desc(resumes.createdAt))
    .limit(1);
  return res.json({ resume: row ?? null });
});

// POST /api/resumes — save a new resume version
router.post("/", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const { title, resumeMarkdown, coverLetterMarkdown, targetRole, targetCompany, tone, language, formSnapshot } = req.body;
  if (!resumeMarkdown?.trim()) {
    return res.status(400).json({ error: "resumeMarkdown is required" });
  }

  const autoTitle = title ?? (targetRole ? `${targetRole} CV` : "My CV");

  const [created] = await db
    .insert(resumes)
    .values({
      userId: user.id,
      title: autoTitle,
      resumeMarkdown,
      coverLetterMarkdown: coverLetterMarkdown ?? null,
      targetRole: targetRole ?? null,
      targetCompany: targetCompany ?? null,
      tone: tone ?? null,
      language: language ?? "English",
      formSnapshot: formSnapshot ?? null,
    })
    .returning();

  return res.status(201).json({ resume: created });
});

// PATCH /api/resumes/:id — update a resume (title, content, etc.)
router.patch("/:id", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const allowed = ["title", "resumeMarkdown", "coverLetterMarkdown", "targetRole", "targetCompany", "tone", "language", "formSnapshot"] as const;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [updated] = await db
    .update(resumes)
    .set(updates)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json({ resume: updated });
});

// DELETE /api/resumes/:id — soft delete
router.delete("/:id", requireAuth, async (req, res) => {
  const user = (req as any).dbUser;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [row] = await db
    .update(resumes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
    .returning();

  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ ok: true });
});

export default router;
