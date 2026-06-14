import { Router, type IRouter } from "express";
import { db, userMemories, usersTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getDbUser(clerkUserId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  return user;
}

// GET /api/memories
router.get("/", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;

  try {
    const user = await getDbUser(clerkUserId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const memories = await db
      .select()
      .from(userMemories)
      .where(and(eq(userMemories.userId, user.id), eq(userMemories.isActive, true)))
      .orderBy(desc(userMemories.updatedAt));

    res.json({ memories });
  } catch (err) {
    req.log.error({ err }, "Failed to load memories");
    res.status(500).json({ error: "Failed to load memories" });
  }
});

// DELETE /api/memories/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid memory id" });
    return;
  }

  try {
    const user = await getDbUser(clerkUserId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [memory] = await db
      .update(userMemories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(userMemories.id, id), eq(userMemories.userId, user.id)))
      .returning();

    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete memory");
    res.status(500).json({ error: "Failed to delete memory" });
  }
});

export default router;
