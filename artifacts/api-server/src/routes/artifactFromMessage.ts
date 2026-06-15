import { Router, type Request, type Response } from "express";
import { db, artifacts, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, type } = req.body as {
      title?: string;
      content?: string;
      type?: string;
    };

    const cleanContent = (content || "").trim();

    if (!cleanContent) {
      res.status(400).json({ error: "content required" });
      return;
    }

    const clerkUserId = (req as any).clerkUserId as string;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "user not found" });
      return;
    }

    const [artifact] = await db
      .insert(artifacts)
      .values({
        userId: user.id,
        title: (title || "DENA Artifact").trim().slice(0, 120),
        type: (type || "document").trim().slice(0, 40),
        content: cleanContent,
      })
      .returning();

    res.json({ artifact });
  } catch (err) {
    req.log.error({ err }, "Failed to create artifact from message");
    res.status(500).json({ error: "Failed to create artifact" });
  }
});

export default router;
