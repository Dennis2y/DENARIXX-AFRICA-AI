import { Router, type IRouter } from "express";
import { db, usersTable, skillListingsTable, skillConnectionsTable, userSkillsTable } from "@workspace/db";
import { eq, and, ne, desc, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Helper: resolve internal userId from clerkUserId
async function resolveUserId(clerkUserId: string): Promise<number | null> {
  const rows = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
  return rows[0]?.id ?? null;
}

// GET /api/skillswap/listings — browse all active listings (public)
router.get("/listings", async (req, res) => {
  try {
    const { type, category, q } = req.query as Record<string, string | undefined>;

    const rows = await db
      .select({
        id: skillListingsTable.id,
        skillName: skillListingsTable.skillName,
        category: skillListingsTable.category,
        listingType: skillListingsTable.listingType,
        description: skillListingsTable.description,
        level: skillListingsTable.level,
        availability: skillListingsTable.availability,
        createdAt: skillListingsTable.createdAt,
        userId: skillListingsTable.userId,
        userName: usersTable.name,
        userAvatar: usersTable.avatarUrl,
        userLocation: usersTable.location,
        userRole: usersTable.role,
      })
      .from(skillListingsTable)
      .innerJoin(usersTable, eq(skillListingsTable.userId, usersTable.id))
      .where(eq(skillListingsTable.isActive, true))
      .orderBy(desc(skillListingsTable.createdAt));

    let filtered = rows;
    if (type) filtered = filtered.filter(r => r.listingType === type);
    if (category) filtered = filtered.filter(r => r.category.toLowerCase() === category.toLowerCase());
    if (q) {
      const lq = q.toLowerCase();
      filtered = filtered.filter(r =>
        r.skillName.toLowerCase().includes(lq) ||
        (r.description ?? "").toLowerCase().includes(lq)
      );
    }

    res.json({ listings: filtered, total: filtered.length });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch skill listings");
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// POST /api/skillswap/listings — create a listing (auth required)
router.post("/listings", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const userId = await resolveUserId(clerkUserId);
    if (!userId) {
      res.status(404).json({ error: "User not found. Please visit your profile first." });
      return;
    }

    const { skillName, category, listingType, description, level, availability } = req.body;
    if (!skillName || typeof skillName !== "string") {
      res.status(422).json({ error: "skillName is required" });
      return;
    }
    if (!["offering", "seeking"].includes(listingType)) {
      res.status(422).json({ error: "listingType must be 'offering' or 'seeking'" });
      return;
    }

    const [listing] = await db
      .insert(skillListingsTable)
      .values({
        userId,
        skillName: skillName.trim(),
        category: (category ?? "General").trim(),
        listingType,
        description: description ?? null,
        level: level ?? "intermediate",
        availability: availability ?? null,
      })
      .returning();

    res.status(201).json({ listing });
  } catch (err) {
    req.log.error({ err }, "Failed to create skill listing");
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// DELETE /api/skillswap/listings/:id — delete own listing
router.delete("/listings/:id", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const userId = await resolveUserId(clerkUserId);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const listingId = Number(req.params.id);
    const [listing] = await db.select().from(skillListingsTable).where(
      and(eq(skillListingsTable.id, listingId), eq(skillListingsTable.userId, userId))
    ).limit(1);

    if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

    await db.update(skillListingsTable).set({ isActive: false }).where(eq(skillListingsTable.id, listingId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete skill listing");
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

// GET /api/skillswap/my-listings — my own listings (auth required)
router.get("/my-listings", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const userId = await resolveUserId(clerkUserId);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const listings = await db.select().from(skillListingsTable)
      .where(eq(skillListingsTable.userId, userId))
      .orderBy(desc(skillListingsTable.createdAt));

    res.json({ listings });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch my listings");
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// GET /api/skillswap/matches — AI-powered match suggestions (auth required)
router.get("/matches", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const userId = await resolveUserId(clerkUserId);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    // Get current user's skills
    const mySkills = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));
    const myListings = await db.select().from(skillListingsTable)
      .where(and(eq(skillListingsTable.userId, userId), eq(skillListingsTable.isActive, true)));

    // Get all other active listings from other users
    const otherListings = await db
      .select({
        id: skillListingsTable.id,
        skillName: skillListingsTable.skillName,
        category: skillListingsTable.category,
        listingType: skillListingsTable.listingType,
        description: skillListingsTable.description,
        level: skillListingsTable.level,
        availability: skillListingsTable.availability,
        createdAt: skillListingsTable.createdAt,
        userId: skillListingsTable.userId,
        userName: usersTable.name,
        userAvatar: usersTable.avatarUrl,
        userLocation: usersTable.location,
        userRole: usersTable.role,
      })
      .from(skillListingsTable)
      .innerJoin(usersTable, eq(skillListingsTable.userId, usersTable.id))
      .where(and(eq(skillListingsTable.isActive, true), ne(skillListingsTable.userId, userId)))
      .orderBy(desc(skillListingsTable.createdAt));

    if (otherListings.length === 0) {
      res.json({ matches: [], reason: "No other listings available yet." });
      return;
    }

    // Use OpenAI to rank matches
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey || otherListings.length === 0) {
      res.json({ matches: otherListings.slice(0, 6), reason: "Browse-based matches" });
      return;
    }

    const { openai } = require("@workspace/integrations-openai-ai-server");

    const prompt = `You are a skill-matching AI for Denarixx Africa AI platform.

User's skills: ${mySkills.map(s => `${s.skill} (${s.level})`).join(", ") || "none listed"}
User's listings: ${myListings.map(l => `${l.listingType} ${l.skillName}`).join(", ") || "none"}

Available listings from other users (JSON):
${JSON.stringify(otherListings.map(l => ({ id: l.id, type: l.listingType, skill: l.skillName, level: l.level, user: l.userName })))}

Return a JSON array of the top 6 listing IDs in match order, most relevant first. Format: { "matches": [id1, id2, ...] }
Only return valid JSON, no other text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    let rankedIds: number[] = [];
    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      rankedIds = (parsed.matches ?? []).map(Number).filter(Boolean);
    } catch {
      rankedIds = otherListings.slice(0, 6).map(l => l.id);
    }

    const idSet = new Set(rankedIds);
    const rankedListings = [
      ...rankedIds.map(id => otherListings.find(l => l.id === id)).filter(Boolean),
      ...otherListings.filter(l => !idSet.has(l.id)),
    ].slice(0, 8) as typeof otherListings;

    res.json({ matches: rankedListings, reason: "AI-powered matches based on your skills and goals" });
  } catch (err) {
    req.log.error({ err }, "Failed to get matches");
    res.status(500).json({ error: "Failed to get matches" });
  }
});

// POST /api/skillswap/connections — send a connection request (auth required)
router.post("/connections", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const requesterId = await resolveUserId(clerkUserId);
    if (!requesterId) { res.status(404).json({ error: "User not found" }); return; }

    const { targetUserId, listingId, message } = req.body;
    if (!targetUserId) { res.status(422).json({ error: "targetUserId is required" }); return; }
    if (targetUserId === requesterId) { res.status(422).json({ error: "Cannot connect with yourself" }); return; }

    const [connection] = await db
      .insert(skillConnectionsTable)
      .values({ requesterId, targetId: targetUserId, listingId: listingId ?? null, message: message ?? null })
      .returning();

    res.status(201).json({ connection });
  } catch (err) {
    req.log.error({ err }, "Failed to create connection");
    res.status(500).json({ error: "Failed to send connection request" });
  }
});

// GET /api/skillswap/connections — my connections (auth required)
router.get("/connections", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const userId = await resolveUserId(clerkUserId);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const connections = await db
      .select({
        id: skillConnectionsTable.id,
        status: skillConnectionsTable.status,
        message: skillConnectionsTable.message,
        createdAt: skillConnectionsTable.createdAt,
        listingId: skillConnectionsTable.listingId,
        requesterId: skillConnectionsTable.requesterId,
        targetId: skillConnectionsTable.targetId,
      })
      .from(skillConnectionsTable)
      .where(
        or(
          eq(skillConnectionsTable.requesterId, userId),
          eq(skillConnectionsTable.targetId, userId)
        )
      )
      .orderBy(desc(skillConnectionsTable.createdAt));

    res.json({ connections });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch connections");
    res.status(500).json({ error: "Failed to fetch connections" });
  }
});

// PATCH /api/skillswap/connections/:id — accept or decline (auth required)
router.patch("/connections/:id", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  try {
    const userId = await resolveUserId(clerkUserId);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const connId = Number(req.params.id);
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status)) {
      res.status(422).json({ error: "status must be 'accepted' or 'declined'" });
      return;
    }

    const [conn] = await db.select().from(skillConnectionsTable)
      .where(and(eq(skillConnectionsTable.id, connId), eq(skillConnectionsTable.targetId, userId)))
      .limit(1);

    if (!conn) { res.status(404).json({ error: "Connection not found" }); return; }

    const [updated] = await db.update(skillConnectionsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(skillConnectionsTable.id, connId))
      .returning();

    res.json({ connection: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update connection");
    res.status(500).json({ error: "Failed to update connection" });
  }
});

export default router;
