import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, ArrowLeft, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Show } from "@clerk/react";
import { Redirect } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Message = { role: "user" | "assistant"; content: string };

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class='bg-muted px-1 rounded text-xs'>$1</code>")
    .replace(/\n/g, "<br/>");
}

export type ModuleConfig = {
  name: string;
  tagline: string;
  accentColor: string;
  bgGradient: string;
  iconBg: string;
  icon: React.ReactNode;
  moduleContext: string;
  welcome: string;
  suggestions: string[];
};

export default function SpecializedChat({ config }: { config: ModuleConfig }) {
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
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
          <div className="container mx-auto px-4 h-16 flex items-center gap-4">
            <a href={`${basePath}/dashboard`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </a>
            <div className="h-4 w-px bg-border" />
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.iconBg}`}>
              <span className={config.accentColor}>{config.icon}</span>
            </div>
            <div>
              <p className="font-bold text-sm leading-none">{config.name}</p>
              <p className="text-xs text-muted-foreground">{config.tagline}</p>
            </div>
          </div>
        </nav>

        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6 gap-4">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {m.role === "assistant" && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.iconBg}`}>
                    <span className={`${config.accentColor} [&>svg]:w-4 [&>svg]:h-4`}>{config.icon}</span>
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border rounded-tl-sm"
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) || (streaming && i === messages.length - 1 ? '<span class="animate-pulse">●●●</span>' : "") }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {config.suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-border bg-background/90 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={`Ask ${config.name} anything…`}
              className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              disabled={streaming}
            />
            <Button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              className="rounded-xl px-4"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            AI responses are for guidance only. Always verify with professional advice.
          </p>
        </div>
      </div>
    </>
  );
}
