import { Router, type IRouter } from "express";
import { db, waitlistTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { JoinWaitlistBody } from "@workspace/api-zod";
import { randomBytes } from "crypto";

const router: IRouter = Router();

function generateCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

router.get("/waitlist/count", async (req, res) => {
  try {
    const [{ value }] = await db.select({ value: count() }).from(waitlistTable);
    res.json({ count: value });
  } catch (err) {
    req.log.error({ err }, "Waitlist count failed");
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.get("/waitlist/referrals/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const owner = await db
      .select({ id: waitlistTable.id })
      .from(waitlistTable)
      .where(eq(waitlistTable.referralCode, code))
      .limit(1);

    if (owner.length === 0) {
      res.status(404).json({ error: "Referral code not found" });
      return;
    }

    const [{ value: referralCount }] = await db
      .select({ value: count() })
      .from(waitlistTable)
      .where(eq(waitlistTable.referredBy, code));

    res.json({ code, referralCount: referralCount });
  } catch (err) {
    req.log.error({ err }, "Waitlist referrals fetch failed");
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.post("/waitlist", async (req, res) => {
  const result = JoinWaitlistBody.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({ error: "Invalid email address" });
    return;
  }

  const { email, name, userType, country, referredBy } = result.data;

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

    let referralCode: string;
    let attempts = 0;
    while (true) {
      referralCode = generateCode();
      const conflict = await db
        .select({ id: waitlistTable.id })
        .from(waitlistTable)
        .where(eq(waitlistTable.referralCode, referralCode))
        .limit(1);
      if (conflict.length === 0) break;
      if (++attempts > 10) throw new Error("Could not generate unique referral code");
    }

    const [entry] = await db
      .insert(waitlistTable)
      .values({
        email,
        name: name ?? null,
        userType: userType ?? null,
        country: country ?? null,
        referralCode,
        referredBy: referredBy ?? null,
      })
      .returning();

    req.log.info({ email, country, referredBy }, "Waitlist signup");
    res.status(201).json({
      id: entry.id,
      email: entry.email,
      message: "You're on the waitlist! We'll be in touch soon.",
      referralCode: entry.referralCode!,
    });
  } catch (err) {
    req.log.error({ err }, "Waitlist insert failed");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.get("/waitlist", async (req, res) => {
  try {
    const entries = await db
      .select()
      .from(waitlistTable)
      .orderBy(desc(waitlistTable.createdAt));

    res.json({ entries, total: entries.length });
  } catch (err) {
    req.log.error({ err }, "Waitlist fetch failed");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

export default router;
