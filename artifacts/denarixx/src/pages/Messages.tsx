import { useState, useEffect, useRef } from "react";
import { Show, useAuth } from "@clerk/react";
import { Redirect, useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  Send,
  MessageCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  Briefcase,
  Phone,
  Video,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import { useLiveMeeting } from "@/components/meetings/useLiveMeeting";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function NavBar() {
  const [, setLocation] = useLocation();

  return (
    <nav className="border-b border-border bg-background/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center gap-3">
        <button onClick={() => setLocation("/dashboard")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </button>

        <div className="w-px h-5 bg-border" />

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-400/15 flex items-center justify-center border border-cyan-400/30">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="font-bold text-xl">Messages</span>
        </div>
      </div>
    </nav>
  );
}

function Avatar({ name, url, size = 40 }: { name?: string | null; url?: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  if (url) {
    return <img src={url} alt={name ?? "User"} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }

  return (
    <div
      className="rounded-full bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center flex-shrink-0 text-cyan-300 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}

type Conversation = {
  partnerId: number;
  partner: { id: number; name: string | null; avatarUrl: string | null; role: string | null } | null;
  lastMessage: { content: string; createdAt: string; fromUserId: number };
  unreadCount: number;
};

type Message = {
  id: number;
  fromUserId: number;
  toUserId: number;
  content: string;
  isRead: boolean;
  jobApplicationId: number | null;
  createdAt: string;
};

function useInbox(getToken: () => Promise<string | null>) {
  return useQuery<{ conversations: Conversation[] }>({
    queryKey: ["messages-inbox"],
    queryFn: async () => {
      const token = await getToken();
      const r = await fetch(`${basePath}/api/messages/inbox`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!r.ok) throw new Error("Failed to load inbox");
      return r.json();
    },
    refetchInterval: 15_000,
  });
}

function useThread(partnerId: number | null, getToken: () => Promise<string | null>) {
  return useQuery<{ messages: Message[]; partner: Conversation["partner"]; myId: number }>({
    queryKey: ["messages-thread", partnerId],
    queryFn: async () => {
      const token = await getToken();
      const r = await fetch(`${basePath}/api/messages/${partnerId}`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!r.ok) throw new Error("Failed to load messages");
      return r.json();
    },
    enabled: partnerId !== null,
    refetchInterval: 8_000,
  });
}

function useSendMessage(partnerId: number | null, getToken: () => Promise<string | null>, jobApplicationId?: number | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const token = await getToken();
      const body: Record<string, unknown> = { content };

      if (jobApplicationId) body.jobApplicationId = jobApplicationId;

      const r = await fetch(`${basePath}/api/messages/${partnerId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!r.ok) throw new Error("Failed to send");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages-thread", partnerId] });
      qc.invalidateQueries({ queryKey: ["messages-inbox"] });
      qc.invalidateQueries({ queryKey: ["messages-unread-count"] });
    },
  });
}

function ThreadView({
  partnerId,
  onBack,
  jobTitle,
  jobApplicationId,
}: {
  partnerId: number;
  onBack: () => void;
  jobTitle?: string | null;
  jobApplicationId?: number | null;
}) {
  const { getToken } = useAuth();
  const { data, isLoading } = useThread(partnerId, getToken);
  const { mutateAsync: send, isPending } = useSendMessage(partnerId, getToken, jobApplicationId);
  const { activeMeeting, startingMeeting, startMeeting, endMeeting } = useLiveMeeting(basePath, getToken);

  const [text, setText] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = data?.messages ?? [];
  const visibleMessages = messageSearch.trim()
    ? messages.filter((msg) => msg.content.toLowerCase().includes(messageSearch.toLowerCase()))
    : messages;
  const partner = data?.partner;
  const myId = data?.myId;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    setText("");
    await send(trimmed);
  };

  const clearChat = async () => {
    if (!window.confirm("Clear this chat for testing? This will delete the conversation messages from the database.")) return;

    const token = await getToken();
    const res = await fetch(`${basePath}/api/messages/${partnerId}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      alert(await res.text());
      return;
    }

    window.location.reload();
  };

  const blockUser = async () => {
    if (!window.confirm(`Block ${partner?.name || "this user"}? This will clear the chat locally for now.`)) return;
    await clearChat();
  };

  const startDirectCall = async (mode: "audio" | "video") => {
    await startMeeting({
      roomName: `direct-${Math.min(partnerId, myId || 0)}-${Math.max(partnerId, myId || 0)}`,
      displayName: partner?.name || "Denarixx User",
      meetingType: "direct",
    });

    await send(`${mode === "video" ? "Video" : "Audio"} call started. Join from this chat.`);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      {activeMeeting && (
        <LiveMeetingRoom
          token={activeMeeting.token}
          serverUrl={activeMeeting.serverUrl}
          roomName={activeMeeting.roomName}
          onClose={endMeeting}
        />
      )}

      <div className="sticky top-0 z-30 flex h-[76px] flex-shrink-0 items-center gap-3 border-b border-border bg-background/95 px-5 backdrop-blur-xl shadow-sm">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors lg:hidden">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <Avatar name={partner?.name} url={partner?.avatarUrl} size={44} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{partner?.name ?? "User"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {partner?.role || "Online"} • Secure messages and live calls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={startingMeeting || !myId}
            onClick={() => startDirectCall("audio")}
            title="Start audio call"
            className="h-11 w-11 rounded-full border-cyan-400/30 bg-cyan-400/10 p-0 text-cyan-300 hover:bg-cyan-400/20"
          >
            <Phone className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            disabled={startingMeeting || !myId}
            onClick={() => startDirectCall("video")}
            title="Start video call"
            className="h-11 w-11 rounded-full bg-cyan-400 p-0 text-black shadow-lg shadow-cyan-400/20 hover:bg-cyan-300"
          >
            <Video className="h-4 w-4" />
          </Button>

          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMoreOpen((value) => !value)}
              className="h-11 w-11 rounded-full p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {moreOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-border bg-card p-2 shadow-2xl">
                <button onClick={() => { setProfileOpen(true); setMoreOpen(false); }} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">
                  View profile
                </button>
                <button onClick={() => { setSearchOpen(true); setMoreOpen(false); }} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">
                  Search messages
                </button>
                <button onClick={() => { setMoreOpen(false); clearChat(); }} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">
                  Clear chat
                </button>
                <button onClick={() => { setMoreOpen(false); blockUser(); }} className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10">
                  Block user
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {profileOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[420px] max-w-[92vw] rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <Avatar name={partner?.name} url={partner?.avatarUrl} size={64} />
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{partner?.name || "User"}</p>
                <p className="text-sm text-muted-foreground">{partner?.role || "Denarixx member"}</p>
                <p className="mt-1 text-xs text-cyan-300">Available for messages and live calls</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button onClick={() => startDirectCall("audio")} variant="outline" className="rounded-2xl">Audio call</Button>
              <Button onClick={() => startDirectCall("video")} className="rounded-2xl bg-cyan-400 text-black hover:bg-cyan-300">Video call</Button>
            </div>

            <Button onClick={() => setProfileOpen(false)} variant="ghost" className="mt-4 w-full rounded-2xl">
              Close
            </Button>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="border-b border-border bg-card/50 px-5 py-3">
          <div className="flex items-center gap-2">
            <input
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
              placeholder="Search inside this chat..."
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-cyan-400/50"
              autoFocus
            />
            <Button variant="outline" onClick={() => { setSearchOpen(false); setMessageSearch(""); }} className="rounded-xl">
              Close
            </Button>
          </div>
        </div>
      )}

      {jobTitle && (
        <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Re: <span className="font-semibold">{jobTitle}</span> application</span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Say hello to {partner?.name ?? "your connection"}!</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {visibleMessages.map(msg => {
              const isMe = msg.fromUserId === myId;

              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[68%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    isMe
                      ? "bg-cyan-400 text-black rounded-br-md"
                      : "bg-card border border-border text-foreground rounded-bl-md"
                  }`}>
                    <p className="leading-relaxed">{msg.content}</p>
                    <p className={`text-[11px] mt-1 ${isMe ? "text-black/60" : "text-muted-foreground"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-border bg-background/95 px-5 py-4 pr-24 backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type a message…"
            className="h-11 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
            disabled={isPending}
            autoFocus
          />

          <Button onClick={handleSend} disabled={!text.trim() || isPending} size="sm" className="h-10 w-10 rounded-full bg-cyan-400 p-0 text-black hover:bg-cyan-300">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function InboxList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(c =>
    c.partner?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.partner?.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border bg-card/20">
      <div className="flex-shrink-0 border-b border-border px-4 py-4">
        <p className="mb-3 text-lg font-bold">Inbox</p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-cyan-400/50"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium text-sm">No conversations yet</p>
            <p className="text-xs mt-1 text-center px-6">
              Messages from employers and connections will appear here.
            </p>
          </div>
        ) : (
          filtered.map(conv => (
            <button
              key={conv.partnerId}
              onClick={() => onSelect(conv.partnerId)}
              className={`w-full flex items-center gap-3 px-4 py-4 text-left border-b border-border/60 transition-colors ${
                selectedId === conv.partnerId ? "bg-cyan-400/10 border-l-4 border-l-cyan-400" : "hover:bg-muted/40"
              }`}
            >
              <Avatar name={conv.partner?.name} url={conv.partner?.avatarUrl} size={44} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{conv.partner?.name ?? "User"}</p>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(conv.lastMessage.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground truncate mt-1">{conv.lastMessage.content}</p>
              </div>

              {conv.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-400 px-1.5 text-[10px] font-bold text-black">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function MessagesContent() {
  const { getToken } = useAuth();
  const { data, isLoading } = useInbox(getToken);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const search = useSearch();

  const params = new URLSearchParams(search);
  const partnerParam = params.get("partnerId");
  const jobTitle = params.get("jobTitle");
  const jobApplicationId = params.get("jobApplicationId");

  useEffect(() => {
    if (partnerParam) setSelectedId(Number(partnerParam));
  }, [partnerParam]);

  const conversations = data?.conversations ?? [];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <NavBar />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_1fr]">
        <InboxList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          isLoading={isLoading}
        />

        <div className="min-h-0">
          {selectedId ? (
            <ThreadView
              partnerId={selectedId}
              onBack={() => setSelectedId(null)}
              jobTitle={jobTitle}
              jobApplicationId={jobApplicationId ? Number(jobApplicationId) : null}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="w-16 h-16 mb-4 opacity-25" />
              <p className="text-xl font-semibold">Select a conversation</p>
              <p className="text-sm mt-2">Choose a conversation from your inbox to start messaging or calling.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <>
      <Show when="signed-in">
        <MessagesContent />
      </Show>

      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}
