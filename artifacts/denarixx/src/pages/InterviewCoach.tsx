import { useState, useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { motion, AnimatePresence } from "framer-motion";
import { Show, useAuth } from "@clerk/react";
import { Redirect, Link } from "wouter";
import {
  ChevronLeft, Mic, Send, Loader2, Star, CheckCircle, RotateCcw,
  MessageSquare, Trophy, TrendingUp, Clock, ChevronRight, X
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTypewriterText } from "@/hooks/useTypewriterText";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

async function authHeaders(getToken: () => Promise<string | null>, json = false) {
  const token = await getToken();
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type InterviewType = "behavioral" | "technical" | "live-coding" | "live-debugging" | "mixed";
type Step = "setup" | "interview" | "complete";

type Answer = {
  questionIndex: number;
  question: string;
  answer: string;
  feedback: { score: number; strengths: string; improvements: string; betterAnswer: string };
};

type Session = {
  id: number;
  role: string;
  interviewType: string;
  questions: any[];
  answers: Answer[];
};

type PastSession = {
  id: number;
  role: string;
  interviewType: string;
  score: number | null;
  overallFeedback: string | null;
  completedAt: string | null;
  createdAt: string;
  questionCount: number;
  answerCount: number;
};

const TYPE_OPTS: { value: InterviewType; label: string; desc: string; color: string }[] = [
  { value: "behavioral", label: "Behavioral", desc: "Situational & soft-skill questions", color: "text-blue-400" },
  { value: "technical", label: "Technical", desc: "Skills, tools & problem-solving", color: "text-purple-400" },
  { value: "live-coding", label: "Live Coding", desc: "Solve coding tasks like a real technical interview", color: "text-green-400" },
  { value: "live-debugging", label: "Live Debugging", desc: "Find bugs, explain fixes, and reason out loud", color: "text-orange-400" },
  { value: "mixed", label: "Mixed", desc: "Best of all modes — recommended", color: "text-primary" },
];

const POPULAR_ROLES = [
  "Software Engineer", "Product Manager", "Data Scientist", "UI/UX Designer",
  "Backend Developer", "Frontend Developer", "DevOps Engineer", "Business Analyst",
  "Digital Marketing Manager", "Full-Stack Developer",
];

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? "text-green-400 bg-green-400/10 border-green-400/20"
    : score >= 6 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
    : "text-orange-400 bg-orange-400/10 border-orange-400/20";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-bold ${color}`}>
      <Star className="w-3 h-3" /> {score}/10
    </span>
  );
}

function SetupStep({
  onStart,
}: {
  onStart: (role: string, type: InterviewType) => Promise<void>;
}) {
  const [role, setRole] = useState("");
  const [type, setType] = useState<InterviewType>("mixed");
  const [loading, setLoading] = useState(false);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const { toast } = useToast();
  const { getToken } = useAuth();

  useEffect(() => {
    authHeaders(getToken)
      .then((headers) =>
        fetch(`${basePath}/api/interview-coach/sessions`, {
          credentials: "include",
          headers,
        })
      )
      .then(r => r.json())
      .then(d => setPastSessions(d.sessions ?? []))
      .catch(() => {});
  }, []);

  const start = async () => {
    if (!role.trim()) { toast({ title: "Enter a role to interview for", variant: "destructive" }); return; }
    setLoading(true);
    try { await onStart(role.trim(), type); }
    catch { toast({ title: "Failed to start session. Try again.", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Interview Coach <span className="text-primary">AI</span></h1>
        <p className="text-sm text-muted-foreground">Practice real interview questions and get instant AI feedback. Powered by your profile.</p>
      </div>

      {/* Role */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Target Role</h2>
        <input
          value={role}
          onChange={e => setRole(e.target.value)}
          onKeyDown={e => e.key === "Enter" && start()}
          placeholder="e.g. Senior Frontend Engineer, Product Manager..."
          className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary/50 transition-colors"
        />
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_ROLES.filter(r => !role || r.toLowerCase().includes(role.toLowerCase())).slice(0, 8).map(r => (
            <button key={r} onClick={() => setRole(r)} className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Type */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Interview Style</h2>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              className={`p-3 rounded-xl border text-left transition-all ${type === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}
            >
              <div className={`text-sm font-semibold mb-0.5 ${type === opt.value ? "text-primary" : opt.color}`}>{opt.label}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{opt.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <Button onClick={start} disabled={loading} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating questions...</> : <><Mic className="w-4 h-4" />Start Interview</>}
      </Button>

      {/* Past sessions */}
      {pastSessions.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Recent Sessions</h2>
          {pastSessions.slice(0, 5).map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{s.role}</p>
                <p className="text-xs text-muted-foreground">{s.interviewType} · {s.answerCount}/{s.questionCount} answered · {new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
              {s.score !== null && <ScoreBadge score={s.score} />}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function InterviewStep({
  session,
  onComplete,
}: {
  session: Session;
  onComplete: (answers: Answer[], overallFeedback: string, score: number) => void;
}) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [codeAnswer, setCodeAnswer] = useState("");
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("medium");
  const [testCases, setTestCases] = useState<any[]>([]);
  const [generatingTests, setGeneratingTests] = useState(false);
  const [runningCode, setRunningCode] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [terminalCommand, setTerminalCommand] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debuggingCode, setDebuggingCode] = useState(false);
  const [systemDesignAnswer, setSystemDesignAnswer] = useState("");
  const [systemDesignReview, setSystemDesignReview] = useState<any>(null);
  const [reviewingSystemDesign, setReviewingSystemDesign] = useState(false);
  const [debugging, setDebugging] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<Answer["feedback"] | null>(null);
  const [liveReply, setLiveReply] = useState<any>(null);
  const [liveThinking, setLiveThinking] = useState(false);
  const typedCurrentFeedback = useTypewriterText(currentFeedback?.betterAnswer ?? "", evaluating ? 0 : 8);
  const [completing, setCompleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  const totalQ = session.questions.length;
  const rawQuestion = session.questions[currentQ] as any;
  const question = typeof rawQuestion === "string" ? rawQuestion : rawQuestion?.question ?? String(rawQuestion ?? "");
  const isCodingMode =
    session.interviewType === "live-coding" ||
    session.interviewType === "live-debugging";
  const isSystemDesignMode = session.interviewType === "system-design";
  const isLastQ = currentQ === totalQ - 1;
  const allAnswered = answers.length === totalQ;
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  const speakQuestion = async () => {
    try {
      const response = await fetch(`${basePath}/api/interview-coach/voice`, {
        method: "POST",
        credentials: "include",
        headers: await authHeaders(getToken, true),
        body: JSON.stringify({ text: question }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
    } catch {
      toast({ title: "Could not play interviewer voice", variant: "destructive" });
    }
  };

  const startVoiceAnswer = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({ title: "Speech recognition is not supported in this browser", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    transcriptRef.current = "";

    recognition.onstart = () => {
      setListening(true);
      toast({ title: "Listening started", description: "Speak naturally, then click Stop & let AI respond." });
    };

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const cleaned = transcript.trim();
      transcriptRef.current = cleaned;
      setAnswer(cleaned);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      setListening(false);
      toast({ title: "Voice recording failed", description: event?.error || "Try again.", variant: "destructive" });
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setListening(false);
    }
  };

  const playText = async (text: string) => {
    const response = await fetch(`${basePath}/api/interview-coach/voice`, {
      method: "POST",
      credentials: "include",
      headers: await authHeaders(getToken, true),
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error("Voice failed");

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.onended = () => URL.revokeObjectURL(audioUrl);
    await audio.play();
  };


  useEffect(() => {
    if (!isCodingMode || !terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "Menlo, Monaco, Consolas, monospace",
      rows: 10,
      convertEol: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(terminalRef.current);
    fit.fit();

    term.writeln("DENARIXX Interview IDE Terminal");
    term.writeln("Ready. Generate tests, run tests, and debug like a real coding interview.");
    term.writeln("");

    xtermRef.current = term;

    return () => {
      term.dispose();
      xtermRef.current = null;
    };
  }, [isCodingMode]);

  const terminalLog = (message: string) => {
    xtermRef.current?.writeln(message);
  };

  const runTerminalCommand = async () => {
    const cmd = terminalCommand.trim();
    if (!cmd) return;

    setTerminalHistory(prev => [...prev, cmd]);
    terminalLog(`$ ${cmd}`);
    setTerminalCommand("");

    if (cmd === "clear") {
      clearTerminal();
      return;
    }

    if (["run", "npm test", "python main.py", "denarixx run-tests"].includes(cmd)) {
      await runCodeAgainstTests();
      return;
    }

    if (["debug", "denarixx debug"].includes(cmd)) {
      await debugCodeWithAI();
      return;
    }

    if (cmd === "help") {
      terminalLog("Available commands: run, debug, clear, help");
      return;
    }

    terminalLog(`Command not available in browser sandbox: ${cmd}`);
    terminalLog("Try: run, debug, clear, help");
  };

  const clearTerminal = () => {
    xtermRef.current?.clear();
    xtermRef.current?.writeln("Terminal cleared.");
  };


  const stopVoiceAnswer = async () => {
    recognitionRef.current?.stop?.();
    setListening(false);

    const spokenAnswer = (transcriptRef.current || answer).trim();
    if (!spokenAnswer) {
      toast({ title: "No voice answer detected", description: "Speak first, then stop the recording.", variant: "destructive" });
      return;
    }

    setAnswer(spokenAnswer);

    setLiveThinking(true);
    try {
      const res = await fetch(`${basePath}/api/interview-coach/live-reply`, {
        method: "POST",
        credentials: "include",
        headers: await authHeaders(getToken, true),
        body: JSON.stringify({
          role: session.role,
          question,
          answer: spokenAnswer,
          interviewType: session.interviewType,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setLiveReply(data);

      if (data.spokenReply) {
        await playText(data.spokenReply);
      }
      if (data.followUpQuestion) {
        await playText(data.followUpQuestion);
      }
    } catch {
      toast({ title: "Live interviewer response failed", variant: "destructive" });
    } finally {
      setLiveThinking(false);
    }
  };

  useEffect(() => {
    speakQuestion();
    return () => window.speechSynthesis?.cancel();
  }, [currentQ]);

  useEffect(() => {
    if (!isCodingMode || codeAnswer.trim()) return;

    const starter =
      session.interviewType === "live-debugging"
        ? `# Debug the code for this interview question:\n# ${String(question).replace(/\n/g, "\n# ")}\n\n`
        : language === "python"
          ? `# Solve this interview question:\n# ${String(question).replace(/\n/g, "\n# ")}\n\n\ndef solution():\n    pass\n`
          : language === "javascript"
            ? `// Solve this interview question:\n// ${String(question).replace(/\n/g, "\n// ")}\n\nfunction solution() {\n  \n}\n`
            : `// Solve this interview question:\n// ${String(question).replace(/\n/g, "\n// ")}\n\n`;

    setCodeAnswer(starter);
  }, [currentQ, isCodingMode, language]);


  
const generateTestCases = async () => {
  if (!isCodingMode) return;

  setGeneratingTests(true);

  try {
    const res = await fetch(
      `${basePath}/api/interview-coach/generate-test-cases`,
      {
        method: "POST",
        headers: await authHeaders(getToken, true),
        credentials: "include",
        body: JSON.stringify({
          question,
          language,
        }),
      }
    );

    if (!res.ok) throw new Error();

    const data = await res.json();

    setTestCases(data.testCases || []);
    terminalLog(`Generated ${(data.testCases || []).length} test cases.`);

    toast({
      title: `Generated ${(data.testCases || []).length} test cases`,
    });
  } catch {
    toast({
      title: "Failed to generate test cases",
      variant: "destructive",
    });
  } finally {
    setGeneratingTests(false);
  }
};



  const debugCode = async () => {
    if (!isCodingMode || !codeAnswer.trim()) return;

    setDebugging(true);
    terminalLog("$ denarixx debug-code");
    terminalLog(`Language: ${language}`);
    terminalLog("AI debugger analyzing code...");

    try {
      const res = await fetch(`${basePath}/api/interview-coach/debug-code`, {
        method: "POST",
        headers: await authHeaders(getToken, true),
        credentials: "include",
        body: JSON.stringify({
          question,
          code: codeAnswer.trim(),
          language,
        }),
      });

      if (!res.ok) throw new Error("Debug failed");

      const data = await res.json();
      setDebugResult(data.debug);

      terminalLog(`Debugger: ${data.debug?.errorType || "Analysis complete"}`);
      terminalLog(`Severity: ${data.debug?.severity || "medium"}`);
      terminalLog(`Line: ${data.debug?.line || "unknown"}`);
      if (data.debug?.interviewerComment) terminalLog(`AI Interviewer: ${data.debug.interviewerComment}`);

      if (data.debug?.interviewerComment) {
        await playText(data.debug.interviewerComment);
      }
    } catch {
      toast({ title: "AI debugging failed", variant: "destructive" });
      terminalLog("Debug failed.");
    } finally {
      setDebugging(false);
    }
  };


const runCodeAgainstTests = async () => {
    if (!isCodingMode || !codeAnswer.trim()) return;

    setRunningCode(true);
    terminalLog("$ denarixx run-tests");
    terminalLog(`Language: ${language}`);
    terminalLog("Running AI test simulation...");
    try {
      const cases = testCases.length > 0 ? testCases : [];

      const res = await fetch(`${basePath}/api/interview-coach/run-code`, {
        method: "POST",
        headers: await authHeaders(getToken, true),
        credentials: "include",
        body: JSON.stringify({
          question,
          code: codeAnswer.trim(),
          language,
          testCases: cases,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRunResult(data);
      terminalLog(`Result: ${data.passed ?? 0} passed / ${data.failed ?? 0} failed`);
      if (Array.isArray(data.results)) {
        data.results.forEach((r: any, i: number) => {
          terminalLog(`${i + 1}. ${(r.status || "result").toUpperCase()} - ${r.name || "Test"}: ${r.reason || ""}`);
        });
      }
      if (data.runtimeAnalysis) terminalLog(`Complexity: ${data.runtimeAnalysis}`);
      if (data.interviewerComment) terminalLog(`AI Interviewer: ${data.interviewerComment}`);

      if (data.interviewerComment) {
        await playText(data.interviewerComment);
      }
    } catch {
      toast({ title: "Failed to run tests", variant: "destructive" });
    } finally {
      setRunningCode(false);
    }
  };


  const debugCodeWithAI = async () => {
    if (!isCodingMode || !codeAnswer.trim()) return;

    setDebuggingCode(true);
    terminalLog("$ denarixx debug-code");
    terminalLog(`Language: ${language}`);
    terminalLog("Analyzing code path, variables, missing imports, edge cases...");

    try {
      const res = await fetch(`${basePath}/api/interview-coach/review-code`, {
        method: "POST",
        headers: await authHeaders(getToken, true),
        credentials: "include",
        body: JSON.stringify({
          role: session.role,
          question,
          approach: answer.trim(),
          code: codeAnswer.trim(),
          language,
          difficulty,
        }),
      });

      if (!res.ok) throw new Error("Debug failed");
      const data = await res.json();
      const review = data.review ?? {};

      const debugPayload = {
        errorType: Array.isArray(review.bugs) && review.bugs.length ? "Potential Bug / Logic Risk" : "No critical bug detected",
        severity: Number(review.score ?? 5) >= 8 ? "low" : Number(review.score ?? 5) >= 6 ? "medium" : "high",
        line: review.line ?? "AI estimated",
        explanation: review.interviewerReply ?? review.correctness ?? "AI debugger completed.",
        fix: Array.isArray(review.improvements) ? review.improvements.join("\n") : String(review.improvements ?? ""),
        complexity: review.complexity ?? "",
        followUpQuestion: review.followUpQuestion ?? "",
        variables: [
          { name: "input", value: "candidate-provided", status: "checked" },
          { name: "edgeCases", value: "reviewed by AI", status: "warning" },
          { name: "complexity", value: review.complexity ?? "unknown", status: "info" },
        ],
        timeline: [
          "Parse question",
          "Inspect code structure",
          "Check likely runtime errors",
          "Check edge cases",
          "Suggest fix",
        ],
      };

      setDebugResult(debugPayload);

      terminalLog(`Debugger: ${debugPayload.errorType}`);
      terminalLog(`Severity: ${debugPayload.severity}`);
      if (debugPayload.complexity) terminalLog(`Complexity: ${debugPayload.complexity}`);
      if (debugPayload.fix) terminalLog(`Suggested fix: ${debugPayload.fix}`);
      if (debugPayload.followUpQuestion) terminalLog(`Follow-up: ${debugPayload.followUpQuestion}`);

      if (debugPayload.explanation) await playText(debugPayload.explanation);
    } catch {
      terminalLog("Debug failed. Check API/server logs.");
      toast({ title: "Failed to debug code", variant: "destructive" });
    } finally {
      setDebuggingCode(false);
    }
  };


  const reviewSystemDesign = async () => {
    if (!isSystemDesignMode || !systemDesignAnswer.trim()) return;

    setReviewingSystemDesign(true);
    try {
      const res = await fetch(`${basePath}/api/interview-coach/system-design-review`, {
        method: "POST",
        headers: await authHeaders(getToken, true),
        credentials: "include",
        body: JSON.stringify({
          role: session.role,
          prompt: question,
          answer: systemDesignAnswer.trim(),
          difficulty,
        }),
      });

      if (!res.ok) throw new Error("System design review failed");

      const data = await res.json();
      setSystemDesignReview(data.review ?? data);

      if (data.review?.interviewerComment) {
        await playText(data.review.interviewerComment);
      }
    } catch {
      toast({ title: "System design review failed", variant: "destructive" });
    } finally {
      setReviewingSystemDesign(false);
    }
  };

  const submitAnswer = async () => {
    const finalAnswer = isCodingMode
      ? `${answer.trim()}\n\nCODE SOLUTION:\n${codeAnswer.trim()}`.trim()
      : answer.trim();

    if (!finalAnswer) { toast({ title: isCodingMode ? "Write your explanation or code first" : "Type your answer first", variant: "destructive" }); return; }
    setEvaluating(true);
    try {
      if (isCodingMode) {
        const res = await fetch(`${basePath}/api/interview-coach/review-code`, {
          method: "POST",
          headers: await authHeaders(getToken, true),
          credentials: "include",
          body: JSON.stringify({
            role: session.role,
            question,
            approach: answer.trim(),
            code: codeAnswer.trim(),
            language,
            difficulty,
          }),
        });

        if (!res.ok) throw new Error("Code review failed");
        const data = await res.json();
        const review = data.review;

        const feedback = {
          score: Number(review.score ?? 5),
          strengths: review.correctness ?? "Code reviewed.",
          improvements: Array.isArray(review.improvements) ? review.improvements.join(" ") : String(review.improvements ?? ""),
          betterAnswer: [
            review.complexity ? `Complexity: ${review.complexity}` : "",
            Array.isArray(review.bugs) && review.bugs.length ? `Bugs/Risks: ${review.bugs.join(" ")}` : "",
            review.interviewerReply ?? "",
            review.followUpQuestion ? `Follow-up: ${review.followUpQuestion}` : "",
          ].filter(Boolean).join("\n\n"),
        };

        const newAnswer: Answer = { questionIndex: currentQ, question, answer: finalAnswer, feedback };
        setAnswers(prev => [...prev.filter(a => a.questionIndex !== currentQ), newAnswer]);
        setCurrentFeedback(feedback);

        if (review.interviewerReply) await playText(review.interviewerReply);
        if (review.followUpQuestion) await playText(review.followUpQuestion);
        return;
      }

      const res = await fetch(`${basePath}/api/interview-coach/sessions/${session.id}/answer`, {
        method: "POST",
        headers: await authHeaders(getToken, true),
        credentials: "include",
        body: JSON.stringify({ questionIndex: currentQ, answer: finalAnswer }),
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json();
      const newAnswer: Answer = { questionIndex: currentQ, question, answer: finalAnswer, feedback: data.feedback };
      setAnswers(prev => [...prev.filter(a => a.questionIndex !== currentQ), newAnswer]);
      setCurrentFeedback(data.feedback);
    } catch {
      toast({ title: "Evaluation failed. Try again.", variant: "destructive" });
    } finally {
      setEvaluating(false);
    }
  };

  const nextQuestion = () => {
    setCurrentQ(q => q + 1);
    setAnswer("");
    setCodeAnswer("");
    setCurrentFeedback(null);
    setLiveReply(null);
    setRunResult(null);
    setDebugResult(null);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const completeSession = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`${basePath}/api/interview-coach/sessions/${session.id}/complete`, {
        method: "POST",
        headers: await authHeaders(getToken, true),
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onComplete(answers, data.overallFeedback, data.score);
    } catch {
      toast({ title: "Failed to finish session", variant: "destructive" });
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 flex-1">
          {session.questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
              i < currentQ ? "bg-primary" : i === currentQ ? "bg-primary/50" : "bg-border"
            }`} />
          ))}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">Q {currentQ + 1} / {totalQ}</span>
      </div>

      {/* Question */}
      <motion.div
        key={currentQ}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-primary font-medium uppercase tracking-wider mb-1.5">Question {currentQ + 1}</p>
            <p className="text-sm leading-relaxed">{question}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={speakQuestion} className="gap-2">
                <Mic className="w-4 h-4" />
                Replay interviewer
              </Button>

              {!listening ? (
                <Button type="button" size="sm" onClick={startVoiceAnswer} className="gap-2 bg-cyan-400 text-background hover:bg-cyan-400/90">
                  <Mic className="w-4 h-4" />
                  Start answering by voice
                </Button>
              ) : (
                <Button type="button" size="sm" variant="destructive" onClick={stopVoiceAnswer} className="gap-2">
                  <X className="w-4 h-4" />
                  Stop & let AI respond
                </Button>
              )}
            </div>

            {listening && (
              <p className="mt-2 text-xs text-green-400">Listening... speak naturally like a real interview.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Answer area */}
      {!currentFeedback ? (
        <div className="space-y-2">
          {liveReply && (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <p className="text-sm font-semibold text-cyan-300 mb-2">AI Interviewer Reply</p>
          {liveReply.spokenReply && <p className="text-sm text-foreground mb-2">{liveReply.spokenReply}</p>}
          {liveReply.strength && <p className="text-xs text-green-400 mb-1">Strength: {liveReply.strength}</p>}
          {liveReply.weakness && <p className="text-xs text-orange-400 mb-1">Improve: {liveReply.weakness}</p>}
          {liveReply.followUpQuestion && (
            <p className="text-sm text-primary mt-3">Follow-up: {liveReply.followUpQuestion}</p>
          )}
          {typeof liveReply.score === "number" && (
            <p className="text-xs text-muted-foreground mt-2">Live score: {liveReply.score}/10</p>
          )}
        </div>
      )}

      {liveThinking && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          AI interviewer is thinking...
        </div>
      )}

      {isSystemDesignMode && (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/20 bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">System Design Workspace</p>
                <p className="text-xs text-muted-foreground">Design architecture, APIs, data model, scaling, risks, and tradeoffs.</p>
              </div>
              <Button type="button" onClick={reviewSystemDesign} disabled={reviewingSystemDesign || !systemDesignAnswer.trim()} className="gap-2">
                {reviewingSystemDesign ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Reviewing...</> : "Review Design"}
              </Button>
            </div>

            <textarea
              value={systemDesignAnswer}
              onChange={(e) => setSystemDesignAnswer(e.target.value)}
              placeholder="Example structure:
1. Requirements
2. Core architecture
3. APIs
4. Database schema
5. Scaling strategy
6. Caching / queues
7. Security
8. Tradeoffs"
              rows={12}
              className="w-full rounded-xl border border-border bg-black/40 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>

          {systemDesignReview && (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-cyan-300">AI System Design Review</p>
                {systemDesignReview.score && (
                  <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-xs text-cyan-200">
                    {systemDesignReview.score}/10
                  </span>
                )}
              </div>

              {systemDesignReview.architecture && (
                <p className="text-sm text-muted-foreground"><b>Architecture:</b> {systemDesignReview.architecture}</p>
              )}
              {systemDesignReview.scalability && (
                <p className="text-sm text-muted-foreground"><b>Scalability:</b> {systemDesignReview.scalability}</p>
              )}
              {systemDesignReview.tradeoffs && (
                <p className="text-sm text-muted-foreground"><b>Tradeoffs:</b> {systemDesignReview.tradeoffs}</p>
              )}
              {systemDesignReview.improvements && (
                <p className="text-sm text-muted-foreground"><b>Improve:</b> {Array.isArray(systemDesignReview.improvements) ? systemDesignReview.improvements.join(" ") : systemDesignReview.improvements}</p>
              )}
              {systemDesignReview.interviewerComment && (
                <p className="text-sm text-foreground">{systemDesignReview.interviewerComment}</p>
              )}
            </div>
          )}
        </div>
      )}

      {isCodingMode && (
        <div className="grid grid-cols-2 gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
          </select>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="faang">FAANG</option>
          </select>
        </div>
      )}

      <textarea
            ref={textareaRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder={isCodingMode ? "Explain your approach out loud here: assumptions, edge cases, complexity..." : "Type your answer here... Be specific and use examples from your experience."}
            rows={isCodingMode ? 3 : 5}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none transition-colors leading-relaxed"
            autoFocus
          />

          {isCodingMode && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-primary/20 bg-black">
                <div className="flex items-center justify-between border-b border-primary/10 bg-card px-3 py-2">
                  <span className="text-xs font-semibold text-primary">
                    {language.toUpperCase()} Editor
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Monaco / VS Code-style
                  </span>
                </div>

                <Editor
                  height="360px"
                  language={language === "typescript" ? "typescript" : language === "javascript" ? "javascript" : language === "csharp" ? "csharp" : language === "java" ? "java" : language === "go" ? "go" : "python"}
                  theme="vs-dark"
                  value={codeAnswer}
                  onChange={(value) => setCodeAnswer(value ?? "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "Menlo, Monaco, Consolas, monospace",
                    lineNumbers: "on",
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    wordWrap: "on",
                    bracketPairColorization: { enabled: true },
                  }}
                />
              </div>


              {debugResult && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-red-300">AI Debugger</h3>
                    <span className="rounded-full border border-red-400/20 px-2 py-1 text-xs text-red-200">
                      {debugResult.severity || "medium"}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <p><span className="text-muted-foreground">Error Type:</span> {debugResult.errorType || "Analysis"}</p>
                    <p><span className="text-muted-foreground">Line:</span> {debugResult.line || "Unknown"}</p>
                    <p className="text-muted-foreground leading-relaxed">{debugResult.explanation}</p>
                  </div>

                  {debugResult.fix && (
                    <pre className="overflow-x-auto rounded-lg bg-black/50 p-3 text-xs text-red-100 whitespace-pre-wrap">
                      {debugResult.fix}
                    </pre>
                  )}

                  {Array.isArray(debugResult.improvements) && debugResult.improvements.length > 0 && (
                    <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                      {debugResult.improvements.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-primary/20 bg-black overflow-hidden">
                  <div className="flex items-center justify-between border-b border-primary/10 px-3 py-2 bg-card">
                    <span className="text-xs font-semibold text-primary">IDE Terminal</span>
                    <Button type="button" size="sm" variant="outline" onClick={clearTerminal}>
                      Clear
                    </Button>
                  </div>
                  <div ref={terminalRef} className="h-56 w-full p-2" />
                <div className="flex items-center gap-2 border-t border-primary/10 bg-black px-3 py-2">
                  <span className="font-mono text-xs text-cyan-300">denarixx&gt;</span>
                  <input
                    value={terminalCommand}
                    onChange={(e) => setTerminalCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runTerminalCommand();
                      if (e.key === "ArrowUp" && terminalHistory.length) {
                        setTerminalCommand(terminalHistory[terminalHistory.length - 1]);
                      }
                    }}
                    placeholder="type: run, debug, clear, help"
                    className="flex-1 bg-transparent font-mono text-xs text-white outline-none placeholder:text-muted-foreground"
                  />
                </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-card overflow-hidden">
                  <div className="border-b border-primary/10 px-3 py-2">
                    <span className="text-xs font-semibold text-primary">
                      {debugResult ? "AI Debugger" : runResult ? "Test Results" : "Interview Analysis"}
                    </span>
                    {debugResult?.severity && (
                      <span className="ml-2 rounded-full border border-primary/20 px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {debugResult.severity}
                      </span>
                    )}
                  </div>

                  <div className="h-56 overflow-auto p-4 text-sm">
                    {debugResult ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-red-300">{debugResult.errorType || "Debug Analysis"}</span>
                          <span className="rounded-full border border-red-400/20 px-2 py-1 text-xs text-red-200">
                            {debugResult.severity || "medium"}
                          </span>
                        </div>
                        <p><span className="text-muted-foreground">Line:</span> {debugResult.line || "Unknown"}</p>
                        <p className="text-muted-foreground leading-relaxed">{debugResult.explanation}</p>
                        {debugResult.fix && (
                          <pre className="whitespace-pre-wrap rounded-lg bg-black/50 p-3 text-xs text-red-100">{debugResult.fix}</pre>
                        )}

                        {Array.isArray(debugResult.variables) && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Variable Inspector</p>
                            {debugResult.variables.map((v: any, i: number) => (
                              <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                                <span className="font-mono text-xs text-foreground">{v.name}</span>
                                <span className="text-xs text-muted-foreground">{v.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {Array.isArray(debugResult.timeline) && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Execution Timeline</p>
                            {debugResult.timeline.map((step: string, i: number) => (
                              <div key={i} className="flex gap-2 text-xs">
                                <span className="text-primary">●</span>
                                <span className="text-muted-foreground">{step}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : runResult ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <span className="rounded-full bg-green-400/10 px-2 py-1 text-xs text-green-300">
                            Passed: {runResult.passed ?? 0}
                          </span>
                          <span className="rounded-full bg-red-400/10 px-2 py-1 text-xs text-red-300">
                            Failed: {runResult.failed ?? 0}
                          </span>
                        </div>
                        {Array.isArray(runResult.results) && runResult.results.map((r: any, i: number) => (
                          <div key={i} className="rounded-lg border border-border p-2">
                            <p className={r.status === "pass" ? "text-green-300" : "text-red-300"}>
                              {r.status === "pass" ? "✓" : "✗"} {r.name || `Test ${i + 1}`}
                            </p>
                            <p className="text-xs text-muted-foreground">{r.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Run tests or debug code to see structured interview analysis here.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {isCodingMode ? codeAnswer.length : answer.length} characters
            </span>

            <div className="flex flex-wrap justify-end gap-2">
              {isCodingMode && (
                <>
                  <Button type="button" variant="outline" onClick={generateTestCases} disabled={generatingTests} className="gap-2">
                    {generatingTests ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Tests...</> : "Generate Tests"}
                  </Button>

                  <Button type="button" variant="outline" onClick={runCodeAgainstTests} disabled={runningCode || !codeAnswer.trim()} className="gap-2">
                    {runningCode ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running...</> : "Run Tests"}
                  </Button>
                  <Button type="button" variant="outline" onClick={debugCode} disabled={debugging || !codeAnswer.trim()} className="gap-2">
                    {debugging ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Debugging...</> : "Debug Code"}
                  </Button>
                </>
              )}

              <Button onClick={submitAnswer} disabled={evaluating || (isCodingMode ? !codeAnswer.trim() : !answer.trim())} className="gap-2">
                {evaluating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Evaluating...</> : <><Send className="w-3.5 h-3.5" />Submit</>}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5 space-y-4"
          >
            {isCodingMode && testCases.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-2">
              <p className="font-semibold text-primary">Generated Test Cases</p>
              {testCases.map((t, i) => (
                <pre key={i} className="whitespace-pre-wrap text-muted-foreground">
                  {JSON.stringify(t, null, 2)}
                </pre>
              ))}
            </div>
          )}

          {isCodingMode && runResult && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
              <p className="font-semibold text-primary">
                Test Result: {runResult.passed ?? 0} passed / {runResult.failed ?? 0} failed
              </p>
              {(runResult.results || []).map((r: any, i: number) => (
                <div key={i} className="border-t border-border pt-2">
                  <p className={r.status === "pass" ? "text-green-400" : "text-red-400"}>
                    {r.status?.toUpperCase()} — {r.name}
                  </p>
                  <p className="text-muted-foreground">{r.reason}</p>
                </div>
              ))}
              {runResult.summary && <p className="text-muted-foreground">{runResult.summary}</p>}
            </div>
          )}

          <div className="flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />AI Feedback</span>
              <ScoreBadge score={currentFeedback.score} />
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] font-medium text-green-400 uppercase tracking-wider mb-1">Strengths</p>
                <p className="text-muted-foreground leading-relaxed">{currentFeedback.strengths}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-yellow-400 uppercase tracking-wider mb-1">Improve</p>
                <p className="text-muted-foreground leading-relaxed">{currentFeedback.improvements}</p>
              </div>
              {currentFeedback.betterAnswer && (
                <div>
                  <p className="text-[11px] font-medium text-primary uppercase tracking-wider mb-1">Stronger Answer Approach</p>
                  <p className="text-muted-foreground leading-relaxed">{currentFeedback.betterAnswer}</p>
                </div>
              )}
            </div>

            <div className="pt-1">
              {!isLastQ ? (
                <Button onClick={nextQuestion} className="w-full gap-2">
                  Next Question <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={completeSession} disabled={completing} className="w-full bg-green-500 hover:bg-green-500/90 gap-2">
                  {completing ? <><Loader2 className="w-4 h-4 animate-spin" />Finishing...</> : <><Trophy className="w-4 h-4" />Finish & Get Summary</>}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function CompleteStep({
  session,
  answers,
  overallFeedback,
  score,
  onRestart,
}: {
  session: Session;
  answers: Answer[];
  overallFeedback: string;
  score: number;
  onRestart: () => void;
}) {
  const avgColor = score >= 8 ? "text-green-400" : score >= 6 ? "text-yellow-400" : "text-orange-400";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <div className={`text-5xl font-black mb-2 ${avgColor}`}>{score}<span className="text-2xl text-muted-foreground">/10</span></div>
        <p className="font-semibold text-lg">Interview Complete</p>
        <p className="text-sm text-muted-foreground">{session.role} · {session.interviewType}</p>
      </div>

      {/* Overall feedback */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <p className="text-[11px] font-medium text-primary uppercase tracking-wider mb-2">Overall Assessment</p>
        <p className="text-sm leading-relaxed">{overallFeedback}</p>
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Question Breakdown</h3>
        {answers.sort((a, b) => a.questionIndex - b.questionIndex).map((ans, i) => (
          <details key={i} className="rounded-xl border border-border bg-card group">
            <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs text-muted-foreground shrink-0">Q{ans.questionIndex + 1}</span>
                <p className="text-sm truncate">{ans.question}</p>
              </div>
              <ScoreBadge score={ans.feedback.score} />
            </summary>
            <div className="px-4 pb-4 space-y-2 text-sm border-t border-border pt-3 mt-0">
              <div><span className="text-xs font-medium text-muted-foreground">Your answer: </span><span className="text-muted-foreground">{ans.answer}</span></div>
              <div><span className="text-xs font-medium text-green-400">Strengths: </span><span className="text-muted-foreground">{ans.feedback.strengths}</span></div>
              <div><span className="text-xs font-medium text-yellow-400">Improve: </span><span className="text-muted-foreground">{ans.feedback.improvements}</span></div>
            </div>
          </details>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={onRestart} variant="outline" className="flex-1 gap-2">
          <RotateCcw className="w-4 h-4" />Try Another Role
        </Button>
        <Link to="/cv-builder" className="flex-1">
          <Button className="w-full gap-2">
            <TrendingUp className="w-4 h-4" />Update Your CV
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

function InterviewCoachContent() {
  const { getToken } = useAuth();
  const [step, setStep] = useState<Step>("setup");
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [overallFeedback, setOverallFeedback] = useState("");
  const typedOverallFeedback = useTypewriterText(overallFeedback, 8);
  const [score, setScore] = useState(0);

  const startSession = async (role: string, type: InterviewType) => {
    const res = await fetch(`${basePath}/api/interview-coach/sessions`, {
      method: "POST",
      headers: await authHeaders(getToken, true),
      credentials: "include",
      body: JSON.stringify({ role, interviewType: type }),
    });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    setSession({ ...data.session, questions: data.session.questions, answers: [] });
    setStep("interview");
  };

  const handleComplete = (ans: Answer[], feedback: string, sc: number) => {
    setAnswers(ans);
    setOverallFeedback(feedback);
    setScore(sc);
    setStep("complete");
  };

  const restart = () => {
    setStep("setup");
    setSession(null);
    setAnswers([]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />Dashboard
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Interview Coach</span>
          </div>
          {step !== "setup" && (
            <button onClick={restart} className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />Exit
            </button>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <AnimatePresence mode="wait">
          {step === "setup" && (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SetupStep onStart={startSession} />
            </motion.div>
          )}
          {step === "interview" && session && (
            <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InterviewStep session={session} onComplete={handleComplete} />
            </motion.div>
          )}
          {step === "complete" && session && (
            <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CompleteStep session={session} answers={answers} overallFeedback={overallFeedback} score={score} onRestart={restart} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function InterviewCoach() {
  return (
    <>
      <Show when="signed-in"><InterviewCoachContent /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}
