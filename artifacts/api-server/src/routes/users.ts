import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, usersTable, userSkillsTable, pushTokens } from "@workspace/db";
import { eq, and, or, ilike, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { clerkClient } from "@clerk/express";

const router: IRouter = Router();

const avatarDir = path.resolve(process.cwd(), "uploads/avatars");
fs.mkdirSync(avatarDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: avatarDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});


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

    // JIT provision — create/update user row from Clerk on first access
    const clerk = await clerkClient.users.getUser(clerkUserId);
    const email = clerk.emailAddresses?.[0]?.emailAddress ?? `${clerkUserId}@denarixx.local`;
    const name =
      clerk.fullName ||
      [clerk.firstName, clerk.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0];

    const [created] = await db
      .insert(usersTable)
      .values({
        clerkUserId,
        email,
        name,
        avatarUrl: clerk.imageUrl || null,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          clerkUserId,
          name,
          avatarUrl: clerk.imageUrl || null,
          lastSeenAt: new Date(),
        },
      })
      .returning();

    res.status(201).json({ ...created, skills: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to get user");
    res.status(500).json({ error: "Failed to load profile" });
  }
});


// GET /api/users/search?q=term — search users to start conversations
router.get("/search", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const q = String(req.query.q ?? "").trim();

  if (q.length < 2) {
    res.json({ users: [] });
    return;
  }

  try {
    const [me] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);

    if (!me) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const pattern = `%${q}%`;

    const rows = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        avatarUrl: usersTable.avatarUrl,
        role: usersTable.role,
        location: usersTable.location,
        userType: usersTable.userType,
      })
      .from(usersTable)
      .where(
        and(
          ne(usersTable.id, me.id),
          or(
            ilike(usersTable.name, pattern),
            ilike(usersTable.role, pattern),
            ilike(usersTable.location, pattern),
            ilike(usersTable.email, pattern)
          )
        )
      )
      .limit(12);

    res.json({ users: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to search users");
    res.status(500).json({ error: "Failed to search users" });
  }
});



// POST /api/users/me/avatar — local profile image upload
router.post("/me/avatar", requireAuth, avatarUpload.single("avatar"), async (req, res) => {
  console.log("🔥 AVATAR ROUTE HIT", {
    hasFile: Boolean(req.file),
    file: req.file?.filename,
    contentType: req.headers["content-type"],
  });

  const clerkUserId = (req as any).clerkUserId as string;

  try {
    if (!req.file) {
      res.status(400).json({ error: "Avatar file is required" });
      return;
    }

    const avatarUrl = `http://localhost:3000/uploads/avatars/${req.file.filename}`;

    const [updated] = await db
      .update(usersTable)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ ok: true, avatarUrl, user: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to upload avatar");
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});


// PATCH /api/users/me — update current user profile
router.patch("/me", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { name, bio, location, website, twitterHandle, linkedinUrl, githubHandle, role, country, avatarUrl, userType, emailNotifications } = req.body;

  // userType can be set to "employer" by the user themselves;
  // "admin" can only be set by someone already with userType="admin"
  const SELF_ALLOWED_TYPES = ["candidate", "employer"];

  try {
    let resolvedUserType: string | undefined = undefined;
    if (userType !== undefined) {
      if (!SELF_ALLOWED_TYPES.includes(userType)) {
        // Check if the requesting user is already an admin
        const [existing] = await db.select({ userType: usersTable.userType }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
        if (!existing || existing.userType !== "admin") {
          res.status(403).json({ error: "Cannot set this userType" });
          return;
        }
      }
      resolvedUserType = userType;
    }

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
        ...(resolvedUserType !== undefined && { userType: resolvedUserType }),
        ...(emailNotifications !== undefined && { emailNotifications: Boolean(emailNotifications) }),
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

// POST /api/users/push-token — register or refresh a device push token
router.post("/push-token", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { token, platform } = req.body as { token?: string; platform?: string };

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
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

    await db
      .insert(pushTokens)
      .values({ userId: user.id, token, platform: platform ?? null })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { userId: user.id, platform: platform ?? null },
      });

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to register push token");
    res.status(500).json({ error: "Failed to register push token" });
  }
});

// DELETE /api/users/push-token — remove a device push token on logout
router.delete("/push-token", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { token } = req.body as { token?: string };

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
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

    await db
      .delete(pushTokens)
      .where(and(eq(pushTokens.token, token), eq(pushTokens.userId, user.id)));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to remove push token");
    res.status(500).json({ error: "Failed to remove push token" });
  }
});


// GET /api/users/:id/public — public profile for community/member views
router.get("/:id/public", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isFinite(userId)) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }

    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        bio: usersTable.bio,
        location: usersTable.location,
        website: usersTable.website,
        twitterHandle: usersTable.twitterHandle,
        linkedinUrl: usersTable.linkedinUrl,
        githubHandle: usersTable.githubHandle,
        avatarUrl: usersTable.avatarUrl,
        userType: usersTable.userType,
        reputationScore: usersTable.reputationScore,
        lastSeenAt: usersTable.lastSeenAt,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const skills = await db
      .select()
      .from(userSkillsTable)
      .where(eq(userSkillsTable.userId, userId));

    res.json({ user: { ...user, skills } });
  } catch (err) {
    req.log.error({ err }, "Failed to load public profile");
    res.status(500).json({ error: "Failed to load public profile" });
  }
});

export default router;
