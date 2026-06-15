import { Router, type IRouter } from "express";
import { db, artifacts, usersTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
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
  const clerkUserId = (req as any).clerkUserId as string;

  try {
    const userId = await getCurrentUserId(clerkUserId);

    if (!userId) {
      res.json({ artifacts: [] });
      return;
    }

    const rows = await db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.userId, userId), eq(artifacts.isActive, true)))
      .orderBy(desc(artifacts.updatedAt))
      .limit(100);

    res.json({ artifacts: rows });
  } catch (err) {
    req.log.error({ err }, "Failed to list artifacts");
    res.status(500).json({ error: "Failed to list artifacts" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const artifactId = Number(req.params.id);

  try {
    const userId = await getCurrentUserId(clerkUserId);

    if (!userId) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    const [artifact] = await db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.id, artifactId), eq(artifacts.userId, userId), eq(artifacts.isActive, true)))
      .limit(1);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    res.json({ artifact });
  } catch (err) {
    req.log.error({ err }, "Failed to load artifact");
    res.status(500).json({ error: "Failed to load artifact" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const { title, type, content } = req.body as {
    title?: string;
    type?: string;
    content?: string;
  };

  const cleanTitle = (title || "Untitled artifact").trim().slice(0, 120);
  const cleanType = (type || "document").trim().slice(0, 40);
  const cleanContent = (content || "").trim();

  if (!cleanContent) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    const userId = await getCurrentUserId(clerkUserId);

    if (!userId) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const [artifact] = await db
      .insert(artifacts)
      .values({
        userId,
        title: cleanTitle,
        type: cleanType,
        content: cleanContent,
      })
      .returning();

    res.status(201).json({ artifact });
  } catch (err) {
    req.log.error({ err }, "Failed to create artifact");
    res.status(500).json({ error: "Failed to create artifact" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const artifactId = Number(req.params.id);
  const { title, type, content } = req.body as {
    title?: string;
    type?: string;
    content?: string;
  };

  try {
    const userId = await getCurrentUserId(clerkUserId);

    if (!userId) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.id, artifactId), eq(artifacts.userId, userId), eq(artifacts.isActive, true)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    const updateData: Partial<typeof artifacts.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title.trim().slice(0, 120) || existing.title;
    if (type !== undefined) updateData.type = type.trim().slice(0, 40) || existing.type;
    if (content !== undefined) updateData.content = content;

    const [artifact] = await db
      .update(artifacts)
      .set(updateData)
      .where(eq(artifacts.id, artifactId))
      .returning();

    res.json({ artifact });
  } catch (err) {
    req.log.error({ err }, "Failed to update artifact");
    res.status(500).json({ error: "Failed to update artifact" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).clerkUserId as string;
  const artifactId = Number(req.params.id);

  try {
    const userId = await getCurrentUserId(clerkUserId);

    if (!userId) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.id, artifactId), eq(artifacts.userId, userId), eq(artifacts.isActive, true)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    await db
      .update(artifacts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(artifacts.id, artifactId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete artifact");
    res.status(500).json({ error: "Failed to delete artifact" });
  }
});

export default router;
