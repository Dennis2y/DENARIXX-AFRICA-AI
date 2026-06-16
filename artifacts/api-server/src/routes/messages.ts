import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { directMessages } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and, or, desc, inArray } from "drizzle-orm";

const router: IRouter = Router();

async function getDbUser(clerkUserId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
  return user ?? null;
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
      .select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl, role: usersTable.role })
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
      .select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, partnerId))
      .limit(1);

    // Mark messages from partner as read
    await db
      .update(directMessages)
      .set({ isRead: true })
      .where(and(eq(directMessages.fromUserId, partnerId), eq(directMessages.toUserId, me.id), eq(directMessages.isRead, false)));

    res.json({ messages: msgs, partner: partner ?? null, myId: me.id });
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
