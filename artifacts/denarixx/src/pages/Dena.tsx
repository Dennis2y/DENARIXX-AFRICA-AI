import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useAuth, Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import {
  Sparkles, Send, Loader2, Plus, Trash2, MessageSquare,
  ChevronLeft, Menu, X, Mic, MicOff, Volume2, VolumeX, Paperclip, FileText, Search, Library, UserCircle, Settings, LogOut, Briefcase, MessageCircle, ChevronDown, Zap, Brain, Bot, Copy, Check, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtifactPanel } from "../components/artifacts/ArtifactPanel";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Role = "user" | "assistant";
type MessageAttachment = { id: number; filename: string; type: "document" };
type Message = { role: Role; content: string; id?: number; attachments?: MessageAttachment[]; provider?: string; model?: string };
type PendingDocument = { id: number; filename: string; summary?: string | null; chunkCount?: number };
type Conversation = { id: number; title: string; updatedAt: string };
type LibraryDocument = { id: number; filename: string; summary?: string | null; updatedAt?: string; createdAt?: string };

const WELCOME: Message = {
  role: "assistant",
  content: "Hi! I'm **DENA** 🌍 — your personal AI guide to Africa's most powerful career platform.\n\nAsk me anything about your career, coding, project building, CVs, documents, skill development, or the African job market. I can help you write code, debug errors, build apps, explain documents, and improve your career. I remember our conversations so we can pick up where we left off!",
};

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        code(props) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");

          if (match) {
            return (
              <SyntaxHighlighter
                style={oneDark as any}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  fontSize: "0.8rem",
                  margin: "0.75rem 0",
                }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          }

          return (
            <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]" {...rest}>
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc pl-5 mb-2">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-5 mb-2">{children}</ol>;
        },
        pre({ children }) {
          return <>{children}</>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function TypewriterText({ text, isActive }: { text: string; isActive: boolean }) {
  return <MarkdownMessage content={text} />;
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
  const { getToken, signOut } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [careerToolsOpen, setCareerToolsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false);
  const [libraryDocuments, setLibraryDocuments] = useState<LibraryDocument[]>([]);
  const [pinnedConversationIds, setPinnedConversationIds] = useState<number[]>([]);
  const [conversationMenuId, setConversationMenuId] = useState<number | null>(null);
  const [aiProvider, setAiProvider] = useState("auto");
  const [aiMode, setAiMode] = useState("balanced");
  const [temporaryChat, setTemporaryChat] = useState(false);
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({ auto: true });
  const [providerModels, setProviderModels] = useState<Record<string, string>>({});
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const [settingsLanguage, setSettingsLanguage] = useState("English");
  const [customInstructions, setCustomInstructions] = useState("");
  const [appearanceMode, setAppearanceMode] = useState("dark");
  const [connectedServices, setConnectedServices] = useState<string[]>([]);
  const [billingPlan, setBillingPlan] = useState("Free");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  const speakText = useCallback(async (text: string) => {
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "Code block omitted from voice.")
      .replace(/\*\*/g, "")
      .replace(/[#_`>\-]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    if (!cleanText) return;

    try {
      setSpeaking(true);

      const token = await getToken();
      const response = await fetch(`${basePath}/api/voice/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ text: cleanText, voice: "nova" }),
      });

      if (!response.ok) throw new Error("Neural voice unavailable");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();
      return;
    } catch {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.92;
      utterance.pitch = 1.03;

      const lower = cleanText.toLowerCase();
      if (/[äöüß]|\b(hallo|guten|danke|bitte|karriere|lebenslauf)\b/.test(lower)) utterance.lang = "de-DE";
      else if (/[¿¡]|\b(hola|gracias|trabajo|habilidades)\b/.test(lower)) utterance.lang = "es-ES";
      else if (/\b(bonjour|merci|carrière|compétences|emploi)\b/.test(lower)) utterance.lang = "fr-FR";
      else utterance.lang = "en-US";

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [getToken]);

  const stopSpeaking = useCallback(() => {
    const audio = audioRef.current;

    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
        audio.load();
      } catch {}

      audioRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
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
      const token = await getToken();
      const res = await fetch(`${basePath}/api/dena/conversations`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {}
  }, [getToken]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dena-pinned-conversations");
      if (saved) setPinnedConversationIds(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    async function fetchProviderStatus() {
      try {
        const res = await fetch(`${basePath}/api/dena/ai-status`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setProviderStatus(data.providers ?? { auto: true });
        setProviderModels(data.models ?? {});
        setProviderModels(data.models ?? {});
      } catch {}
    }

    fetchProviderStatus();
  }, []);

  // Load a specific conversation
  const loadConversation = async (convId: number) => {
    if (loadingConv || convId === activeConvId) return;
    setLoadingConv(true);
    setSidebarOpen(false);
    try {
      const token = await getToken();
      const res = await fetch(`${basePath}/api/dena/conversations/${convId}/messages`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      const loaded: Message[] = data.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        id: m.id,
        provider: m.provider,
        model: m.model,
      }));
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
      const token = await getToken();
      await fetch(`${basePath}/api/dena/conversations/${convId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConvId === convId) newConversation();
    } catch {}
  };

  const copyMessage = async (content: string, index: number) => {
    const text = content.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageIndex(index);
      window.setTimeout(() => setCopiedMessageIndex(null), 1600);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedMessageIndex(index);
      window.setTimeout(() => setCopiedMessageIndex(null), 1600);
    }
  };

  const editUserMessage = (content: string, index: number) => {
    setInput(content);
    setMessages((prev) => prev.slice(0, index));
    setActiveConvId(null);
    setPendingDocument(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Send a message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    if (editingMessageIndex !== null) {
      setMessages((prev) => prev.slice(0, editingMessageIndex));
      setActiveConvId(null);
      setEditingMessageIndex(null);
    }

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
          preferredLanguage: localStorage.getItem("dena-language") || undefined,
          customInstructions: localStorage.getItem("dena-custom-instructions") || undefined,
          aiProvider,
          aiMode,
          temporaryChat,
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

  useEffect(() => {
    const savedLanguage = localStorage.getItem("dena-language");
    const savedInstructions = localStorage.getItem("dena-custom-instructions");
    const savedAppearance = localStorage.getItem("dena-appearance");
    const savedConnectors = localStorage.getItem("dena-connected-services");
    const savedPlan = localStorage.getItem("dena-billing-plan");

    if (savedLanguage) setSettingsLanguage(savedLanguage);
    if (savedInstructions) setCustomInstructions(savedInstructions);
    if (savedAppearance) applyAppearance(savedAppearance);
    if (savedConnectors) {
      try {
        setConnectedServices(JSON.parse(savedConnectors));
      } catch {}
    }
    if (savedPlan) setBillingPlan(savedPlan);
  }, []);

  const autoResizeComposer = () => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  };

  useEffect(() => {
    autoResizeComposer();
  }, [input]);

  const firstName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "Explorer";
  const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";
  const filteredConversations = conversations
    .filter((conv) => conv.title.toLowerCase().includes(sidebarSearch.toLowerCase()))
    .sort((a, b) => {
      const aPinned = pinnedConversationIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedConversationIds.includes(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const aiProviders = [
    { id: "auto", label: "Auto", description: "Uses configured fallback order" },
    { id: "openai", label: "OpenAI", description: "Uses OPENAI_API_KEY" },
    { id: "gemini", label: "Gemini", description: "Uses GEMINI_API_KEY" },
    { id: "anthropic", label: "Anthropic", description: "Uses ANTHROPIC_API_KEY" },
    { id: "groq", label: "Groq", description: "Uses GROQ_API_KEY" },
    { id: "mistral", label: "Mistral", description: "Uses MISTRAL_API_KEY" },
  ];

  const aiModes = [
    { id: "instant", label: "Instant", description: "Fast, direct answers", icon: Zap },
    { id: "balanced", label: "Balanced", description: "Best default quality/speed", icon: Bot },
    { id: "careful", label: "Careful", description: "More detailed, lower-risk answers", icon: Brain },
  ];

  const selectedProvider = aiProviders.find((p) => p.id === aiProvider) ?? aiProviders[0];
  const selectedMode = aiModes.find((m) => m.id === aiMode) ?? aiModes[1];

  const applyAppearance = (mode: string) => {
    setAppearanceMode(mode);
    localStorage.setItem("dena-appearance", mode);
    if (mode === "light") document.documentElement.classList.remove("dark");
    if (mode === "dark") document.documentElement.classList.add("dark");
    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  };

  const saveDenaSettings = () => {
    localStorage.setItem("dena-language", settingsLanguage);
    localStorage.setItem("dena-custom-instructions", customInstructions);
    localStorage.setItem("dena-appearance", appearanceMode);
    localStorage.setItem("dena-connected-services", JSON.stringify(connectedServices));
    localStorage.setItem("dena-billing-plan", billingPlan);
    setSettingsOpen(false);
  };

  const toggleConnector = (name: string) => {
    setConnectedServices((prev) => {
      const next = prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name];

      localStorage.setItem("dena-connected-services", JSON.stringify(next));
      return next;
    });
  };

  const exportDenaData = () => {
    const data = {
      profile: {
        firstName,
        email: userEmail,
      },
      settings: {
        language: settingsLanguage,
        appearance: appearanceMode,
        customInstructions,
        connectedServices,
        billingPlan,
      },
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        updatedAt: conv.updatedAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dena-data-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const startSettingsPrompt = (prompt: string) => {
    setSettingsOpen(false);
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const startSidebarPrompt = (prompt: string) => {
    setCareerToolsOpen(false);
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const openLibrary = () => {
    const uploadButton = document.querySelector('[aria-label="Attach document"]') as HTMLButtonElement | null;
    if (uploadButton) {
      uploadButton.click();
      return;
    }

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.click();
      return;
    }

    startSidebarPrompt("I want to upload or analyze a document in DENA.");
  };

  const loadLibrary = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${basePath}/api/dena/library`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      setLibraryDocuments(data.documents ?? []);
      setLibraryOpen(true);
    } catch {}
  };

  const openLibraryPanel = async () => {
    await loadLibrary();
  };

  const renameConversation = async (conv: Conversation) => {
    const nextTitle = window.prompt("Rename conversation", conv.title);
    if (!nextTitle || !nextTitle.trim()) return;

    try {
      const token = await getToken();
      const res = await fetch(`${basePath}/api/dena/conversations/${conv.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: nextTitle.trim() }),
      });

      if (!res.ok) return;

      const data = await res.json();
      setConversations((prev) => prev.map((item) => item.id === conv.id ? data.conversation : item));
      setConversationMenuId(null);
    } catch {}
  };

  const togglePinConversation = (convId: number) => {
    setPinnedConversationIds((prev) => {
      const next = prev.includes(convId)
        ? prev.filter((id) => id !== convId)
        : [...prev, convId];

      localStorage.setItem("dena-pinned-conversations", JSON.stringify(next));
      return next;
    });
    setConversationMenuId(null);
  };



  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Mobile sidebar overlay */}
      {/* DENA Account Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
          >
            <motion.div
              className="flex h-[78vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <aside className="w-60 border-r border-border bg-background/50 p-3">
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <input placeholder="Search settings" className="w-full bg-transparent text-sm outline-none" />
                </div>

                {[
                  ["general", "General"],
                  ["account", "Account"],
                  ["privacy", "Privacy"],
                  ["billing", "Billing"],
                  ["capabilities", "Capabilities"],
                  ["connectors", "Connectors"],
                  ["code", "DENA Code"],
                  ["language", "Language"],
                  ["help", "Help"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setSettingsTab(id)}
                    className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      settingsTab === id ? "bg-primary/15 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </aside>

              <main className="flex-1 overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
                  <div>
                    <h2 className="text-xl font-semibold">Settings</h2>
                    <p className="text-sm text-muted-foreground">Customize DENA for your work.</p>
                  </div>
                  <button onClick={() => setSettingsOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {settingsTab === "general" && (
                    <>
                      <h3 className="text-lg font-semibold">General</h3>
                      <div className="rounded-xl border border-border p-4">
                        <div className="mb-3 font-medium">Appearance</div>
                        <div className="flex gap-2">
                          {["light", "dark", "system"].map((mode) => (
                            <Button key={mode} variant={appearanceMode === mode ? "default" : "outline"} onClick={() => applyAppearance(mode)}>
                              {mode}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border p-4">
                        <div className="mb-2 font-medium">Instructions for DENA</div>
                        <textarea
                          value={customInstructions}
                          onChange={(e) => setCustomInstructions(e.target.value)}
                          placeholder="e.g. keep explanations brief, focus on coding, answer in English..."
                          className="min-h-28 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none"
                        />
                      </div>
                    </>
                  )}

                  {settingsTab === "account" && (
                    <>
                      <h3 className="text-lg font-semibold">Account</h3>
                      <div className="flex items-center gap-4 rounded-xl border border-border p-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold">
                          {firstName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{firstName}</div>
                          <div className="text-sm text-muted-foreground">{userEmail}</div>
                        </div>
                      </div>
                      <Button variant="destructive" onClick={() => signOut()}>Log out</Button>
                    </>
                  )}

                  {settingsTab === "privacy" && (
                    <>
                      <h3 className="text-lg font-semibold">Privacy</h3>
                      <div className="rounded-xl border border-border p-4">
                        <div className="font-medium">Data controls</div>
                        <p className="mt-1 text-sm text-muted-foreground">CVs, documents, conversations, and AI outputs should be protected before production launch.</p>
                      </div>
                      <Button variant="outline" onClick={exportDenaData}>Export my data</Button>
                    </>
                  )}

                  {settingsTab === "billing" && (
                    <>
                      <h3 className="text-lg font-semibold">Billing</h3>
                      <div className="rounded-xl border border-border p-4">
                        <div className="font-medium">Billing</div>
                        <p className="text-sm text-muted-foreground">
                          Billing is not connected yet. No fake plan switching is enabled.
                        </p>
                      </div>
                      <Button disabled variant="outline">Stripe billing not configured</Button>
                    </>
                  )}

                  {settingsTab === "capabilities" && (
                    <>
                      <h3 className="text-lg font-semibold">Capabilities</h3>
                      {["Coding Assistant", "CV Intelligence", "Job Match Engine", "Career Roadmaps", "Interview Coach", "Multi-document RAG", "ElevenLabs Voice"].map((cap) => (
                        <div key={cap} className="flex items-center justify-between rounded-xl border border-border p-4">
                          <span>{cap}</span>
                          <span className="text-xs text-green-400">Active</span>
                        </div>
                      ))}
                    </>
                  )}

                  {settingsTab === "connectors" && (
                    <>
                      <h3 className="text-lg font-semibold">Connectors</h3>
                      {[
                        {
                          name: "GitHub",
                          url: "https://github.com/settings/developers",
                          description: "Create a GitHub OAuth App before enabling repository/project access."
                        },
                        {
                          name: "LinkedIn",
                          url: "https://www.linkedin.com/developers/apps",
                          description: "Create a LinkedIn app before enabling profile/job data access."
                        },
                        {
                          name: "Google Drive",
                          url: "https://console.cloud.google.com/apis/credentials",
                          description: "Create Google OAuth credentials before enabling Drive document access."
                        },
                        {
                          name: "Gmail",
                          url: "https://console.cloud.google.com/apis/credentials",
                          description: "Create Google OAuth credentials before enabling Gmail access."
                        },
                        {
                          name: "Calendar",
                          url: "https://console.cloud.google.com/apis/credentials",
                          description: "Create Google OAuth credentials before enabling Calendar access."
                        },
                      ].map((conn) => (
                        <div key={conn.name} className="rounded-xl border border-border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium">{conn.name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{conn.description}</div>
                              <div className="mt-2 text-[11px] text-yellow-400">Setup required — real OAuth backend not connected yet.</div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(conn.url, "_blank", "noopener,noreferrer")}
                            >
                              Open setup
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {settingsTab === "code" && (
                    <>
                      <h3 className="text-lg font-semibold">DENA Code</h3>
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-sm text-muted-foreground">DENA can write code, explain code, debug errors, and generate file-by-file implementations.</p>
                      </div>
                      <Button onClick={() => startSettingsPrompt("Build me a React + Fastify project")}>Try DENA Code</Button>
                    </>
                  )}

                  {settingsTab === "language" && (
                    <>
                      <h3 className="text-lg font-semibold">Language</h3>
                      <select
                        value={settingsLanguage}
                        onChange={(e) => setSettingsLanguage(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none"
                      >
                        {["English", "German", "French", "Spanish", "Portuguese", "Italian"].map((lang) => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </>
                  )}

                  {settingsTab === "help" && (
                    <>
                      <h3 className="text-lg font-semibold">Help</h3>
                      <div className="grid gap-3">
                        <Button variant="outline" onClick={() => startSettingsPrompt("How do I use DENA?")}>How to use DENA</Button>
                        <Button variant="outline" onClick={() => startSettingsPrompt("How do I use SkillSwap?")}>How to use SkillSwap</Button>
                        <Button variant="outline" onClick={() => startSettingsPrompt("Analyze my CV")}>Analyze my CV</Button>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-3 border-t border-border pt-4">
                    <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                    <Button onClick={saveDenaSettings}>Save changes</Button>
                  </div>
                </div>
              </main>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DENA Library Modal */}
      <AnimatePresence>
        {libraryOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLibraryOpen(false)}
          >
            <motion.div
              className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl"
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="text-xl font-semibold">DENA Library</h2>
                  <p className="text-sm text-muted-foreground">Uploaded documents and saved workspace items.</p>
                </div>
                <button onClick={() => setLibraryOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-6 space-y-3">
                {libraryDocuments.length === 0 ? (
                  <div className="rounded-xl border border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground">No documents in your library yet.</p>
                    <Button className="mt-4" onClick={openLibrary}>Upload document</Button>
                  </div>
                ) : (
                  libraryDocuments.map((doc) => (
                    <div key={doc.id} className="rounded-xl border border-border p-4">
                      <div className="font-medium">{doc.filename}</div>
                      {doc.summary && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{doc.summary}</p>}
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startSettingsPrompt(`Analyze this document: ${doc.filename}`)}>
                          Analyze
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startSettingsPrompt(`Compare my CV document ${doc.filename} with this job description:`)}>
                          Job Match
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="hidden lg:flex h-full w-72 flex-shrink-0 flex-col border-r border-border bg-card">
        <div className="h-full w-72 flex flex-col border-r border-border bg-card">
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

          {/* Search */}
          <div className="p-3 border-b border-border/60">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Main actions */}
          <div className="p-3 space-y-1 border-b border-border/60">
            <Button onClick={newConversation} className="w-full justify-start gap-2" variant="ghost">
              <Plus className="w-4 h-4" />
              New chat
            </Button>
            <Button onClick={openLibraryPanel} className="w-full justify-start gap-2" variant="ghost">
              <Library className="w-4 h-4" />
              Library
            </Button>
            <Button
              onClick={() => setCareerToolsOpen((value) => !value)}
              className="w-full justify-start gap-2"
              variant="ghost"
            >
              <Briefcase className="w-4 h-4" />
              Career tools
            </Button>
            {careerToolsOpen && (
              <div className="ml-6 mt-1 space-y-1 border-l border-border pl-3">
                <button onClick={() => startSidebarPrompt("Analyze my CV")} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                  CV Intelligence
                </button>
                <button onClick={() => startSidebarPrompt("Compare my CV with this job description:")} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                  Job Match Engine
                </button>
                <button onClick={() => startSidebarPrompt("Create an AI Engineer roadmap for Germany")} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                  Career Roadmap
                </button>
                <button onClick={() => startSidebarPrompt("Practice an AI Engineer interview with me")} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                  Interview Coach
                </button>
                <button onClick={() => startSidebarPrompt("Help me build a React and Fastify project")} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                  Coding Assistant
                </button>
              </div>
            )}
          </div>

          <div className="px-3 pt-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Conversations
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {filteredConversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No saved conversations yet.<br />Start chatting to save history.</p>
            )}
            {filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors group flex items-start gap-2 ${activeConvId === conv.id ? "bg-primary/10 border border-primary/20 text-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-xs leading-tight">
                    {pinnedConversationIds.includes(conv.id) ? "📌 " : ""}{conv.title}
                  </div>
                  <div className="text-[10px] opacity-50 mt-0.5">{timeAgo(conv.updatedAt)}</div>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConversationMenuId(conversationMenuId === conv.id ? null : conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity px-1"
                  >
                    ⋯
                  </button>
                  {conversationMenuId === conv.id && (
                    <div className="absolute right-0 top-6 z-50 w-36 rounded-lg border border-border bg-card p-1 shadow-xl">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          renameConversation(conv);
                        }}
                        className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinConversation(conv.id);
                        }}
                        className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        {pinnedConversationIds.includes(conv.id) ? "Unpin" : "Pin"}
                      </button>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="w-full rounded-md px-2 py-1.5 text-left text-xs text-destructive hover:bg-muted"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
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

          {/* Account footer */}
          <div className="border-t border-border p-3">
            <button className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold">
                {firstName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-sm font-medium truncate">{firstName}</div>
                <div className="text-[10px] text-muted-foreground truncate">{userEmail}</div>
              </div>
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2 text-xs"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2 text-xs"
                onClick={() => signOut()}
              >
                <LogOut className="w-3.5 h-3.5" />
                Log out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed lg:hidden top-0 left-0 h-full w-72 z-40 flex flex-col border-r border-border bg-card transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
          <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

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
      </div>

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
          <div className="relative hidden sm:block">
            <button
              onClick={() => setModelMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted"
            >
              <span>{selectedProvider.label}</span>
              <span className="text-xs text-muted-foreground">· {selectedMode.label}</span>
              {temporaryChat && <span className="text-xs text-yellow-400">Temporary</span>}
              <ChevronDown className="w-4 h-4" />
            </button>

            {modelMenuOpen && (
              <div className="absolute right-0 top-10 z-50 max-h-[68vh] w-80 overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-2xl lg:max-h-[62vh]">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response mode</div>
                <div className="space-y-1">
                  {aiModes.map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setAiMode(mode.id)}
                        className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left ${
                          aiMode === mode.id ? "bg-primary/15 text-primary" : "hover:bg-muted"
                        }`}
                      >
                        <Icon className="mt-0.5 h-4 w-4" />
                        <div>
                          <div className="text-sm font-medium">{mode.label}</div>
                          <div className="text-xs text-muted-foreground">{mode.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="my-3 border-t border-border" />

                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI provider</div>
                <div className="space-y-1">
                  {aiProviders.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        if (provider.id === "auto" || providerStatus[provider.id]) setAiProvider(provider.id);
                      }}
                      disabled={provider.id !== "auto" && !providerStatus[provider.id]}
                      className={`flex w-full items-start justify-between rounded-lg px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
                        aiProvider === provider.id ? "bg-primary/15 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium">{provider.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {provider.id === "auto" ? provider.description : (providerModels[provider.id] || provider.description)}
                        </div>
                        <div className={`mt-1 text-[11px] ${providerStatus[provider.id] ? "text-green-400" : "text-red-400"}`}>
                          {providerStatus[provider.id] ? "Available" : "Not configured"}
                        </div>
                      </div>
                      {aiProvider === provider.id && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>

                <div className="my-3 border-t border-border" />

                <button
                  onClick={() => setTemporaryChat((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-muted"
                >
                  <div>
                    <div className="text-sm font-medium">Temporary chat</div>
                    <div className="text-xs text-muted-foreground">Do not save this chat to history</div>
                  </div>
                  <span className={`h-6 w-11 rounded-full p-1 transition-colors ${temporaryChat ? "bg-primary" : "bg-muted"}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${temporaryChat ? "translate-x-5" : ""}`} />
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground hidden lg:block">
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
                      <>
                        {(msg.provider || msg.model) && (
                          <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                            <span>DENA</span>
                            {msg.provider && <span>• {msg.provider}</span>}
                            {msg.model && <span>• {msg.model}</span>}
                          </div>
                        )}
                        <TypewriterText
                          text={msg.content}
                          isActive={streaming && i === messages.length - 1 && msg.content.length > 0}
                        />
                      </>
                    )}

                    {msg.content.trim() && (
                      <div className={`mt-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <button
                          type="button"
                          onClick={() => copyMessage(msg.content, i)}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors ${
                            msg.role === "user"
                              ? "bg-white/15 text-primary-foreground hover:bg-white/25"
                              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                          }`}
                          title="Copy message"
                        >
                          {copiedMessageIndex === i ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {msg.role === "user" && (
                          <button
                            type="button"
                            onClick={() => editUserMessage(msg.content, i)}
                            className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[11px] text-primary-foreground transition-colors hover:bg-white/25"
                            title="Edit message"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
              "Build me a React project",
              "Create an AI Engineer roadmap",
              "Analyze my CV",
              "Explain this code",
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
        <div className="border-t border-border bg-background/50 p-4 backdrop-blur-sm flex-shrink-0">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) uploadDocument(file);
            }}
            className={`mx-auto w-full max-w-4xl rounded-3xl border bg-card/95 shadow-2xl transition-colors ${
              dragActive ? "border-primary ring-2 ring-primary/30" : "border-border"
            }`}
          >
            {pendingDocument && (
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{pendingDocument.filename}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Attached to next message{pendingDocument.chunkCount ? ` • ${pendingDocument.chunkCount} chunks` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDocument(null)}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {dragActive && (
              <div className="border-b border-border px-4 py-3 text-center text-sm text-primary">
                Drop your file here to attach it to DENA
              </div>
            )}

            <div className="px-4 pt-4">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoResizeComposer();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!streaming && !loadingConv && input.trim()) sendMessage();
                  }
                }}
                placeholder={editingMessageIndex !== null ? "Edit your message and resend..." : "Ask DENA anything about your career..."}
                disabled={streaming || loadingConv}
                rows={1}
                className="max-h-[220px] min-h-[42px] w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
            </div>

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

            <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={streaming || loadingConv || uploadingDocument}
                  variant="outline"
                  className="h-10 rounded-2xl px-3 text-sm"
                  title="Upload document"
                >
                  {uploadingDocument ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
                  Attach
                </Button>

                <Button
                  type="button"
                  onClick={openLibraryPanel}
                  disabled={streaming || loadingConv}
                  variant="outline"
                  className="hidden h-10 rounded-2xl px-3 text-sm sm:inline-flex"
                  title="Open Library"
                >
                  <Library className="mr-2 h-4 w-4" />
                  Library
                </Button>

                <Button
                  type="button"
                  onClick={() => setArtifactPanelOpen(true)}
                  disabled={streaming || loadingConv}
                  variant="outline"
                  className="hidden h-10 rounded-2xl px-3 text-sm lg:inline-flex"
                  title="Open Canvas"
                >
                  Canvas
                </Button>

                <Button
                  type="button"
                  onClick={() => setCareerToolsOpen((value) => !value)}
                  disabled={streaming || loadingConv}
                  variant="outline"
                  className="hidden h-10 rounded-2xl px-3 text-sm md:inline-flex"
                  title="Career tools"
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  Career Tools
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setModelMenuOpen((value) => !value)}
                  disabled={streaming || loadingConv}
                  variant="outline"
                  className="hidden h-10 rounded-2xl px-3 text-xs sm:inline-flex"
                  title="AI model"
                >
                  {selectedProvider.label} · {selectedMode.label}
                  <ChevronDown className="ml-2 h-3.5 w-3.5" />
                </Button>

                <Button
                  type="button"
                  onClick={toggleListening}
                  disabled={streaming || loadingConv}
                  variant="outline"
                  className={`h-10 w-10 rounded-2xl p-0 flex-shrink-0 ${listening ? "border-red-400 text-red-400 animate-pulse" : ""}`}
                  title={listening ? "Stop listening" : "Speak to DENA"}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>

                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming || loadingConv}
                  className={`h-10 w-10 rounded-2xl p-0 flex-shrink-0 ${
                    input.trim() && !streaming && !loadingConv ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                  }`}
                  title={streaming ? "DENA is responding" : "Send"}
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {uploadingDocument ? "Uploading document…" : listening ? "Listening… speak now." : speaking ? "DENA is speaking…" : "DENA can make mistakes. Verify important info."}
          </p>
        </div>
      <ArtifactPanel
        open={artifactPanelOpen}
        onClose={() => setArtifactPanelOpen(false)}
        basePath={basePath}
        getToken={getToken}
      />

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
