import { Router, type Request, type Response } from "express";
import { AccessToken } from "livekit-server-sdk";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function safeRoomName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

router.post("/token", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomName, displayName, meetingType } = req.body as {
      roomName?: string;
      displayName?: string;
      meetingType?: "direct" | "community" | "webinar";
    };

    if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      res.status(500).json({ error: "LiveKit is not configured" });
      return;
    }

    const clerkUserId = (req as any).clerkUserId as string;
    const room = safeRoomName(roomName || `${meetingType || "meeting"}-${Date.now()}`);
    const identity = clerkUserId || `guest-${Date.now()}`;
    const name = displayName || "Denarixx User";

    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity,
      name,
      ttl: "2h",
    });

    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    res.json({
      token: await token.toJwt(),
      url: process.env.LIVEKIT_URL,
      roomName: room,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create LiveKit token");
    res.status(500).json({ error: "Failed to create meeting token" });
  }
});

export default router;
