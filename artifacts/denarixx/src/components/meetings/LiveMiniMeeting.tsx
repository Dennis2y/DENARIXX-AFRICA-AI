import "@livekit/components-styles";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Maximize2, Minimize2, PhoneOff, X } from "lucide-react";
import { useState } from "react";

type Props = {
  token: string;
  serverUrl: string;
  roomName: string;
  onClose: () => void;
};

function MiniStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks} className="h-full gap-2 p-2">
      <ParticipantTile className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950" />
    </GridLayout>
  );
}

export function LiveMiniMeeting({ token, serverUrl, roomName, onClose }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={
        expanded
          ? "fixed inset-4 z-[120] overflow-hidden rounded-[28px] border border-cyan-400/25 bg-black text-white shadow-2xl"
          : "fixed bottom-5 right-5 z-[120] h-[420px] w-[340px] overflow-hidden rounded-[28px] border border-cyan-400/25 bg-black text-white shadow-2xl"
      }
    >
      <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio className="h-full">
        <div className="flex h-full flex-col">
          <div className="flex h-12 items-center justify-between border-b border-white/10 bg-zinc-950 px-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Live call</p>
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
