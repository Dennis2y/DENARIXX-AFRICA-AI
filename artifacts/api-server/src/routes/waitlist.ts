import { Router, type IRouter } from "express";
import { db, waitlistTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { JoinWaitlistBody } from "@workspace/api-zod";
import { randomBytes } from "crypto";
import { sendWelcomeEmail } from "../email";

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

    // Fire welcome email without blocking the response
    sendWelcomeEmail({
      name: name ?? null,
      email,
      referralCode: entry.referralCode!,
      referredByCode: referredBy ?? null,
    }).catch((err) => req.log.warn({ err }, "Welcome email failed (non-fatal)"));

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

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local[0]}***@${domain}`;
}

function formatDisplayName(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) return `${parts[0]} ${parts[1][0]}.`;
    return parts[0];
  }
  const localPart = email.split("@")[0];
  return localPart.length > 6 ? localPart.slice(0, 6) + "…" : localPart;
}

router.get("/waitlist/leaderboard", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        w.name,
        w.email,
        w.referral_code,
        COUNT(r.id)::int AS referral_count
      FROM waitlist w
      INNER JOIN waitlist r ON r.referred_by = w.referral_code
      GROUP BY w.id, w.name, w.email, w.referral_code
      ORDER BY referral_count DESC
      LIMIT 20
    `);

    const rows = result.rows as Array<Record<string, unknown>>;
    const entries = rows.map((row, i) => ({
      rank: i + 1,
      displayName: formatDisplayName(row.name as string | null, row.email as string),
      maskedEmail: maskEmail(row.email as string),
      referralCount: Number(row.referral_count),
      referralCode: row.referral_code as string,
    }));

    res.json({ entries, total: entries.length });
  } catch (err) {
    req.log.error({ err }, "Leaderboard fetch failed");
    res.status(500).json({ error: "Something went wrong." });
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
