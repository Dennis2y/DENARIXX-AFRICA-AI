import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useAuth, Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import {
  Sparkles, Send, Loader2, Plus, Trash2, MessageSquare,
  ChevronLeft, Menu, X, Mic, MicOff, Volume2, VolumeX, Paperclip, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Role = "user" | "assistant";
type MessageAttachment = { id: number; filename: string; type: "document" };
type Message = { role: Role; content: string; id?: number; attachments?: MessageAttachment[] };
type PendingDocument = { id: number; filename: string; summary?: string | null; chunkCount?: number };
type Conversation = { id: number; title: string; updatedAt: string };

const WELCOME: Message = {
  role: "assistant",
  content: "Hi! I'm **DENA** 🌍 — your personal AI guide to Africa's most powerful career platform.\n\nAsk me anything about your career, the platform, skill development, or the African job market. I remember our conversations so we can pick up where we left off!",
};

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class='bg-muted px-1 rounded text-xs font-mono'>$1</code>")
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

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function DenaPageContent() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);



  const uploadDocument = useCallback(async (file: File) => {
    const allowed = ["txt", "md", "json", "csv", "pdf", "docx", "doc"];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (!allowed.includes(ext)) {
      alert("DENA supports TXT, MD, JSON, CSV, PDF, DOCX, and DOC files.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Please upload a file under 10 MB.");
      return;
    }

    setUploadingDocument(true);

    try {
      let content = "";

      if (["txt", "md", "json", "csv"].includes(ext)) {
        content = await file.text();
      } else {
        const arrayBuffer = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(arrayBuffer);
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        content = btoa(binary);
      }

      const token = await getToken();

      const res = await fetch(`${basePath}/api/documents/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type || `text/${ext}`,
          content,
          encoding: ["pdf", "docx", "doc"].includes(ext) ? "base64" : "text",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setPendingDocument({
        id: data.document.id,
        filename: data.document.filename,
        summary: data.document.summary,
        chunkCount: data.document.chunkCount,
      });

      setInput((prev) => prev || "");
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I could not upload that document. ${err.message ?? "Please try again."}`,
        },
      ]);
    } finally {
      setUploadingDocument(false);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }, [getToken]);


  const speechSupported =
    typeof window !== "undefined" &&
    (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window));

  const speakText = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/[#_`>\-]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1;
    utterance.pitch = 1;

    const lower = cleanText.toLowerCase();
    if (/[äöüß]|\b(hallo|guten|danke|bitte|karriere|lebenslauf)\b/.test(lower)) utterance.lang = "de-DE";
    else if (/[¿¡]|\b(hola|gracias|trabajo|habilidades)\b/.test(lower)) utterance.lang = "es-ES";
    else if (/\b(bonjour|merci|carrière|compétences|emploi)\b/.test(lower)) utterance.lang = "fr-FR";
    else utterance.lang = "en-US";

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!speechSupported) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript.trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [listening, speechSupported]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);


  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Load conversation list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${basePath}/api/dena/conversations`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Load a specific conversation
  const loadConversation = async (convId: number) => {
    if (loadingConv || convId === activeConvId) return;
    setLoadingConv(true);
    setSidebarOpen(false);
    try {
      const res = await fetch(`${basePath}/api/dena/conversations/${convId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      const loaded: Message[] = data.messages.map((m: any) => ({ role: m.role, content: m.content, id: m.id }));
      setMessages(loaded.length ? loaded : [WELCOME]);
      setActiveConvId(convId);
    } catch {
      setMessages([WELCOME]);
      setActiveConvId(null);
    } finally {
      setLoadingConv(false);
    }
  };

  // Start a new conversation
  const newConversation = () => {
    setActiveConvId(null);
    setMessages([WELCOME]);
    setInput("");
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Delete a conversation
  const deleteConversation = async (convId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${basePath}/api/dena/conversations/${convId}`, { method: "DELETE", credentials: "include" });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConvId === convId) newConversation();
    } catch {}
  };

  // Send a message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: Message = {
      role: "user",
      content: text,
      attachments: pendingDocument
        ? [{ id: pendingDocument.id, filename: pendingDocument.filename, type: "document" }]
        : undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMsg]);

    let resolvedConvId = activeConvId;

    try {
      const token = await getToken();

      const res = await fetch(`${basePath}/api/dena/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          message: text,
          conversationId: activeConvId ?? undefined,
          documentId: pendingDocument?.id,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Failed");

      const convIdHeader = res.headers.get("X-Conversation-Id");
      if (convIdHeader) {
        resolvedConvId = Number(convIdHeader);
        setActiveConvId(resolvedConvId);
      }

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
            if (data.done) {
              if (data.conversationId) {
                resolvedConvId = data.conversationId;
                setActiveConvId(data.conversationId);
              }
              break;
            }
            if (data.content) {
              setMessages(prev => {
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

      if (pendingDocument) setPendingDocument(null);

      // Refresh conversation list to show new/updated entry
      await fetchConversations();
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting right now. Please try again! 🌍",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const firstName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "Explorer";

  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed lg:static lg:translate-x-0 top-0 left-0 h-full w-72 z-40 flex flex-col border-r border-border bg-card lg:flex"
        style={{ transform: undefined }}
      >
        <div className={`fixed lg:static top-0 left-0 h-full w-72 z-40 flex flex-col border-r border-border bg-card transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
          {/* Sidebar header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm">DENA AI</div>
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                  Online
                </div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New chat button */}
          <div className="p-3">
            <Button
              onClick={newConversation}
              className="w-full gap-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
              variant="ghost"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </Button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No saved conversations yet.<br />Start chatting to save history.</p>
            )}
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors group flex items-start gap-2 ${activeConvId === conv.id ? "bg-primary/10 border border-primary/20 text-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-xs leading-tight">{conv.title}</div>
                  <div className="text-[10px] opacity-50 mt-0.5">{timeAgo(conv.updatedAt)}</div>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            ))}
          </div>

          {/* User info */}
          <div className="p-3 border-t border-border">
            <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </motion.aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </Link>
          <div className="flex-1">
            {activeConvId ? (
              <p className="text-sm text-muted-foreground truncate">
                {conversations.find(c => c.id === activeConvId)?.title ?? "Conversation"}
              </p>
            ) : (
              <p className="text-sm font-medium">New Conversation</p>
            )}
          </div>
          <div className="text-sm text-muted-foreground hidden sm:block">
            Hey, {firstName} 👋
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingConv ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.attachments?.length ? (
                      <div className="mb-2 space-y-1">
                        {msg.attachments.map((attachment) => (
                          <div
                            key={`${attachment.type}-${attachment.id}`}
                            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-2.5 py-1.5 text-xs"
                          >
                            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{attachment.filename}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {msg.role === "user" ? (
                      <span>{msg.content}</span>
                    ) : (
                      <TypewriterText
                        text={msg.content}
                        isActive={streaming && i === messages.length - 1 && msg.content.length > 0}
                      />
                    )}
                  </div>
                  {msg.role === "assistant" && msg.content.trim() && (
                    <button
                      onClick={() => speaking ? stopSpeaking() : speakText(msg.content)}
                      className="ml-2 mt-2 text-muted-foreground hover:text-primary transition-colors"
                      title={speaking ? "Stop speaking" : "Read aloud"}
                    >
                      {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  )}
                </motion.div>
              ))}
              {streaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Prompt suggestions (only for new conversations) */}
        {!activeConvId && messages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2 justify-center">
            {[
              "How do I use SkillSwap?",
              "Build me a CV",
              "Career advice for Africa",
              "What jobs match my profile?",
            ].map(prompt => (
              <button
                key={prompt}
                onClick={() => { setInput(prompt); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t border-border bg-background/50 backdrop-blur-sm flex-shrink-0">
          {pendingDocument && (
            <div className="max-w-3xl mx-auto mb-2 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{pendingDocument.filename}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Attached to next message{pendingDocument.chunkCount ? ` • ${pendingDocument.chunkCount} chunks` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingDocument(null)}
                className="text-muted-foreground hover:text-red-400 transition-colors"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask DENA anything about your career..."
              disabled={streaming || loadingConv}
              className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 placeholder:text-muted-foreground disabled:opacity-50 transition-colors"
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".txt,.md,.json,.csv,.pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDocument(file);
              }}
            />
            <Button
              type="button"
              onClick={() => documentInputRef.current?.click()}
              disabled={streaming || loadingConv || uploadingDocument}
              variant="outline"
              className="rounded-xl h-11 w-11 p-0 flex-shrink-0"
              title="Upload document"
            >
              {uploadingDocument ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>
            <Button
              type="button"
              onClick={toggleListening}
              disabled={streaming || loadingConv}
              variant="outline"
              className={`rounded-xl h-11 w-11 p-0 flex-shrink-0 ${listening ? "border-red-400 text-red-400 animate-pulse" : ""}`}
              title={listening ? "Stop listening" : "Speak to DENA"}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || streaming || loadingConv}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11 w-11 p-0 flex-shrink-0"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            {uploadingDocument ? "Uploading document…" : listening ? "Listening… speak now." : speaking ? "DENA is speaking…" : "DENA can make mistakes. Verify important info."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DenaPage() {
  return (
    <>
      <Show when="signed-in">
        <DenaPageContent />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}
