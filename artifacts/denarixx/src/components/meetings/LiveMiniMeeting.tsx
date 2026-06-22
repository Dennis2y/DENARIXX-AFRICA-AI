import "@livekit/components-styles";
import {
  ControlBar,
  GridLayout,
  ParticipantTile,
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Maximize2, Minimize2, PhoneOff, X } from "lucide-react";
import { useState } from "react";

type Props = {
  token: string;
  serverUrl: string;
  roomName: string;
  mode?: "audio" | "video";
  onClose: () => void;
};

function getInitials(name?: string) {
  return (name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarUrl(metadata?: string) {
  try {
    if (!metadata) return null;
    const parsed = JSON.parse(metadata);
    return typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null;
  } catch {
    return null;
  }
}

function MiniStage() {
  const participants = useParticipants();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const cameraEnabled = participants.some((participant) => participant.isCameraEnabled);

  if (!cameraEnabled && participants.length > 0) {
    return (
      <div className="grid h-full place-items-center bg-zinc-950 p-4">
        {participants.map((participant) => {
          const avatarUrl = getAvatarUrl(participant.metadata);
          const name = participant.name || participant.identity;

          return (
            <div key={participant.identity} className="flex flex-col items-center gap-3 text-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-28 w-28 rounded-full border-4 border-cyan-400/30 object-cover shadow-2xl"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-cyan-400/30 bg-cyan-400/15 text-3xl font-bold text-cyan-100 shadow-2xl">
                  {getInitials(name)}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-white">{name}</p>
                <p className="text-xs text-white/50">Camera off</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <GridLayout tracks={tracks} className="h-full gap-2 p-2">
      <ParticipantTile className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950" />
    </GridLayout>
  );
}

export function LiveMiniMeeting({ token, serverUrl, roomName, mode = "video", onClose }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={
        expanded
          ? "fixed inset-4 z-[120] overflow-hidden rounded-[28px] border border-cyan-400/25 bg-black text-white shadow-2xl"
          : "fixed bottom-5 right-5 z-[120] h-[420px] w-[340px] overflow-hidden rounded-[28px] border border-cyan-400/25 bg-black text-white shadow-2xl"
      }
    >
      <LiveKitRoom token={token} serverUrl={serverUrl} connect video={mode === "video"} audio className="h-full">
        <div className="flex h-full flex-col">
          <div className="flex h-12 items-center justify-between border-b border-white/10 bg-zinc-950 px-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{mode === "video" ? "Video call" : "Audio call"}</p>
              <p className="truncate text-[11px] text-white/45">{roomName}</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
                title={expanded ? "Minimize" : "Expand"}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                onClick={onClose}
                className="rounded-full p-2 text-red-300 hover:bg-red-500/20"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 bg-zinc-900">
            <MiniStage />
          </div>

          <RoomAudioRenderer />

          <div className="border-t border-white/10 bg-zinc-950 px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-white/5">
                <ControlBar controls={{ chat: false, screenShare: true }} />
              </div>

              <button
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-400"
                title="End call"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </LiveKitRoom>
    </div>
  );
}
