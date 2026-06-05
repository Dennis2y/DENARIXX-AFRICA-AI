import { Router, type IRouter } from "express";
import { db, waitlistTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { JoinWaitlistBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/waitlist", async (req, res) => {
  const result = JoinWaitlistBody.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({ error: "Invalid email address" });
    return;
  }

  const { email, name, userType } = result.data;

  try {
    const existing = await db
      .select({ id: waitlistTable.id })
      .from(waitlistTable)
      .where(eq(waitlistTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "This email is already on the waitlist" });
      return;
    }

    const [entry] = await db
      .insert(waitlistTable)
      .values({ email, name: name ?? null, userType: userType ?? null })
      .returning();

    req.log.info({ email }, "Waitlist signup");
    res.status(201).json({ id: entry.id, email: entry.email, message: "You're on the waitlist! We'll be in touch soon." });
  } catch (err) {
    req.log.error({ err }, "Waitlist insert failed");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
