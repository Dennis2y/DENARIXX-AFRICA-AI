import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import {
  Briefcase, MapPin, Clock, ChevronLeft, Search,
  Sparkles, CheckCircle, Send, Loader2, X, Star, TrendingUp,
  Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Wand2,
  ClipboardCheck, AlertCircle, Copy, Check, ExternalLink,
  Globe, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────

type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  requiredSkills: string[];
  salary: string | null;
  jobType: string;
  level: string;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  applied: boolean;
  saved: boolean;
  // New fields
  source: string | null;
  externalApplyUrl: string | null;
  postedDate: string | null;
  remoteType: string | null;
  country: string | null;
};

type Tab = "browse" | "applications" | "saved";

type Application = {
  id: number;
  jobId: number;
  status: string;
  appliedAt: string;
  coverLetter: string | null;
  title: string;
  company: string;
  location: string;
  jobType: string;
  level: string;
  salary: string | null;
  externalApplyUrl: string | null;
};

type MatchExplain = {
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
};

type TailorResult = {
  atsScore: number;
  missingKeywords: string[];
  presentKeywords: string[];
  suggestions: string[];
  tailoredSummary: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  junior: "text-green-400 bg-green-400/10 border-green-400/20",
  mid: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  senior: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  executive: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

const REMOTE_COLORS: Record<string, string> = {
  remote: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  hybrid: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  "on-site": "text-slate-400 bg-slate-400/10 border-slate-400/20",
};

const TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
};

const STATUS_STEPS = ["applied", "reviewing", "interview", "offered"] as const;
type StatusStep = typeof STATUS_STEPS[number];

// Skills to detect in CV text for enhanced matching
const KNOWN_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "AWS",
  "Docker", "Kubernetes", "PostgreSQL", "MongoDB", "Redis", "GraphQL",
  "CSS", "HTML", "Vue", "Angular", "Next.js", "Django", "Flask", "Express",
  "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Data Analysis",
  "Figma", "UI/UX Design", "Product Management", "Agile", "Scrum",
  "React Native", "Swift", "Kotlin", "Java", "C#", "Go", "PHP", "Ruby",
  "Cybersecurity", "Network Security", "SIEM", "Linux", "CI/CD", "DevOps",
  "Terraform", "Git", "REST", "System Design", "SEO", "Digital Marketing",
  "Social Media", "Power BI", "Tableau", "R", "User Research", "Prototyping",
  "Prompt Engineering", "OpenAI API", "Blockchain", "iOS", "Android",
  "Growth Marketing", "Partnerships", "Mobile Development",
];

function extractCvSkills(cvText: string): string[] {
  if (!cvText) return [];
  const lower = cvText.toLowerCase();
  return KNOWN_SKILLS.filter(skill => lower.includes(skill.toLowerCase()));
}

function matchColor(score: number) {
  if (score >= 75) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-orange-400";
}

function atsColor(score: number) {
  if (score >= 75) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-orange-400";
}

function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── ApplicationModal ───────────────────────────────────────────────────────

function ApplicationModal({
  job, onClose, onSubmit,
}: {
  job: Job;
  onClose: () => void;
  onSubmit: (job: Job, coverLetter: string) => Promise<void>;
}) {
  const { toast } = useToast();
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateCoverLetter = async () => {
    setGenerating(true);
    try {
      const cvText = (() => { try { return localStorage.getItem("denarixx_last_cv") ?? ""; } catch { return ""; } })();
      const res = await fetch(`${basePath}/api/jobs/${job.id}/cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cvText }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setCoverLetter((await res.json()).coverLetter ?? "");
      toast({ title: "Cover letter generated ✨" });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try { await onSubmit(job, coverLetter); } finally { setSubmitting(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">{job.title}</h2>
            <p className="text-sm text-muted-foreground">{job.company} · {job.location}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {job.salary && <p className="text-sm font-medium text-green-400 mb-4">{job.salary}</p>}

        <div className="mb-4 text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-xl p-3 line-clamp-3">
          {job.description}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Cover Letter <span className="text-muted-foreground font-normal">(optional)</span></label>
            <button
              onClick={generateCoverLetter} disabled={generating}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              {generating ? "Generating…" : "Generate with AI"}
            </button>
          </div>
          <textarea
            value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
            placeholder="Write a cover letter or use AI to generate one…"
            rows={6}
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors resize-none"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || job.applied} className="flex-1 rounded-xl gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Application
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── TailorCVModal ──────────────────────────────────────────────────────────

function TailorCVModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const cvText = (() => { try { return localStorage.getItem("denarixx_last_cv") ?? ""; } catch { return ""; } })();
  const hasCV = !!cvText;

  const runTailor = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${basePath}/api/jobs/${job.id}/tailor-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cvText }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runTailor(); }, []);

  const copySummary = () => {
    if (result?.tailoredSummary) {
      navigator.clipboard.writeText(result.tailoredSummary).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied to clipboard!" });
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-primary" />Tailor CV for This Role</h2>
            <p className="text-sm text-muted-foreground">{job.title} · {job.company}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {!hasCV && (
          <div className="mb-4 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-xs text-yellow-300">No CV found. <Link to="/cv-builder" className="underline">Generate one in CV Builder</Link> first for a personalised ATS analysis.</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Analysing your CV against this role…</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive/70" />
            <p className="text-sm mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={runTailor} className="rounded-xl">Retry</Button>
          </div>
        ) : result ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">ATS Score</p>
                <p className={`text-4xl font-bold mt-1 ${atsColor(result.atsScore)}`}>{result.atsScore}<span className="text-lg font-normal text-muted-foreground">/100</span></p>
              </div>
              <p className="text-xs text-muted-foreground">{result.atsScore >= 75 ? "Strong match" : result.atsScore >= 50 ? "Moderate match" : "Needs improvement"}</p>
            </div>

            {result.presentKeywords.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Present Keywords ✓</p>
                <div className="flex flex-wrap gap-1.5">{result.presentKeywords.map(k => <span key={k} className="text-[11px] px-2 py-0.5 rounded-full border border-green-400/20 bg-green-400/10 text-green-400">{k}</span>)}</div>
              </div>
            )}

            {result.missingKeywords.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Missing Keywords</p>
                <div className="flex flex-wrap gap-1.5">{result.missingKeywords.map(k => <span key={k} className="text-[11px] px-2 py-0.5 rounded-full border border-red-400/20 bg-red-400/10 text-red-400">{k}</span>)}</div>
              </div>
            )}

            {result.suggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Suggestions</p>
                <ul className="space-y-1.5">{result.suggestions.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="text-primary mt-0.5 flex-shrink-0">→</span>{s}</li>)}</ul>
              </div>
            )}

            {result.tailoredSummary && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tailored Summary</p>
                  <button onClick={copySummary} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground leading-relaxed">{result.tailoredSummary}</div>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-5"><Button variant="outline" onClick={onClose} className="w-full rounded-xl">Close</Button></div>
      </motion.div>
    </motion.div>
  );
}

// ── StatusPipeline ─────────────────────────────────────────────────────────

function StatusPipeline({ appId, currentStatus, onUpdate }: { appId: number; currentStatus: string; onUpdate: (appId: number, status: string) => void }) {
  const isRejected = currentStatus === "rejected";
  const activeIdx = STATUS_STEPS.indexOf(currentStatus as StatusStep);

  return (
    <div className="mt-3">
      {isRejected ? (
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full border border-red-400/20 bg-red-400/10 text-red-400 font-medium">Rejected</span>
          <button onClick={() => onUpdate(appId, "applied")} className="text-[10px] text-muted-foreground hover:text-foreground underline">Reopen</button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_STEPS.map((step, idx) => {
            const isPast = activeIdx > idx;
            const isActive = activeIdx === idx;
            return (
              <button key={step} onClick={() => onUpdate(appId, step)}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors capitalize ${isActive ? "border-primary/40 bg-primary/10 text-primary" : isPast ? "border-green-400/20 bg-green-400/5 text-green-400/70" : "border-border bg-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {isPast && <CheckCircle className="w-2.5 h-2.5" />}{step}
              </button>
            );
          })}
          <button onClick={() => onUpdate(appId, "rejected")} className="text-[10px] px-2 py-0.5 rounded-full border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-colors">Reject</button>
        </div>
      )}
    </div>
  );
}

// ── MatchExplainPanel ──────────────────────────────────────────────────────

function MatchExplainPanel({ job, explain, loading, onLoad }: { job: Job; explain: MatchExplain | null; loading: boolean; onLoad: () => void }) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    if (!open && !explain && !loading) onLoad();
    setOpen(o => !o);
  };

  const matched = explain?.matchedSkills ?? job.matchedSkills ?? [];
  const missing = explain?.missingSkills ?? job.missingSkills ?? [];

  return (
    <div className="border-t border-border mt-3 pt-3">
      <button onClick={toggle} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
        <Sparkles className="w-3 h-3 text-primary" />
        <span className="font-medium">Why this matches</span>
        {open ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="pt-3 space-y-3">
              {matched.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">You have</p>
                  <div className="flex flex-wrap gap-1">{matched.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full border border-green-400/20 bg-green-400/10 text-green-400">{s}</span>)}</div>
                </div>
              )}
              {missing.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">You're missing</p>
                  <div className="flex flex-wrap gap-1">{missing.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full border border-orange-400/20 bg-orange-400/10 text-orange-400">{s}</span>)}</div>
                </div>
              )}
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin text-primary" />Getting AI analysis…</div>
              ) : explain ? (
                <div className="space-y-2.5">
                  {explain.summary && <p className="text-xs text-muted-foreground leading-relaxed">{explain.summary}</p>}
                  {explain.suggestions.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">How to improve</p>
                      <ul className="space-y-1">{explain.suggestions.map((s, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground"><span className="text-primary flex-shrink-0 mt-0.5">›</span>{s}</li>)}</ul>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={onLoad} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Wand2 className="w-3 h-3" />Get AI analysis
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── JobCard ────────────────────────────────────────────────────────────────

function JobCard({
  job, onApply, onSave, onTailor, onMatchExplain, matchExplain, matchExplainLoading,
}: {
  job: Job;
  onApply: (job: Job) => void;
  onSave: (job: Job) => void;
  onTailor: (job: Job) => void;
  onMatchExplain: (jobId: number) => void;
  matchExplain: MatchExplain | null;
  matchExplainLoading: boolean;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const isExternal = !!job.externalApplyUrl;
  const isDenarixx = job.source === "denarixx";

  const handleExternalClick = () => {
    toast({ title: "Opening company career page ↗", description: "This application is tracked externally by the company." });
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-card p-5 transition-colors ${job.applied ? "border-primary/30 bg-primary/5" : "border-border hover:border-border/80"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold truncate">{job.title}</h3>
            {job.applied && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
                <CheckCircle className="w-2.5 h-2.5" />Applied
              </span>
            )}
            {isExternal && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full px-2 py-0.5">
                <ExternalLink className="w-2.5 h-2.5" />External
              </span>
            )}
            {isDenarixx && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
                ✦ DENARIXX
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">{job.company}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.country ?? job.location}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{TYPE_LABELS[job.jobType] ?? job.jobType}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {job.matchScore !== null && (
            <div className={`text-xs font-bold flex items-center gap-1 ${matchColor(job.matchScore)}`}>
              <Star className="w-3 h-3" />{job.matchScore}% match
            </div>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${LEVEL_COLORS[job.level] ?? "text-muted-foreground"}`}>{job.level}</span>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {job.remoteType && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${REMOTE_COLORS[job.remoteType] ?? "text-muted-foreground border-border"}`}>
            {job.remoteType}
          </span>
        )}
        {job.salary && <span className="text-sm font-medium text-green-400">{job.salary}</span>}
        {job.postedDate && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="w-2.5 h-2.5" />{relativeTime(job.postedDate)}
          </span>
        )}
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {job.requiredSkills.slice(0, 6).map(s => {
          const isMatched = (job.matchedSkills ?? []).includes(s);
          const isMissing = (job.missingSkills ?? []).includes(s);
          return (
            <span key={s} className={`text-[11px] px-2 py-0.5 rounded-full border ${isMatched ? "border-green-400/20 bg-green-400/10 text-green-400" : isMissing ? "border-orange-400/20 bg-orange-400/10 text-orange-400/80" : "border-border bg-muted text-muted-foreground"}`}>
              {s}
            </span>
          );
        })}
        {job.requiredSkills.length > 6 && <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">+{job.requiredSkills.length - 6}</span>}
      </div>

      {/* Description */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{job.description}</p>
            {isExternal && (
              <div className="mb-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2.5 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300/80">This listing links to <strong className="text-amber-300">{job.company}</strong>'s external career page. Your application won't be tracked in DENARIXX.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(e => !e)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? "Show less" : "See details"}
          </button>
          <button onClick={() => onTailor(job)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
            <ClipboardCheck className="w-3 h-3" />Tailor CV
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSave(job)}
            className={`p-1.5 rounded-lg border transition-colors ${job.saved ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-400" : "border-border text-muted-foreground hover:text-foreground"}`}
            title={job.saved ? "Unsave" : "Save for later"}
          >
            {job.saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>

          {isExternal ? (
            <a
              href={job.externalApplyUrl!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleExternalClick}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-400/20 hover:bg-amber-500/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />Apply Externally
            </a>
          ) : (
            <Button
              size="sm"
              onClick={() => onApply(job)}
              disabled={job.applied}
              className={`rounded-xl gap-1.5 h-8 text-xs ${job.applied ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
            >
              {job.applied ? <><CheckCircle className="w-3 h-3" />Applied</> : <><Send className="w-3 h-3" />Apply Now</>}
            </Button>
          )}
        </div>
      </div>

      {/* Match explain */}
      {job.matchScore !== null && (
        <MatchExplainPanel job={job} explain={matchExplain} loading={matchExplainLoading} onLoad={() => onMatchExplain(job.id)} />
      )}
    </motion.div>
  );
}

// ── JobsContent ────────────────────────────────────────────────────────────

function JobsContent() {
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("browse");
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [savedJobsList, setSavedJobsList] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterRemote, setFilterRemote] = useState("all");

  const [applyModalJob, setApplyModalJob] = useState<Job | null>(null);
  const [tailorJob, setTailorJob] = useState<Job | null>(null);
  const [matchExplains, setMatchExplains] = useState<Record<number, MatchExplain | null>>({});
  const [matchExplainLoading, setMatchExplainLoading] = useState<number | null>(null);
  const [savingJobId, setSavingJobId] = useState<number | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  // ── Data fetchers

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Enhance match scoring with CV skills from localStorage
      const cvText = (() => { try { return localStorage.getItem("denarixx_last_cv") ?? ""; } catch { return ""; } })();
      const cvSkills = extractCvSkills(cvText);
      const params = new URLSearchParams();
      if (cvSkills.length) params.set("cvSkills", cvSkills.join(","));

      const res = await fetch(`${basePath}/api/jobs?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAllJobs(data.jobs ?? []);
      setHasProfile((data.jobs ?? []).some((j: Job) => j.matchScore !== null && j.matchScore > 0));
    } catch {
      toast({ title: "Failed to load jobs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch(`${basePath}/api/jobs/my-applications`, { credentials: "include" });
      if (!res.ok) return;
      setApplications((await res.json()).applications ?? []);
    } catch {}
  }, []);

  const fetchSaved = useCallback(async () => {
    setSavedLoading(true);
    try {
      const res = await fetch(`${basePath}/api/jobs/saved`, { credentials: "include" });
      if (!res.ok) return;
      setSavedJobsList((await res.json()).jobs ?? []);
    } catch {
      toast({ title: "Failed to load saved jobs", variant: "destructive" });
    } finally {
      setSavedLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); fetchApplications(); }, []);
  useEffect(() => { if (tab === "saved") fetchSaved(); }, [tab]);

  // ── Handlers

  const handleApply = async (job: Job, coverLetter: string) => {
    try {
      const res = await fetch(`${basePath}/api/jobs/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ coverLetter }),
      });
      if (res.status === 409) { toast({ title: "Already applied" }); return; }
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast({ title: "Application submitted! 🎉", description: `Applied to ${job.title} at ${job.company}.` });
      setAllJobs(prev => prev.map(j => j.id === job.id ? { ...j, applied: true } : j));
      setSavedJobsList(prev => prev.map(j => j.id === job.id ? { ...j, applied: true } : j));
      setApplyModalJob(null);
      fetchApplications();
    } catch (err: any) {
      toast({ title: "Application failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async (job: Job) => {
    if (savingJobId !== null) return;
    setSavingJobId(job.id);
    try {
      const res = await fetch(`${basePath}/api/jobs/${job.id}/save`, { method: job.saved ? "DELETE" : "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const newSaved = !job.saved;
      setAllJobs(prev => prev.map(j => j.id === job.id ? { ...j, saved: newSaved } : j));
      setSavedJobsList(prev => newSaved ? prev : prev.filter(j => j.id !== job.id));
      if (!job.saved) toast({ title: "Job saved!", description: `${job.title} added to saved jobs.` });
    } catch {
      toast({ title: "Failed to save job", variant: "destructive" });
    } finally {
      setSavingJobId(null);
    }
  };

  const handleMatchExplain = async (jobId: number) => {
    if (matchExplainLoading === jobId) return;
    setMatchExplainLoading(jobId);
    try {
      const cvText = (() => { try { return localStorage.getItem("denarixx_last_cv") ?? ""; } catch { return ""; } })();
      const res = await fetch(`${basePath}/api/jobs/${jobId}/match-explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cvText: cvText.slice(0, 1200) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = await res.json();
      setMatchExplains(prev => ({ ...prev, [jobId]: data }));
    } catch (err: any) {
      toast({ title: "AI analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setMatchExplainLoading(null);
    }
  };

  const handleStatusUpdate = async (appId: number, status: string) => {
    if (statusUpdating !== null) return;
    setStatusUpdating(appId);
    try {
      const res = await fetch(`${basePath}/api/jobs/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setStatusUpdating(null);
    }
  };

  // ── Filtering

  const filtered = allJobs.filter(j => {
    const q = search.toLowerCase();
    const textOk = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.location.toLowerCase().includes(q) || j.requiredSkills.some(s => s.toLowerCase().includes(q));
    const levelOk = filterLevel === "all" || j.level === filterLevel;
    const typeOk = filterType === "all" || j.jobType === filterType;
    const remoteOk = filterRemote === "all" || j.remoteType === filterRemote;
    return textOk && levelOk && typeOk && remoteOk;
  });

  const topMatches = filtered.filter(j => (j.matchScore ?? 0) >= 60 && !j.applied);

  const renderCard = (job: Job) => (
    <JobCard
      key={job.id} job={job}
      onApply={j => setApplyModalJob(j)}
      onSave={handleSave}
      onTailor={j => setTailorJob(j)}
      onMatchExplain={handleMatchExplain}
      matchExplain={matchExplains[job.id] ?? null}
      matchExplainLoading={matchExplainLoading === job.id}
    />
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />Dashboard
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold text-sm">Jobs AI</span>
          </div>
          <div className="ml-auto flex gap-1">
            {(["browse", "applications", "saved"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t === "browse" && "Browse"}
                {t === "applications" && <>My Applications{applications.length > 0 && <span className="bg-primary/20 text-primary text-[10px] rounded-full px-1.5 py-0.5 leading-none">{applications.length}</span>}</>}
                {t === "saved" && <>Saved{savedJobsList.length > 0 && <span className="bg-yellow-400/20 text-yellow-400 text-[10px] rounded-full px-1.5 py-0.5 leading-none">{savedJobsList.length}</span>}</>}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* ── BROWSE ── */}
        {tab === "browse" && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">Jobs AI <span className="text-yellow-400">🌍</span></h1>
              <p className="text-muted-foreground text-sm">
                {hasProfile
                  ? "Ranked by match score · Green skills = you have them · Orange = missing · Amber = applies externally"
                  : "Add skills to your profile to unlock AI match scores."}
              </p>
            </div>

            {!hasProfile && (
              <div className="mb-6 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-sm text-yellow-400">Your profile is incomplete</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Add skills to unlock AI job matching and CV tailoring.</p>
                </div>
                <Link to="/profile">
                  <Button size="sm" className="rounded-xl bg-yellow-400 text-background hover:bg-yellow-400/90 gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />Complete Profile
                  </Button>
                </Link>
              </div>
            )}

            {/* Top matches */}
            {topMatches.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />Top AI Matches for You
                </h2>
                <div className="space-y-3">{topMatches.slice(0, 3).map(renderCard)}</div>
                {filtered.length > 3 && <div className="my-6 border-t border-border" />}
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <div className="flex-1 min-w-48 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search jobs, companies, skills…"
                  className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary/50 transition-colors"
                />
                {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50">
                <option value="all">All Levels</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50">
                <option value="all">All Types</option>
                <option value="full-time">Full-time</option>
                <option value="contract">Contract</option>
              </select>
              <select value={filterRemote} onChange={e => setFilterRemote(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50">
                <option value="all">All Locations</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on-site">On-site</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">{filtered.length} job{filtered.length !== 1 ? "s" : ""} found</p>
                <div className="space-y-3">
                  {filtered.map(renderCard)}
                  {!filtered.length && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No jobs found matching your search.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── APPLICATIONS ── */}
        {tab === "applications" && (
          <>
            <h1 className="text-2xl font-bold mb-6">My Applications</h1>
            {applications.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="mb-2">No applications yet.</p>
                <button onClick={() => setTab("browse")} className="text-sm text-primary hover:underline">Browse jobs →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <div key={app.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{app.title}</h3>
                        <p className="text-sm text-muted-foreground">{app.company} · {app.location}</p>
                        {app.salary && <p className="text-sm text-green-400 mt-1">{app.salary}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{new Date(app.appliedAt).toLocaleDateString()}</span>
                    </div>
                    {app.coverLetter && (
                      <details className="mt-2 group">
                        <summary className="text-xs text-muted-foreground hover:text-foreground cursor-pointer list-none flex items-center gap-1">
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />Cover letter
                        </summary>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-4 bg-muted/30 rounded-lg p-2.5">{app.coverLetter}</p>
                      </details>
                    )}
                    <StatusPipeline appId={app.id} currentStatus={app.status} onUpdate={handleStatusUpdate} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SAVED ── */}
        {tab === "saved" && (
          <>
            <h1 className="text-2xl font-bold mb-6">Saved Jobs</h1>
            {savedLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : savedJobsList.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="mb-2">No saved jobs yet.</p>
                <button onClick={() => setTab("browse")} className="text-sm text-primary hover:underline">Browse jobs →</button>
              </div>
            ) : (
              <div className="space-y-3">{savedJobsList.map(renderCard)}</div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {applyModalJob && <ApplicationModal job={applyModalJob} onClose={() => setApplyModalJob(null)} onSubmit={handleApply} />}
      </AnimatePresence>
      <AnimatePresence>
        {tailorJob && <TailorCVModal job={tailorJob} onClose={() => setTailorJob(null)} />}
      </AnimatePresence>
    </div>
  );
}

export default function Jobs() {
  return (
    <>
      <Show when="signed-in"><JobsContent /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}
