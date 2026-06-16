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
import {
  Captions,
  FileText,
  Grid3X3,
  Heart,
  Info,
  Maximize2,
  MessageSquare,
  Mic,
  MonitorUp,
  MoreHorizontal,
  PenLine,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
    <GridLayout tracks={tracks} className="h-full gap-4 p-5">
      <ParticipantTile className="overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950 shadow-[0_30px_90px_rgba(0,0,0,0.55)]" />
    </GridLayout>
  );
}

function MeetingTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const time = useMemo(() => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }, [seconds]);

  return <span>{time}</span>;
}

export function LiveMeetingRoom({ token, serverUrl, roomName, onClose }: LiveMeetingRoomProps) {
  const layoutContext = useCreateLayoutContext();
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [hostToolsOpen, setHostToolsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  const reactions = ["👍", "👏", "❤️", "😂", "😮", "🎉", "🔥", "💡", "🙏", "🚀", "✅", "☕"];

  const showReaction = (emoji: string) => {
    setActiveReaction(emoji);
    setReactionsOpen(false);
    window.setTimeout(() => setActiveReaction(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#090909] text-white">
      <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio className="h-full">
        <LayoutContextProvider value={layoutContext}>
          <div className="flex h-full flex-col bg-[#171717]">
            <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#242424] px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Info className="h-4 w-4 text-white/80" />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-wide">Denarixx Premium Meeting</div>
                  <div className="text-xs text-white/50">{roomName}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-white/80">
                <div className="hidden items-center gap-2 md:flex">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span className="text-xs">Secure</span>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-black/25 px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <MeetingTimer />
                </div>

                <Button variant="ghost" size="sm" className="rounded-full text-white hover:bg-white/10">
                  <PenLine className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="sm" className="rounded-full text-white hover:bg-white/10">
                  <Grid3X3 className="h-4 w-4" />
                </Button>

                <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full text-white hover:bg-red-500/20 hover:text-red-200">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <main className="relative flex min-h-0 flex-1 bg-[#1f1f1f]">
              {activeReaction && (
                <div className="pointer-events-none absolute left-1/2 top-20 z-40 -translate-x-1/2 animate-bounce rounded-[32px] border border-white/20 bg-black/60 px-10 py-6 text-7xl shadow-2xl backdrop-blur-xl">
                  {activeReaction}
                </div>
              )}

              <section className="relative min-w-0 flex-1">
                <div className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/70 backdrop-blur-xl">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  HD Video • AI-ready meeting room
                </div>

                <MeetingStage />
              </section>

              {(chatOpen || participantsOpen || hostToolsOpen) && (
                <aside className="flex w-[410px] max-w-[42vw] flex-col border-l border-white/10 bg-[#262626] shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {chatOpen ? "Meeting Chat" : participantsOpen ? "Participants" : "Host Tools"}
                      </p>
                      <p className="text-xs text-white/45">
                        {chatOpen ? "Everyone in this room" : participantsOpen ? "Manage live attendees" : "Premium control center"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setChatOpen(false);
                        setParticipantsOpen(false);
                        setHostToolsOpen(false);
                      }}
                      className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {chatOpen && (
                    <div className="min-h-0 flex-1 p-3 [&_.lk-chat]:h-full [&_.lk-chat-form]:rounded-2xl [&_.lk-chat-form]:border [&_.lk-chat-form]:border-white/10 [&_.lk-chat-form]:bg-white/5 [&_.lk-chat-input]:bg-transparent [&_.lk-chat-input]:text-white">
                      <Chat />
                    </div>
                  )}

                  {participantsOpen && (
                    <div className="space-y-3 p-4">
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">Demo LiveKit User</p>
                            <p className="text-xs text-white/45">Host • Camera on</p>
                          </div>
                          <div className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs text-emerald-300">Live</div>
                        </div>
                      </div>

                      <Button className="w-full rounded-2xl bg-cyan-400 text-black hover:bg-cyan-300">
                        Invite participant
                      </Button>
                    </div>
                  )}

                  {hostToolsOpen && (
                    <div className="space-y-3 p-4">
                      {[
                        "Lock meeting",
                        "Enable waiting room",
                        "Mute participants on entry",
                        "Hide profile pictures",
                        "Allow screen sharing",
                      ].map((item) => (
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
                <div className="absolute bottom-24 left-1/2 z-50 w-[360px] -translate-x-1/2 rounded-3xl border border-white/15 bg-[#252525]/95 p-4 shadow-2xl backdrop-blur-xl">
                  <p className="mb-3 text-center text-sm font-semibold">Send with effect</p>
                  <div className="grid grid-cols-6 gap-2">
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

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => showReaction("✋")} className="rounded-2xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
                      ✋ Raise hand
                    </button>
                    <button onClick={() => showReaction("☕")} className="rounded-2xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
                      ☕ Be right back
                    </button>
                  </div>
                </div>
              )}

              {moreOpen && (
                <div className="absolute bottom-24 left-[60%] z-50 w-[300px] rounded-3xl border border-white/15 bg-[#252525]/95 p-4 shadow-2xl backdrop-blur-xl">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["Record", "●"],
                      ["Captions", "CC"],
                      ["Docs", "▤"],
                      ["Whiteboard", "▭"],
                      ["Apps", "◇"],
                      ["Info", "i"],
                      ["Transfer", "⇄"],
                      ["Settings", "⚙"],
                      ["AI Notes", "✦"],
                    ].map(([label, icon]) => (
                      <button key={label} className="rounded-2xl bg-white/10 px-2 py-3 text-center text-xs hover:bg-white/15">
                        <div className="mb-1 text-lg">{icon}</div>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </main>

            <RoomAudioRenderer />

            <footer className="border-t border-black/40 bg-[#111] px-4 py-3">
              <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
                <ControlBar controls={{ chat: false, screenShare: true }} />

                <button onClick={() => setParticipantsOpen(true)} className="flex min-w-[86px] flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs hover:bg-white/10">
                  <Users className="h-5 w-5" />
                  Participants
                </button>

                <button onClick={() => setChatOpen(true)} className="flex min-w-[76px] flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs hover:bg-white/10">
                  <MessageSquare className="h-5 w-5" />
                  Chat
                </button>

                <button onClick={() => setReactionsOpen((value) => !value)} className="flex min-w-[76px] flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs hover:bg-white/10">
                  <Heart className="h-5 w-5" />
                  React
                </button>

                <button className="flex min-w-[76px] flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs hover:bg-white/10">
                  <MonitorUp className="h-5 w-5" />
                  Share
                </button>

                <button onClick={() => setHostToolsOpen(true)} className="flex min-w-[86px] flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs hover:bg-white/10">
                  <Shield className="h-5 w-5" />
                  Host tools
                </button>

                <button onClick={() => setMoreOpen((value) => !value)} className="flex min-w-[76px] flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs hover:bg-white/10">
                  <MoreHorizontal className="h-5 w-5" />
                  More
                </button>

                <button onClick={onClose} className="ml-4 flex min-w-[76px] flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs text-red-300 hover:bg-red-500/15">
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
