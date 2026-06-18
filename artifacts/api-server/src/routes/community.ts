import { Router, type IRouter } from "express";
import { db, usersTable, userSkillsTable } from "@workspace/db";
import { eq, isNotNull, desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/community/members — list users with public profile info
router.get("/members", async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        role: usersTable.role,
        bio: usersTable.bio,
        location: usersTable.location,
        avatarUrl: usersTable.avatarUrl,
        reputationScore: usersTable.reputationScore,
        lastSeenAt: usersTable.lastSeenAt,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.reputationScore))
      .limit(50);

    // Attach skills for each user (fetch all, filter in JS — max 50 users)
    const allSkills = users.length > 0
      ? await db
          .select({ userId: userSkillsTable.userId, skill: userSkillsTable.skill, level: userSkillsTable.level })
          .from(userSkillsTable)
      : [];

    // Build skill map
    const skillMap: Record<number, { skill: string; level: string }[]> = {};
    for (const row of allSkills) {
      if (!skillMap[row.userId]) skillMap[row.userId] = [];
      skillMap[row.userId].push({ skill: row.skill, level: row.level });
    }

    const members = users.map(u => ({
      ...u,
      skills: skillMap[u.id] ?? [],
    }));

    res.json({ members, total: members.length });
  } catch (err) {
    req.log.error({ err }, "Failed to list community members");
    res.status(500).json({ error: "Failed to load members" });
  }
});

export default router;
