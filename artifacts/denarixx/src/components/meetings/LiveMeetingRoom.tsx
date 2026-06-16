import "@livekit/components-styles";
import {
  Chat,
  ControlBar,
  GridLayout,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Maximize2, MessageSquare, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

type LiveMeetingRoomProps = {
  token: string;
  serverUrl: string;
  roomName: string;
  onClose: () => void;
};

function MeetingStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks} className="h-full gap-3 p-3">
      <ParticipantTile className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl" />
    </GridLayout>
  );
}

export function LiveMeetingRoom({ token, serverUrl, roomName, onClose }: LiveMeetingRoomProps) {
  const layoutContext = useCreateLayoutContext();
  const [chatOpen, setChatOpen] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  const showReaction = (emoji: string) => {
    setActiveReaction(emoji);
    window.setTimeout(() => setActiveReaction(null), 1800);
  };

  const reactions = ["👍", "👏", "😂", "❤️", "🎉", "🔥", "💡", "🙏"];

  return (
    <div className="fixed inset-0 z-[100] bg-[#05070d] text-white">
      <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio className="h-full">
        <LayoutContextProvider value={layoutContext}>
          <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_34%),linear-gradient(180deg,#05070d,#020308)]">
            <header className="flex h-16 items-center justify-between border-b border-white/10 bg-black/50 px-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10">
                  <Sparkles className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-wide">Denarixx Live Meeting</div>
                  <div className="flex items-center gap-2 text-xs text-white/55">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                    <span>{roomName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 md:flex">
                  <Users className="h-3.5 w-3.5" />
                  Live room
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChatOpen((value) => !value)}
                  className={`rounded-full px-4 text-white hover:bg-white/10 ${chatOpen ? "bg-cyan-400/15 text-cyan-200" : ""}`}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat
                </Button>

                <Button variant="ghost" size="sm" className="rounded-full text-white hover:bg-white/10">
                  <Maximize2 className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full text-white hover:bg-red-500/20 hover:text-red-200">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <main className="relative flex min-h-0 flex-1">
              {activeReaction && (
                <div className="pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2 animate-bounce rounded-full border border-white/20 bg-black/55 px-8 py-5 text-6xl shadow-2xl backdrop-blur-xl">
                  {activeReaction}
                </div>
              )}
              <section className="relative min-w-0 flex-1">
                <div className="absolute left-5 top-5 z-10 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/70 backdrop-blur-xl">
                  HD Video • Secure LiveKit Session
                </div>
                <MeetingStage />
              </section>

              {chatOpen && (
                <aside className="flex w-[390px] max-w-[42vw] flex-col border-l border-white/10 bg-[#080b13]/95 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold">Meeting Chat</p>
                      <p className="text-xs text-white/45">Messages during this live session</p>
                    </div>
                    <button onClick={() => setChatOpen(false)} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 p-3 [&_.lk-chat]:h-full [&_.lk-chat-form]:rounded-2xl [&_.lk-chat-form]:border [&_.lk-chat-form]:border-white/10 [&_.lk-chat-form]:bg-white/5 [&_.lk-chat-input]:bg-transparent [&_.lk-chat-input]:text-white">
                    <Chat />
                  </div>
                </aside>
              )}
            </main>

            <RoomAudioRenderer />

            <footer className="border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur-xl">
              <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 shadow-2xl md:flex-row md:justify-center">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                  {reactions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => showReaction(emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition hover:scale-110 hover:bg-white/10"
                      title={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <ControlBar controls={{ chat: false, screenShare: true }} />
              </div>
            </footer>
          </div>
        </LayoutContextProvider>
      </LiveKitRoom>
    </div>
  );
}
