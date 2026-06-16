import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Show, useAuth } from "@clerk/react";
import { Redirect, useLocation, useSearch } from "wouter";
import {
  ArrowLeft, Send, MessageCircle, User, Search, RefreshCw, ChevronLeft, Briefcase, Phone, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import { useLiveMeeting } from "@/components/meetings/useLiveMeeting";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function NavBar() {
  const [, setLocation] = useLocation();
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center gap-3">
        <button onClick={() => setLocation("/dashboard")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Dashboard</span>
        </button>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-cyan-400/20 flex items-center justify-center border border-cyan-400/30">
            <MessageCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-bold text-base">Messages</span>
        </div>
      </div>
    </nav>
  );
}

function Avatar({ name, url, size = 36 }: { name?: string | null; url?: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (url) {
    return <img src={url} alt={name ?? "User"} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 text-primary font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
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

function useInbox() {
  return useQuery<{ conversations: Conversation[] }>({
    queryKey: ["messages-inbox"],
    queryFn: async () => {
      const r = await fetch(`${basePath}/api/messages/inbox`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 15_000,
  });
}

function useThread(partnerId: number | null) {
  return useQuery<{ messages: Message[]; partner: Conversation["partner"]; myId: number }>({
    queryKey: ["messages-thread", partnerId],
    queryFn: async () => {
      const r = await fetch(`${basePath}/api/messages/${partnerId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: partnerId !== null,
    refetchInterval: 8_000,
  });
}

function useSendMessage(partnerId: number | null, jobApplicationId?: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const body: Record<string, unknown> = { content };
      if (jobApplicationId) body.jobApplicationId = jobApplicationId;
      const r = await fetch(`${basePath}/api/messages/${partnerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  const { data, isLoading } = useThread(partnerId);
  const { mutateAsync: send, isPending } = useSendMessage(partnerId, jobApplicationId);
  const { getToken } = useAuth();
  const { activeMeeting, startingMeeting, startMeeting, endMeeting } = useLiveMeeting(basePath, getToken);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = data?.messages ?? [];
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

  const startDirectCall = async (mode: "audio" | "video") => {
    await startMeeting({
      roomName: `direct-${Math.min(partnerId, myId || 0)}-${Math.max(partnerId, myId || 0)}`,
      displayName: partner?.name || "Denarixx User",
      meetingType: "direct",
    });

    await send(`${mode === "video" ? "Video" : "Audio"} call started. Join from this chat.`);
  };

  return (
    <div className="flex flex-col h-full">
      {activeMeeting && (
        <LiveMeetingRoom
          token={activeMeeting.token}
          serverUrl={activeMeeting.serverUrl}
          roomName={activeMeeting.roomName}
          onClose={endMeeting}
        />
      )}

      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 flex-shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors lg:hidden">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Avatar name={partner?.name} url={partner?.avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{partner?.name ?? "User"}</p>
          {partner?.role && <p className="text-xs text-muted-foreground truncate">{partner.role}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={startingMeeting || !myId}
            onClick={() => startDirectCall("audio")}
            title="Start audio call"
            className="h-9 w-9 rounded-full p-0"
          >
            <Phone className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            disabled={startingMeeting || !myId}
            onClick={() => startDirectCall("video")}
            title="Start video call"
            className="h-9 w-9 rounded-full p-0 bg-cyan-400 text-black hover:bg-cyan-300"
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Job context banner */}
      {jobTitle && (
        <div className="mx-4 mt-3 mb-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
          <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Re: <span className="font-semibold">{jobTitle}</span> application</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Say hello to {partner?.name ?? "your connection"}!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.fromUserId === myId;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-bl-sm"
                }`}>
                  <p className="leading-relaxed">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-background flex-shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type a message…"
            className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            disabled={isPending}
            autoFocus
          />
          <Button onClick={handleSend} disabled={!text.trim() || isPending} size="sm" className="px-4 h-10">
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
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-border flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium text-sm">No conversations yet</p>
            <p className="text-xs mt-1 text-center px-6">
              Messages from employers about your applications will appear here.
            </p>
          </div>
        ) : (
          filtered.map(conv => (
            <button
              key={conv.partnerId}
              onClick={() => onSelect(conv.partnerId)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-card/60 transition-colors border-b border-border/50 text-left ${
                selectedId === conv.partnerId ? "bg-card border-l-2 border-l-primary" : ""
              }`}
            >
              <div className="relative flex-shrink-0">
                <Avatar name={conv.partner?.name} url={conv.partner?.avatarUrl} size={40} />
                {conv.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs font-bold flex items-center justify-center">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-baseline gap-1">
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold text-foreground" : "font-medium"}`}>
                    {conv.partner?.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(conv.lastMessage.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "text-foreground/80" : "text-muted-foreground"}`}>
                  {conv.lastMessage.content}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function MessagesContent() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const partnerParam = params.get("partner");
  const jobParam = params.get("job");
  const appIdParam = params.get("appId");

  const [selectedId, setSelectedId] = useState<number | null>(
    partnerParam ? parseInt(partnerParam, 10) : null
  );
  const { data, isLoading } = useInbox();
  const conversations = data?.conversations ?? [];

  const showThread = selectedId !== null && !isNaN(selectedId);

  const jobTitle = jobParam ? decodeURIComponent(jobParam) : null;
  const jobApplicationId = appIdParam ? parseInt(appIdParam, 10) : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <NavBar />

      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        {/* Sidebar: conversation list */}
        <div className={`${showThread ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-80 xl:w-96 border-r border-border bg-background flex-shrink-0`}>
          <div className="px-4 py-4 border-b border-border">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-cyan-400" />
              Inbox
              {conversations.some(c => c.unreadCount > 0) && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {conversations.reduce((a, c) => a + c.unreadCount, 0)} new
                </span>
              )}
            </h2>
          </div>
          <InboxList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isLoading={isLoading}
          />
        </div>

        {/* Thread panel */}
        <div className={`${showThread ? "flex" : "hidden lg:flex"} flex-col flex-1 overflow-hidden`}>
          {selectedId !== null ? (
            <ThreadView
              key={selectedId}
              partnerId={selectedId}
              onBack={() => setSelectedId(null)}
              jobTitle={jobTitle}
              jobApplicationId={jobApplicationId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-semibold text-lg">Select a conversation</p>
              <p className="text-sm mt-1">Choose a conversation from your inbox to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
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
