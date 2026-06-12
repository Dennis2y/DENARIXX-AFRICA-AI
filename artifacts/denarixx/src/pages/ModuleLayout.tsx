import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Show } from "@clerk/react";
import { Redirect, useLocation } from "wouter";
import { ArrowLeft, Send, Loader2, LayoutDashboard, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Message = { role: "user" | "assistant"; content: string };

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class='bg-muted px-1 py-0.5 rounded text-[11px] font-mono'>$1</code>")
    .replace(/\n/g, "<br/>");
}

export type QuickAction = {
  icon: React.ReactNode;
  label: string;
  prompt: string;
};

export type InfoCard = {
  icon: string;
  title: string;
  value: string;
  sub: string;
};

export type ModuleLayoutConfig = {
  name: string;
  tagline: string;
  icon: React.ReactNode;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  moduleContext: string;
  welcome: string;
  suggestions: string[];
  quickActions: QuickAction[];
  infoCards: InfoCard[];
};

function AiChatPanel({
  config,
  onPrompt,
  externalPrompt,
}: {
  config: ModuleLayoutConfig;
  onPrompt?: (p: string) => void;
  externalPrompt?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: config.welcome },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (externalPrompt) send(externalPrompt);
  }, [externalPrompt]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setStreaming(true);

    try {
      const res = await fetch(`${basePath}/api/dena/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg, moduleContext: config.moduleContext }),
      });
      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              full += data.content;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: full };
                return next;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {m.role === "assistant" && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${config.accentBg} ${config.accentBorder} border`}>
                  <span className={`${config.accentText} [&>svg]:w-3.5 [&>svg]:h-3.5`}>{config.icon}</span>
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/60 border border-border/50 rounded-tl-sm"
                }`}
                dangerouslySetInnerHTML={{
                  __html:
                    renderMarkdown(m.content) ||
                    (streaming && i === messages.length - 1
                      ? '<span class="animate-pulse text-muted-foreground">●●●</span>'
                      : ""),
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {config.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="px-4 pb-4 pt-2 border-t border-border/50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={`Ask ${config.name}…`}
            className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            disabled={streaming}
          />
          <Button size="sm" onClick={() => send()} disabled={!input.trim() || streaming} className="rounded-xl px-3">
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-1.5">AI guidance only — verify with professionals</p>
      </div>
    </div>
  );
}

export default function ModuleLayout({ config }: { config: ModuleLayoutConfig }) {
  const [, setLocation] = useLocation();
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>();
  const [mobileTab, setMobileTab] = useState<"dashboard" | "chat">("dashboard");
  const promptKey = useRef(0);

  function triggerPrompt(prompt: string) {
    setMobileTab("chat");
    promptKey.current += 1;
    setPendingPrompt(prompt + `\u200B`.repeat(promptKey.current));
  }

  return (
    <>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
        {/* Nav */}
        <nav className="border-b border-border bg-background/90 backdrop-blur-lg shrink-0 z-40">
          <div className="px-4 h-14 flex items-center gap-3">
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="h-4 w-px bg-border" />
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${config.accentBg} ${config.accentBorder} border`}>
              <span className={`${config.accentText} [&>svg]:w-3.5 [&>svg]:h-3.5`}>{config.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-none truncate">{config.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{config.tagline}</p>
            </div>

            {/* Mobile tabs */}
            <div className="flex lg:hidden items-center gap-1 bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setMobileTab("dashboard")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mobileTab === "dashboard" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <LayoutDashboard className="w-3 h-3" />
                Board
              </button>
              <button
                onClick={() => setMobileTab("chat")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mobileTab === "chat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                Chat
              </button>
            </div>
          </div>
        </nav>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar — always visible on lg, tab-controlled on mobile */}
          <div
            className={`
              w-full lg:w-72 xl:w-80 shrink-0 border-r border-border overflow-y-auto
              ${mobileTab === "dashboard" ? "flex" : "hidden"} lg:flex
              flex-col
            `}
          >
            {/* Quick Actions */}
            <div className="p-4 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</p>
              <div className="space-y-1.5">
                {config.quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => triggerPrompt(action.prompt)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all text-left group`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${config.accentBg} ${config.accentBorder} border group-hover:scale-105 transition-transform`}>
                      <span className={`${config.accentText} [&>svg]:w-3.5 [&>svg]:h-3.5`}>{action.icon}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Info Cards */}
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Module Stats</p>
              <div className="space-y-2">
                {config.infoCards.map((card, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
                  >
                    <span className="text-xl shrink-0">{card.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-base font-black ${config.accentText} leading-none`}>{card.value}</p>
                      <p className="text-xs font-semibold text-foreground/80 truncate">{card.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{card.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat panel */}
          <div className={`flex-1 min-w-0 ${mobileTab === "chat" ? "flex" : "hidden"} lg:flex flex-col min-h-0`}>
            <AiChatPanel
              key={config.name}
              config={config}
              externalPrompt={pendingPrompt}
            />
          </div>
        </div>
      </div>
    </>
  );
}
