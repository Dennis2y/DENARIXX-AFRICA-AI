import { Router } from "express";
import { db, resumes, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

async function getDbUser(clerkUserId: string) {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  return user ?? null;
}

// GET /api/resumes — list all active resumes for current user, newest first
router.get("/", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const user = await getDbUser(clerkUserId);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const rows = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.userId, user.id), eq(resumes.isActive, true)))
      .orderBy(desc(resumes.createdAt));
    res.json({ resumes: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to list resumes");
    res.status(500).json({ error: "Failed to load resumes" });
  }
});

// GET /api/resumes/latest — most recent active resume (used by Jobs AI)
router.get("/latest", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const user = await getDbUser(clerkUserId);
    if (!user) { res.json({ resume: null }); return; }
    const [row] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.userId, user.id), eq(resumes.isActive, true)))
      .orderBy(desc(resumes.createdAt))
      .limit(1);
    res.json({ resume: row ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to get latest resume");
    res.status(500).json({ error: "Failed to load resume" });
  }
});

// POST /api/resumes — save a new resume version
router.post("/", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { title, resumeMarkdown, coverLetterMarkdown, targetRole, targetCompany, tone, language, formSnapshot } = req.body;
  if (!resumeMarkdown?.trim()) {
    res.status(400).json({ error: "resumeMarkdown is required" }); return;
  }
  try {
    const user = await getDbUser(clerkUserId);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
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
    res.status(201).json({ resume: created });
  } catch (err) {
    req.log.error({ err }, "Failed to save resume");
    res.status(500).json({ error: "Failed to save resume" });
  }
});

// PATCH /api/resumes/:id — update a resume (title, content, etc.)
router.patch("/:id", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const user = await getDbUser(clerkUserId);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
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
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ resume: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update resume");
    res.status(500).json({ error: "Failed to update resume" });
  }
});

// DELETE /api/resumes/:id — soft delete
router.delete("/:id", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const user = await getDbUser(clerkUserId);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const [row] = await db
      .update(resumes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete resume");
    res.status(500).json({ error: "Failed to delete resume" });
  }
});

export default router;
