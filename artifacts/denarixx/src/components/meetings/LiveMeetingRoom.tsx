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
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Heart, MessageSquare, MoreHorizontal, Shield, ShieldCheck, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";

type LiveMeetingRoomProps = {
  token: string;
  serverUrl: string;
  roomName: string;
  onClose: () => void;
};

function MeetingTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const value = useMemo(() => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [seconds]);

  return <span>{value}</span>;
}

function initials(name?: string) {
  return (name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ParticipantList() {
  const participants = useParticipants();

  return (
    <div className="space-y-3 p-4">
      {participants.map((participant, index) => (
        <div key={participant.identity} className="rounded-3xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/15 text-sm font-bold text-cyan-100">
                {initials(participant.name || participant.identity)}
              </div>
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border border-black bg-emerald-400" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">
                  {participant.name || participant.identity}
                </p>
                {index === 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-1 text-[10px] text-amber-300">
                    👑 Host
                  </span>
                )}
              </div>

              <p className="text-xs text-white/50">
                {participant.isCameraEnabled ? "Camera on" : "Camera off"} • {participant.isMicrophoneEnabled ? "Mic on" : "Muted"}
              </p>

              <div className="mt-1 flex gap-2 text-[11px] text-white/60">
                <span>🟢 Online</span>
                {participant.isSpeaking && <span>🎙️ Speaking</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MeetingStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks} className="h-full gap-4 p-5">
      <ParticipantTile className="overflow-hidden rounded-[30px] border border-white/10 bg-zinc-950 shadow-[0_30px_90px_rgba(0,0,0,0.6)]" />
    </GridLayout>
  );
}

export function LiveMeetingRoom({ token, serverUrl, roomName, onClose }: LiveMeetingRoomProps) {
  const layoutContext = useCreateLayoutContext();
  const [panel, setPanel] = useState<"chat" | "people" | "host" | null>(null);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  const reactions = ["👍", "👏", "❤️", "😂", "😮", "🎉", "🔥", "💡", "🙏", "🚀"];

  const showReaction = (emoji: string) => {
    setActiveReaction(emoji);
    setReactionsOpen(false);
    window.setTimeout(() => setActiveReaction(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0b0d] text-white">
      <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio className="h-full">
        <LayoutContextProvider value={layoutContext}>
          <div className="flex h-full flex-col bg-[#17181c]">
            <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#202124] px-5">
              <div>
                <div className="text-sm font-semibold">Denarixx Premium Meeting</div>
                <div className="text-xs text-white/50">{roomName}</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 text-xs text-white/70 md:flex">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Secure
                </div>

                <div className="rounded-full bg-black/30 px-3 py-1.5 text-xs">
                  <MeetingTimer />
                </div>

                <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full text-white hover:bg-red-500/20 hover:text-red-200">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <main className="relative flex min-h-0 flex-1 bg-[#1b1c20]">
              {activeReaction && (
                <div className="pointer-events-none absolute left-1/2 top-20 z-40 -translate-x-1/2 animate-bounce rounded-[32px] border border-white/20 bg-black/60 px-10 py-6 text-7xl shadow-2xl backdrop-blur-xl">
                  {activeReaction}
                </div>
              )}

              <section className="min-w-0 flex-1">
                <MeetingStage />
              </section>

              {panel && (
                <aside className="flex w-[410px] max-w-[42vw] flex-col border-l border-white/10 bg-[#25262a] shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {panel === "chat" ? "Meeting Chat" : panel === "people" ? "Participants" : "Host Tools"}
                      </p>
                      <p className="text-xs text-white/45">
                        {panel === "chat" ? "Everyone in this room" : panel === "people" ? "Live attendees" : "Meeting controls"}
                      </p>
                    </div>

                    <button onClick={() => setPanel(null)} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {panel === "chat" && (
                    <div className="min-h-0 flex-1 p-3 [&_.lk-chat]:h-full [&_.lk-chat-form]:rounded-2xl [&_.lk-chat-form]:border [&_.lk-chat-form]:border-white/10 [&_.lk-chat-form]:bg-white/5 [&_.lk-chat-input]:bg-transparent [&_.lk-chat-input]:text-white">
                      <Chat />
                    </div>
                  )}

                  {panel === "people" && <ParticipantList />}

                  {panel === "host" && (
                    <div className="space-y-3 p-4">
                      {["Lock meeting", "Waiting room", "Mute on entry", "Allow screen sharing"].map((item) => (
                        <div key={item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                          <span className="text-sm">{item}</span>
                          <span className="h-6 w-11 rounded-full bg-white/15 p-1">
                            <span className="block h-4 w-4 rounded-full bg-white/70" />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </aside>
              )}

              {reactionsOpen && (
                <div className="absolute bottom-24 left-1/2 z-50 w-[340px] -translate-x-1/2 rounded-3xl border border-white/15 bg-[#252525]/95 p-4 shadow-2xl backdrop-blur-xl">
                  <p className="mb-3 text-center text-sm font-semibold">React</p>
                  <div className="grid grid-cols-5 gap-2">
                    {reactions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => showReaction(emoji)}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl transition hover:scale-110 hover:bg-cyan-400/20"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </main>

            <RoomAudioRenderer />

            <footer className="border-t border-white/10 bg-black/90 px-4 py-3 shadow-[0_-20px_60px_rgba(0,0,0,0.45)]">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                <div className="flex items-center rounded-3xl border border-white/10 bg-white/5 px-3 py-2">
                  <ControlBar controls={{ chat: false, screenShare: true }} />
                </div>

                <div className="flex items-center gap-2 rounded-3xl border border-white/10 bg-white/5 px-3 py-2">
                  <button onClick={() => setPanel("people")} className="flex min-w-[78px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs text-white/80 transition hover:bg-white/10 hover:text-white">
                    <Users className="h-5 w-5" />
                    People
                  </button>

                  <button onClick={() => setPanel("chat")} className="flex min-w-[70px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs text-white/80 transition hover:bg-white/10 hover:text-white">
                    <MessageSquare className="h-5 w-5" />
                    Chat
                  </button>

                  <button onClick={() => setReactionsOpen((value) => !value)} className="flex min-w-[70px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs text-white/80 transition hover:bg-white/10 hover:text-white">
                    <Heart className="h-5 w-5" />
                    React
                  </button>

                  <button onClick={() => setPanel("host")} className="flex min-w-[78px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs text-white/80 transition hover:bg-white/10 hover:text-white">
                    <Shield className="h-5 w-5" />
                    Host
                  </button>

                  <button className="flex min-w-[70px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs text-white/80 transition hover:bg-white/10 hover:text-white">
                    <MoreHorizontal className="h-5 w-5" />
                    More
                  </button>
                </div>

                <button onClick={onClose} className="flex min-w-[82px] flex-col items-center gap-1 rounded-3xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/20">
                  <X className="h-5 w-5" />
                  End
                </button>
              </div>
            </footer>
          </div>
        </LayoutContextProvider>
      </LiveKitRoom>
    </div>
  );
}
