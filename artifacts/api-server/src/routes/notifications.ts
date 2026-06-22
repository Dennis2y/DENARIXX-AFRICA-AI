import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, notifications, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getCurrentUserId(clerkUserId: string) {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  return user?.id ?? null;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = await getCurrentUserId((req as any).clerkUserId as string);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    res.json({ notifications: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch notifications");
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const userId = await getCurrentUserId((req as any).clerkUserId as string);
    if (!userId) { res.json({ count: 0 }); return; }

    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    res.json({ count: row?.count ?? 0 });
  } catch {
    res.json({ count: 0 });
  }
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = await getCurrentUserId((req as any).clerkUserId as string);
    const notificationId = Number(req.params.id);

    if (!userId) { res.status(404).json({ error: "User not found" }); return; }
    if (!notificationId || isNaN(notificationId)) { res.status(400).json({ error: "Invalid notification ID" }); return; }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Notification not found" }); return; }

    res.json({ notification: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification read");
    res.status(500).json({ error: "Failed to update notification" });
  }
});

router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    const userId = await getCurrentUserId((req as any).clerkUserId as string);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark all notifications read");
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

export default router;
