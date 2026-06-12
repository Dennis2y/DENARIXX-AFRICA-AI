import { Router, type IRouter } from "express";
import { db, usersTable, userSkillsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /api/users/me — get current user profile (JIT provision if new)
router.get("/me", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);

    if (existing.length > 0) {
      const skills = await db
        .select()
        .from(userSkillsTable)
        .where(eq(userSkillsTable.userId, existing[0].id));
      res.json({ ...existing[0], skills });
      return;
    }

    // JIT provision — create user row on first access
    const { getAuth } = await import("@clerk/express");
    const auth = getAuth(req);
    const email = (auth as any)?.sessionClaims?.email ?? "";
    const name = (auth as any)?.sessionClaims?.name ?? null;

    const [created] = await db
      .insert(usersTable)
      .values({ clerkUserId, email, name })
      .returning();

    res.status(201).json({ ...created, skills: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to get user");
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// PATCH /api/users/me — update current user profile
router.patch("/me", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { name, bio, location, website, twitterHandle, linkedinUrl, githubHandle, role, country, avatarUrl } = req.body;

  try {
    const [updated] = await db
      .update(usersTable)
      .set({
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        ...(twitterHandle !== undefined && { twitterHandle }),
        ...(linkedinUrl !== undefined && { linkedinUrl }),
        ...(githubHandle !== undefined && { githubHandle }),
        ...(role !== undefined && { role }),
        ...(country !== undefined && { country }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update user");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// PUT /api/users/me/skills — replace skill list
router.put("/me/skills", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { skills } = req.body as { skills: Array<{ skill: string; level: string }> };

  if (!Array.isArray(skills)) {
    res.status(400).json({ error: "skills must be an array" });
    return;
  }

  try {
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await db.delete(userSkillsTable).where(eq(userSkillsTable.userId, user.id));

    if (skills.length > 0) {
      await db.insert(userSkillsTable).values(
        skills.map((s) => ({ userId: user.id, skill: s.skill, level: s.level ?? "beginner" }))
      );
    }

    const updated = await db
      .select()
      .from(userSkillsTable)
      .where(eq(userSkillsTable.userId, user.id));

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update skills");
    res.status(500).json({ error: "Failed to update skills" });
  }
});

export default router;
