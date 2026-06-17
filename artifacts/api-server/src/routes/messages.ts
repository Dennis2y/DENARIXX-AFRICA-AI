import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { directMessages, userBlocks } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and, or, desc, inArray } from "drizzle-orm";

const router: IRouter = Router();

async function getDbUser(clerkUserId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
  return user ?? null;
}


async function getBlockStatus(myId: number, partnerId: number) {
  const rows = await db
    .select()
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerUserId, myId), eq(userBlocks.blockedUserId, partnerId)),
        and(eq(userBlocks.blockerUserId, partnerId), eq(userBlocks.blockedUserId, myId))
      )
    );

  const blockedByMe = rows.some((row) => row.blockerUserId === myId);
  const blockedMe = rows.some((row) => row.blockerUserId === partnerId);

  return {
    blockedByMe,
    blockedMe,
    isBlocked: blockedByMe || blockedMe,
  };
}

// GET /api/messages/unread-count — total unread (must be before /:partnerId)
router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const me = await getDbUser(clerkUserId);
    if (!me) { res.json({ count: 0 }); return; }

    const rows = await db
      .select({ id: directMessages.id })
      .from(directMessages)
      .where(and(eq(directMessages.toUserId, me.id), eq(directMessages.isRead, false)));

    res.json({ count: rows.length });
  } catch {
    res.json({ count: 0 });
  }
});

// GET /api/messages/inbox — all conversations, latest message per partner
router.get("/inbox", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const me = await getDbUser(clerkUserId);
    if (!me) { res.status(404).json({ error: "User not found" }); return; }

    // Get all messages involving me
    const rows = await db
      .select()
      .from(directMessages)
      .where(or(eq(directMessages.fromUserId, me.id), eq(directMessages.toUserId, me.id)))
      .orderBy(desc(directMessages.createdAt));

    // Group by conversation partner
    const convMap = new Map<number, typeof rows[0]>();
    const unreadMap = new Map<number, number>();

    for (const msg of rows) {
      const partnerId = msg.fromUserId === me.id ? msg.toUserId : msg.fromUserId;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, msg);
      }
      if (!msg.isRead && msg.toUserId === me.id) {
        unreadMap.set(partnerId, (unreadMap.get(partnerId) ?? 0) + 1);
      }
    }

    if (convMap.size === 0) { res.json({ conversations: [] }); return; }

    // Fetch partner user info
    const partnerIds = [...convMap.keys()];
    const partners = await db
      .select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl, role: usersTable.role, lastSeenAt: usersTable.lastSeenAt })
      .from(usersTable)
      .where(inArray(usersTable.id, partnerIds));

    const partnerMap = new Map(partners.map(p => [p.id, p]));

    const conversations = partnerIds.map(partnerId => ({
      partnerId,
      partner: partnerMap.get(partnerId) ?? null,
      lastMessage: convMap.get(partnerId)!,
      unreadCount: unreadMap.get(partnerId) ?? 0,
    })).filter(c => c.partner !== null);

    res.json({ conversations });
  } catch (err) {
    req.log.error({ err }, "Failed to load inbox");
    res.status(500).json({ error: "Failed to load inbox" });
  }
});


// POST /api/messages/dev/seed — create a demo conversation for local testing
router.post("/dev/seed", requireAuth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "Dev seed disabled in production" });
      return;
    }

    const clerkUserId = (req as any).clerkUserId as string;
    const me = await getDbUser(clerkUserId);

    if (!me) {
      res.status(404).json({ error: "Current user not found in database" });
      return;
    }

    const demoClerkId = "demo-denarixx-africa-partner";
    const demoEmail = "demo.partner@denarixx.local";

    let [partner] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, demoClerkId))
      .limit(1);

    if (!partner) {
      [partner] = await db
        .insert(usersTable)
        .values({
          clerkUserId: demoClerkId,
          email: demoEmail,
          name: "Ama Denarixx",
          role: "AI Career Mentor",
          bio: "Demo Denarixx Africa AI partner for testing messages, calls, profiles, and community features.",
          location: "Accra, Ghana",
          userType: "mentor",
        })
        .returning();
    }

    const existing = await db
      .select({ id: directMessages.id })
      .from(directMessages)
      .where(
        or(
          and(eq(directMessages.fromUserId, me.id), eq(directMessages.toUserId, partner.id)),
          and(eq(directMessages.fromUserId, partner.id), eq(directMessages.toUserId, me.id))
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(directMessages).values([
        {
          fromUserId: partner.id,
          toUserId: me.id,
          content: "Hi, welcome to Denarixx Africa AI. This is a demo conversation for testing messages and LiveKit calls.",
        },
        {
          fromUserId: me.id,
          toUserId: partner.id,
          content: "Great. I want to test chat, audio call, video call, profile view, and community networking.",
        },
      ]);
    }

    res.json({ success: true, partnerId: partner.id });
  } catch (err) {
    req.log.error({ err }, "Failed to seed demo conversation");
    res.status(500).json({ error: "Failed to seed demo conversation" });
  }
});


// GET /api/messages/:partnerId/block-status — check if either side blocked
router.get("/:partnerId/block-status", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    if (isNaN(partnerId)) { res.status(400).json({ error: "Invalid partnerId" }); return; }

    const me = await getDbUser(clerkUserId);
    if (!me) { res.status(404).json({ error: "User not found" }); return; }

    const status = await getBlockStatus(me.id, partnerId);
    res.json(status);
  } catch (err) {
    req.log.error({ err }, "Failed to get block status");
    res.status(500).json({ error: "Failed to get block status" });
  }
});

// POST /api/messages/:partnerId/block — block a user
router.post("/:partnerId/block", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    if (isNaN(partnerId)) { res.status(400).json({ error: "Invalid partnerId" }); return; }

    const me = await getDbUser(clerkUserId);
    if (!me) { res.status(404).json({ error: "User not found" }); return; }
    if (me.id === partnerId) { res.status(400).json({ error: "Cannot block yourself" }); return; }

    await db
      .insert(userBlocks)
      .values({ blockerUserId: me.id, blockedUserId: partnerId })
      .onConflictDoNothing();

    res.json({ success: true, blockedByMe: true, blockedMe: false, isBlocked: true });
  } catch (err) {
    req.log.error({ err }, "Failed to block user");
    res.status(500).json({ error: "Failed to block user" });
  }
});

// DELETE /api/messages/:partnerId/block — unblock a user
router.delete("/:partnerId/block", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    if (isNaN(partnerId)) { res.status(400).json({ error: "Invalid partnerId" }); return; }

    const me = await getDbUser(clerkUserId);
    if (!me) { res.status(404).json({ error: "User not found" }); return; }

    await db
      .delete(userBlocks)
      .where(and(eq(userBlocks.blockerUserId, me.id), eq(userBlocks.blockedUserId, partnerId)));

    const status = await getBlockStatus(me.id, partnerId);
    res.json({ success: true, ...status });
  } catch (err) {
    req.log.error({ err }, "Failed to unblock user");
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

// GET /api/messages/:partnerId — thread with a user
router.get("/:partnerId", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    if (isNaN(partnerId)) { res.status(400).json({ error: "Invalid partnerId" }); return; }

    const me = await getDbUser(clerkUserId);
    if (!me) { res.status(404).json({ error: "User not found" }); return; }

    const msgs = await db
      .select()
      .from(directMessages)
      .where(
        or(
          and(eq(directMessages.fromUserId, me.id), eq(directMessages.toUserId, partnerId)),
          and(eq(directMessages.fromUserId, partnerId), eq(directMessages.toUserId, me.id))
        )
      )
      .orderBy(directMessages.createdAt);

    const [partner] = await db
      .select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl, role: usersTable.role, lastSeenAt: usersTable.lastSeenAt })
      .from(usersTable)
      .where(eq(usersTable.id, partnerId))
      .limit(1);

    // Mark messages from partner as read
    await db
      .update(directMessages)
      .set({ isRead: true })
      .where(and(eq(directMessages.fromUserId, partnerId), eq(directMessages.toUserId, me.id), eq(directMessages.isRead, false)));

    const blockStatus = await getBlockStatus(me.id, partnerId);

    res.json({ messages: msgs, partner: partner ?? null, myId: me.id, blockStatus });
  } catch (err) {
    req.log.error({ err }, "Failed to load messages");
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// POST /api/messages/:partnerId — send a message
router.post("/:partnerId", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    if (isNaN(partnerId)) { res.status(400).json({ error: "Invalid partnerId" }); return; }

    const { content, jobApplicationId } = req.body as { content?: string; jobApplicationId?: number };
    if (!content || typeof content !== "string" || content.trim().length === 0 || content.length > 2000) {
      res.status(400).json({ error: "Message content required (1-2000 chars)" }); return;
    }

    const me = await getDbUser(clerkUserId);
    if (!me) { res.status(404).json({ error: "User not found" }); return; }
    if (me.id === partnerId) { res.status(400).json({ error: "Cannot message yourself" }); return; }

    const blockStatus = await getBlockStatus(me.id, partnerId);
    if (blockStatus.blockedByMe) {
      res.status(403).json({ error: "You blocked this user. Unblock them before sending messages." });
      return;
    }
    if (blockStatus.blockedMe) {
      res.status(403).json({ error: "You cannot message this user." });
      return;
    }

    const [msg] = await db.insert(directMessages).values({
      fromUserId: me.id,
      toUserId: partnerId,
      content: content.trim(),
      jobApplicationId: typeof jobApplicationId === "number" ? jobApplicationId : null,
    }).returning();

    res.status(201).json({ message: msg });
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Failed to send message" });
  }
});



// DELETE /api/messages/:partnerId — clear thread with a user
router.delete("/:partnerId", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);

    if (isNaN(partnerId)) {
      res.status(400).json({ error: "Invalid partnerId" });
      return;
    }

    const me = await getDbUser(clerkUserId);

    if (!me) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await db
      .delete(directMessages)
      .where(
        or(
          and(eq(directMessages.fromUserId, me.id), eq(directMessages.toUserId, partnerId)),
          and(eq(directMessages.fromUserId, partnerId), eq(directMessages.toUserId, me.id))
        )
      );

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to clear messages");
    res.status(500).json({ error: "Failed to clear messages" });
  }
});

export default router;
