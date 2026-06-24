import { Router, type IRouter, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, usersTable } from "@workspace/db";
import { directMessages, userBlocks } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { eq, and, or, desc, inArray } from "drizzle-orm";
import { jobApplications, jobs } from "@workspace/db/schema";

const router: IRouter = Router();

const messageUploadDir = path.resolve(process.cwd(), "uploads/messages");
fs.mkdirSync(messageUploadDir, { recursive: true });

const messageUpload = multer({
  storage: multer.diskStorage({
    destination: messageUploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext || ".bin"}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isAudio = file.mimetype.startsWith("audio/");
    const isImage = file.mimetype.startsWith("image/");

    const allowed = [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowed.includes(file.mimetype) && !isAudio && !isImage) {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
      return;
    }

    cb(null, true);
  },
});

const typingMap = new Map<string, number>();

function typingKey(fromUserId: number, toUserId: number) {
  return `${fromUserId}:${toUserId}`;
}

const sseClients = new Map<number, Set<Response>>();

function notifyUser(userId: number, event: Record<string, unknown>) {
  const clients = sseClients.get(userId);
  if (!clients) return;

  for (const client of clients) {
    client.write(`data: ${JSON.stringify({ ...event, at: Date.now() })}\n\n`);
  }
}

function runMessageUpload(req: any, res: any, next: any) {
  messageUpload.single("file")(req, res, (err: any) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload failed" });
      return;
    }
    next();
  });
}

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


// GET /api/messages/events — live message updates
router.get("/events", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const me = await getDbUser(clerkUserId);

    if (!me) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let clients = sseClients.get(me.id);
    if (!clients) {
      clients = new Set<Response>();
      sseClients.set(me.id, clients);
    }

    clients.add(res);
    res.write(`data: ${JSON.stringify({ type: "connected", at: Date.now() })}\n\n`);

    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: "ping", at: Date.now() })}\n\n`);
    }, 25000);

    req.on("close", () => {
      clearInterval(keepAlive);
      clients?.delete(res);
      if (clients && clients.size === 0) sseClients.delete(me.id);
    });
  } catch (err) {
    req.log.error({ err }, "Failed to open message event stream");
    res.status(500).json({ error: "Failed to open message event stream" });
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



// POST /api/messages/:partnerId/typing — transient typing status
router.post("/:partnerId/typing", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    const isTyping = Boolean((req.body as { isTyping?: boolean }).isTyping);

    if (isNaN(partnerId)) { res.status(400).json({ error: "Invalid partnerId" }); return; }

    const me = await getDbUser(clerkUserId);
    if (!me) { res.status(404).json({ error: "User not found" }); return; }

    const key = typingKey(me.id, partnerId);

    if (isTyping) {
      typingMap.set(key, Date.now() + 4000);
    } else {
      typingMap.delete(key);
    }

    notifyUser(partnerId, { type: "typing", partnerId: me.id, isTyping });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update typing status");
    res.status(500).json({ error: "Failed to update typing status" });
  }
});

// GET /api/messages/:partnerId/typing-status — check if partner is typing
router.get("/:partnerId/typing-status", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);

    if (isNaN(partnerId)) { res.status(400).json({ error: "Invalid partnerId" }); return; }

    const me = await getDbUser(clerkUserId);
    if (!me) { res.status(404).json({ error: "User not found" }); return; }

    const key = typingKey(partnerId, me.id);
    const expiresAt = typingMap.get(key) ?? 0;

    if (expiresAt <= Date.now()) {
      typingMap.delete(key);
      res.json({ isTyping: false });
      return;
    }

    res.json({ isTyping: true });
  } catch (err) {
    req.log.error({ err }, "Failed to get typing status");
    res.status(500).json({ error: "Failed to get typing status" });
  }
});




// POST /api/messages/:partnerId/attachment — send file/image attachment
router.post("/:partnerId/attachment", requireAuth, runMessageUpload, async (req, res) => {
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

    if (me.id === partnerId) {
      res.status(400).json({ error: "Cannot send attachment to yourself" });
      return;
    }

    const blockStatus = await getBlockStatus(me.id, partnerId);
    if (blockStatus.isBlocked) {
      res.status(403).json({ error: "Messaging is blocked" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "file is required" });
      return;
    }

    const publicAppUrl =
      process.env.PUBLIC_APP_URL ||
      `${req.protocol}://${req.get("host")}`;

    const fileUrl = `${publicAppUrl.replace(/\/$/, "")}/uploads/messages/${req.file.filename}`;
    const isImage = req.file.mimetype.startsWith("image/");
    const isAudio = req.file.mimetype.startsWith("audio/");

    const [msg] = await db.insert(directMessages).values({
      fromUserId: me.id,
      toUserId: partnerId,
      content: req.file.originalname || "Attachment",
      messageType: isAudio ? "voice" : isImage ? "image" : "attachment",
      metadata: {
        fileUrl,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    }).returning();

    notifyUser(me.id, { type: "message", partnerId, messageId: msg.id });
    notifyUser(partnerId, { type: "message", partnerId: me.id, messageId: msg.id });

    res.status(201).json({ message: msg });
  } catch (err) {
    req.log.error({ err }, "Failed to send attachment");
    res.status(500).json({ error: "Failed to send attachment" });
  }
});


// POST /api/messages/:partnerId/call — create ringing call message
router.post("/:partnerId/call", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    const { mode, roomName } = req.body as { mode?: "audio" | "video"; roomName?: string };

    if (isNaN(partnerId)) { res.status(400).json({ error: "Invalid partnerId" }); return; }
    if (mode !== "audio" && mode !== "video") { res.status(400).json({ error: "Invalid call mode" }); return; }
    if (!roomName || typeof roomName !== "string") { res.status(400).json({ error: "roomName required" }); return; }

    const me = await getDbUser(clerkUserId);
    if (!me) { res.status(404).json({ error: "User not found" }); return; }

    const blockStatus = await getBlockStatus(me.id, partnerId);
    if (blockStatus.isBlocked) { res.status(403).json({ error: "Call blocked" }); return; }

    const [msg] = await db.insert(directMessages).values({
      fromUserId: me.id,
      toUserId: partnerId,
      content: `${mode === "video" ? "Video" : "Audio"} call`,
      messageType: "call",
      metadata: {
        mode,
        roomName,
        status: "ringing",
        startedAt: new Date().toISOString(),
      },
    }).returning();

    notifyUser(me.id, { type: "call", partnerId, messageId: msg.id });
    notifyUser(partnerId, { type: "call", partnerId: me.id, messageId: msg.id, incoming: true, mode });

    res.status(201).json({ message: msg });
  } catch (err) {
    req.log.error({ err }, "Failed to create call message");
    res.status(500).json({ error: "Failed to create call message" });
  }
});

// PATCH /api/messages/:partnerId/call/:messageId — update call status
router.patch("/:partnerId/call/:messageId", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    const messageId = parseInt(req.params.messageId as string, 10);
    const { status } = req.body as { status?: "accepted" | "declined" | "ended" | "missed" };

    if (isNaN(partnerId) || isNaN(messageId)) { res.status(400).json({ error: "Invalid IDs" }); return; }
    if (!["accepted", "declined", "ended", "missed"].includes(String(status))) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const me = await getDbUser(clerkUserId);
    if (!me) { res.status(404).json({ error: "User not found" }); return; }

    const [existing] = await db
      .select()
      .from(directMessages)
      .where(
        and(
          eq(directMessages.id, messageId),
          or(
            and(eq(directMessages.fromUserId, me.id), eq(directMessages.toUserId, partnerId)),
            and(eq(directMessages.fromUserId, partnerId), eq(directMessages.toUserId, me.id))
          )
        )
      )
      .limit(1);

    if (!existing || existing.messageType !== "call") {
      res.status(404).json({ error: "Call message not found" });
      return;
    }

    const currentMetadata = (existing.metadata ?? {}) as Record<string, unknown>;
    const nextMetadata = {
      ...currentMetadata,
      status,
      updatedAt: new Date().toISOString(),
      ...(status === "accepted" ? { acceptedAt: new Date().toISOString() } : {}),
      ...(status === "ended" ? { endedAt: new Date().toISOString() } : {}),
    };

    const [updated] = await db
      .update(directMessages)
      .set({ metadata: nextMetadata })
      .where(eq(directMessages.id, messageId))
      .returning();

    notifyUser(me.id, { type: "call", partnerId, messageId });
    notifyUser(partnerId, { type: "call", partnerId: me.id, messageId });

    res.json({ message: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update call message");
    res.status(500).json({ error: "Failed to update call message" });
  }
});



// PATCH /api/messages/:partnerId/:messageId/reaction — add/remove reaction
router.patch("/:partnerId/:messageId/reaction", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    const messageId = parseInt(req.params.messageId as string, 10);
    const { reaction } = req.body as { reaction?: string | null };
    const cleanReaction =
      typeof reaction === "string" && reaction.trim().length > 0
        ? reaction.trim().normalize("NFC")
        : null;

    if (isNaN(partnerId) || isNaN(messageId)) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const me = await getDbUser(clerkUserId);
    if (!me) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(directMessages)
      .where(
        and(
          eq(directMessages.id, messageId),
          or(
            and(eq(directMessages.fromUserId, me.id), eq(directMessages.toUserId, partnerId)),
            and(eq(directMessages.fromUserId, partnerId), eq(directMessages.toUserId, me.id))
          )
        )
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const [updated] = await db
      .update(directMessages)
      .set({ reaction: cleanReaction })
      .where(eq(directMessages.id, messageId))
      .returning();

    notifyUser(me.id, { type: "reaction", partnerId, messageId });
    notifyUser(partnerId, { type: "reaction", partnerId: me.id, messageId });

    res.json({ message: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to update reaction");
    res.status(500).json({ error: "Failed to update reaction" });
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

    notifyUser(me.id, { type: "block", partnerId });
    notifyUser(partnerId, { type: "block", partnerId: me.id });
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
    notifyUser(me.id, { type: "block", partnerId });
    notifyUser(partnerId, { type: "block", partnerId: me.id });
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

    await db
      .update(directMessages)
      .set({ isRead: true })
      .where(and(eq(directMessages.fromUserId, partnerId), eq(directMessages.toUserId, me.id), eq(directMessages.isRead, false)));

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

    notifyUser(partnerId, { type: "read", partnerId: me.id });

    const blockStatus = await getBlockStatus(me.id, partnerId);

    res.json({ messages: msgs, partner: partner ?? null, myId: me.id, blockStatus });
  } catch (err) {
    req.log.error({ err }, "Failed to load messages");
    res.status(500).json({ error: "Failed to load messages" });
  }
});


// POST /api/messages/application/:jobApplicationId — employer/candidate message linked to application
router.post("/application/:jobApplicationId", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const jobApplicationId = parseInt(req.params.jobApplicationId as string, 10);
    const { content } = req.body as { content?: string };

    if (isNaN(jobApplicationId)) {
      res.status(400).json({ error: "Invalid jobApplicationId" });
      return;
    }

    if (!content || typeof content !== "string" || content.trim().length === 0 || content.length > 2000) {
      res.status(400).json({ error: "Message content required (1-2000 chars)" });
      return;
    }

    const me = await getDbUser(clerkUserId);
    if (!me) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [application] = await db
      .select({
        id: jobApplications.id,
        applicantUserId: jobApplications.userId,
        jobId: jobApplications.jobId,
        employerUserId: jobs.postedByUserId,
        jobTitle: jobs.title,
      })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobApplications.jobId, jobs.id))
      .where(eq(jobApplications.id, jobApplicationId))
      .limit(1);

    if (!application) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    const isApplicant = me.id === application.applicantUserId;
    const isEmployer = me.id === application.employerUserId;

    if (!isApplicant && !isEmployer) {
      res.status(403).json({ error: "You are not allowed to message on this application" });
      return;
    }

    const partnerId = isEmployer ? application.applicantUserId : application.employerUserId;

    if (!partnerId || partnerId === me.id) {
      res.status(400).json({ error: "Invalid conversation partner" });
      return;
    }

    const blockStatus = await getBlockStatus(me.id, partnerId);
    if (blockStatus.blockedByMe || blockStatus.blockedMe) {
      res.status(403).json({ error: "Messaging is blocked for this conversation" });
      return;
    }

    const [msg] = await db.insert(directMessages).values({
      fromUserId: me.id,
      toUserId: partnerId,
      content: content.trim(),
      jobApplicationId,
      metadata: {
        context: "job_application",
        jobId: application.jobId,
        jobTitle: application.jobTitle,
      },
    }).returning();

    notifyUser(me.id, { type: "message", partnerId, jobApplicationId });
    notifyUser(partnerId, { type: "message", partnerId: me.id, jobApplicationId, incoming: true });

    res.status(201).json({ message: msg, partnerId });
  } catch (err) {
    req.log.error({ err }, "Failed to send application message");
    res.status(500).json({ error: "Failed to send application message" });
  }
});



// POST /api/messages/:partnerId — send a message
router.post("/:partnerId", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    if (isNaN(partnerId)) { res.status(400).json({ error: "Invalid partnerId" }); return; }

    const { content, jobApplicationId, replyToMessageId } = req.body as { content?: string; jobApplicationId?: number; replyToMessageId?: number };
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
      replyToMessageId: typeof replyToMessageId === "number" ? replyToMessageId : null,
      jobApplicationId: typeof jobApplicationId === "number" ? jobApplicationId : null,
    }).returning();

    notifyUser(me.id, { type: "message", partnerId });
    notifyUser(partnerId, { type: "message", partnerId: me.id, incoming: true });
    res.status(201).json({ message: msg });
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Failed to send message" });
  }
});







// PATCH /api/messages/:partnerId/:messageId/delete — delete for me or everyone
router.patch("/:partnerId/:messageId/delete", requireAuth, async (req, res) => {
  try {
    const clerkUserId = (req as any).clerkUserId as string;
    const partnerId = parseInt(req.params.partnerId as string, 10);
    const messageId = parseInt(req.params.messageId as string, 10);
    const { mode } = req.body as { mode?: "me" | "everyone" };

    if (isNaN(partnerId) || isNaN(messageId)) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    if (mode !== "me" && mode !== "everyone") {
      res.status(400).json({ error: "mode must be me or everyone" });
      return;
    }

    const me = await getDbUser(clerkUserId);
    if (!me) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(directMessages)
      .where(
        and(
          eq(directMessages.id, messageId),
          or(
            and(eq(directMessages.fromUserId, me.id), eq(directMessages.toUserId, partnerId)),
            and(eq(directMessages.fromUserId, partnerId), eq(directMessages.toUserId, me.id))
          )
        )
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (mode === "everyone" && existing.fromUserId !== me.id) {
      res.status(403).json({ error: "You can only delete your own message for everyone" });
      return;
    }

    const currentDeleted = Array.isArray(existing.deletedForUserIds)
      ? existing.deletedForUserIds as number[]
      : [];

    const [updated] = await db
      .update(directMessages)
      .set(
        mode === "everyone"
          ? {
              content: "This message was deleted",
              messageType: "text",
              metadata: {},
              reaction: null,
              deletedForEveryone: true,
            }
          : {
              deletedForUserIds: Array.from(new Set([...currentDeleted, me.id])),
            }
      )
      .where(eq(directMessages.id, messageId))
      .returning();

    notifyUser(me.id, { type: "delete", partnerId, messageId });
    notifyUser(partnerId, { type: "delete", partnerId: me.id, messageId });

    res.json({ message: updated });
  } catch (err) {
    req.log.error({ err }, "Failed to delete message");
    res.status(500).json({ error: "Failed to delete message" });
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

    notifyUser(me.id, { type: "clear", partnerId });
    notifyUser(partnerId, { type: "clear", partnerId: me.id });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to clear messages");
    res.status(500).json({ error: "Failed to clear messages" });
  }
});

export default router;
