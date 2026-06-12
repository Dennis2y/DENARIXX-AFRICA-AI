import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Minimize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content: "Hi! I'm **DENA** 🌍 — your AI guide to Africa's most powerful career platform.\n\nAsk me anything about SkillSwap, the CV Builder, job matching, or how to grow your career across Africa!",
};

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

function TypewriterText({ text, isActive }: { text: string; isActive: boolean }) {
  const [pos, setPos] = useState(() => (isActive ? 0 : text.length));

  useEffect(() => {
    if (!isActive) { setPos(text.length); return; }
    if (pos >= text.length) return;
    const t = setTimeout(() => setPos(p => Math.min(p + 3, text.length)), 8);
    return () => clearTimeout(t);
  }, [isActive, pos, text]);

  if (!isActive) return <span dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
  const displayed = text.slice(0, pos);
  const done = pos >= text.length;
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: renderMarkdown(displayed) + (!done ? '<span style="display:inline-block;width:2px;height:0.9em;background:currentColor;opacity:0.8;margin-left:1px;vertical-align:middle;border-radius:1px;animation:pulse 1s cubic-bezier(0.4,0,0.6,1) infinite"></span>' : ""),
      }}
    />
  );
}

export default function DenaChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const history = messages.slice(1); // skip welcome
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch(`${basePath}/api/dena/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok || !res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + data.content,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting right now. Please try again! 🌍",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center justify-center text-primary-foreground"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-background animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-primary/30 bg-card shadow-[0_0_40px_rgba(0,229,255,0.15)] flex flex-col overflow-hidden"
            style={{ height: "min(520px, calc(100dvh - 48px))" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-primary/5">
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">DENA AI</div>
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Online
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setOpen(false); setMessages([WELCOME]); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <TypewriterText
                        text={msg.content}
                        isActive={streaming && i === messages.length - 1 && msg.content.length > 0}
                      />
                    )}
                  </div>
                </motion.div>
              ))}
              {streaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-background/50 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Ask DENA anything..."
                disabled={streaming}
                className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-transparent focus:border-primary/40 placeholder:text-muted-foreground disabled:opacity-50"
              />
              <Button
                size="sm"
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-9 w-9 p-0"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
