import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Show } from "@clerk/react";
import { Redirect } from "wouter";
import {
  ChevronLeft, Mic, Send, Loader2, Star, CheckCircle, RotateCcw,
  MessageSquare, Trophy, TrendingUp, Clock, ChevronRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type InterviewType = "behavioral" | "technical" | "mixed";
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
  questions: string[];
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
  { value: "mixed", label: "Mixed", desc: "Best of both — recommended", color: "text-primary" },
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

  useEffect(() => {
    fetch(`${basePath}/api/interview-coach/sessions`, { credentials: "include" })
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
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<Answer["feedback"] | null>(null);
  const [completing, setCompleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const totalQ = session.questions.length;
  const question = session.questions[currentQ];
  const isLastQ = currentQ === totalQ - 1;
  const allAnswered = answers.length === totalQ;

  const submitAnswer = async () => {
    if (!answer.trim()) { toast({ title: "Type your answer first", variant: "destructive" }); return; }
    setEvaluating(true);
    try {
      const res = await fetch(`${basePath}/api/interview-coach/sessions/${session.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questionIndex: currentQ, answer: answer.trim() }),
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json();
      const newAnswer: Answer = { questionIndex: currentQ, question, answer: answer.trim(), feedback: data.feedback };
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
    setCurrentFeedback(null);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const completeSession = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`${basePath}/api/interview-coach/sessions/${session.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          <div>
            <p className="text-[11px] text-primary font-medium uppercase tracking-wider mb-1.5">Question {currentQ + 1}</p>
            <p className="text-sm leading-relaxed">{question}</p>
          </div>
        </div>
      </motion.div>

      {/* Answer area */}
      {!currentFeedback ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer here... Be specific and use examples from your experience."
            rows={5}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none transition-colors leading-relaxed"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{answer.length} characters</span>
            <Button onClick={submitAnswer} disabled={evaluating || !answer.trim()} className="gap-2">
              {evaluating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Evaluating...</> : <><Send className="w-3.5 h-3.5" />Submit</>}
            </Button>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5 space-y-4"
          >
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
        <a href={`${basePath}/cv-builder`} className="flex-1">
          <Button className="w-full gap-2">
            <TrendingUp className="w-4 h-4" />Update Your CV
          </Button>
        </a>
      </div>
    </motion.div>
  );
}

function InterviewCoachContent() {
  const [step, setStep] = useState<Step>("setup");
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [overallFeedback, setOverallFeedback] = useState("");
  const [score, setScore] = useState(0);

  const startSession = async (role: string, type: InterviewType) => {
    const res = await fetch(`${basePath}/api/interview-coach/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
          <a href={`${basePath}/dashboard`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />Dashboard
          </a>
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
