import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import {
  FileText, Sparkles, Download, Copy, Check, ChevronLeft,
  Loader2, Plus, X, Wand2, Layout, Eye, Upload, Target,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  TrendingUp, User, Briefcase, GraduationCap, Trophy, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = "build" | "preview";
type TemplateId = "professional" | "executive" | "tech" | "graduate" | "creative";
type Tone = "professional" | "creative" | "executive";
type AssistKey = "summary-gen" | "experience-rewrite" | "achievements-improve" | "skills-suggest" | "experience-ats";

interface FormData {
  name: string; email: string; phone: string; location: string; linkedin: string;
  targetRole: string; targetCompany: string; currentRole: string;
  summary: string; experience: string; education: string; achievements: string;
  skills: string[]; skillInput: string; tone: Tone;
}

interface GenerateResult { resume: string; coverLetter: string; }

interface AtsResult {
  atsScore: number;
  missingKeywords: string[];
  presentKeywords: string[];
  suggestions: string[];
  tailoredSummary?: string;
}

interface Template {
  id: TemplateId; name: string; desc: string; accent: string; tag: string; printCSS: string;
}

const TEMPLATES: Template[] = [
  {
    id: "professional", name: "Professional", desc: "Clean sans-serif with cyan accent bar", accent: "#00E5FF", tag: "Popular",
    printCSS: `
      body{font-family:'Helvetica Neue',Arial,sans-serif;max-width:820px;margin:0 auto;padding:0;color:#1a1a2e;background:#fff}
      .header{background:#00E5FF;padding:32px 40px 24px;color:#0b1020}
      .header h1{font-size:32px;font-weight:900;margin:0 0 4px;letter-spacing:-0.5px}
      .header .subtitle{font-size:14px;opacity:.75}
      .body{padding:28px 40px}
      h2{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#00E5FF;border-left:3px solid #00E5FF;padding-left:10px;margin:24px 0 10px;font-weight:700}
      h1{display:none}p,li{font-size:13.5px;line-height:1.7;color:#2d2d3a}li{margin-left:18px;list-style:disc}
      strong{color:#0b1020}hr{border:none;border-top:1px solid #e5e7eb;margin:16px 0}
      @media print{@page{margin:0}}
    `,
  },
  {
    id: "executive", name: "Executive", desc: "Dark navy header with leadership presence", accent: "#0f172a", tag: "Leadership",
    printCSS: `
      body{font-family:'Helvetica Neue',Arial,sans-serif;max-width:820px;margin:0 auto;padding:0;color:#1e293b;background:#fff}
      .header{background:#0f172a;padding:36px 48px 28px;color:#fff}
      .header h1{font-size:30px;font-weight:800;margin:0 0 6px;letter-spacing:-0.5px}
      .header .subtitle{font-size:13px;color:#94a3b8}
      .body{padding:28px 48px}h1{display:none}
      h2{font-size:13px;text-transform:uppercase;letter-spacing:1.5px;color:#0f172a;border-bottom:2px solid #0f172a;padding-bottom:4px;margin:24px 0 10px;font-weight:700}
      p,li{font-size:13.5px;line-height:1.7;color:#334155}li{margin-left:18px;list-style:disc}
      strong{color:#0f172a;font-weight:700}hr{border:none;border-top:1px solid #e2e8f0;margin:14px 0}
      @media print{@page{margin:0}}
    `,
  },
  {
    id: "tech", name: "Tech", desc: "Blue structured layout for technical roles", accent: "#0369a1", tag: "Engineering",
    printCSS: `
      body{font-family:'Helvetica Neue',Arial,sans-serif;max-width:860px;margin:0 auto;padding:0;color:#1e293b;background:#fff}
      .header{background:#0369a1;padding:30px 40px 22px;color:#fff}
      .header h1{font-size:28px;font-weight:800;margin:0 0 4px}
      .header .subtitle{font-size:13px;opacity:.85}
      .body{padding:24px 40px}h1{display:none}
      h2{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#0369a1;border-left:3px solid #0369a1;padding-left:8px;margin:22px 0 8px;font-weight:700}
      p,li{font-size:13px;line-height:1.7;color:#374151}li{margin-left:16px;list-style:disc}
      strong{color:#0369a1}hr{border:none;border-top:1px solid #e0f2fe;margin:12px 0}
      @media print{@page{margin:0}}
    `,
  },
  {
    id: "graduate", name: "Graduate", desc: "Timeless serif style, traditional & polished", accent: "#1e293b", tag: "Classic",
    printCSS: `
      body{font-family:Georgia,'Times New Roman',serif;max-width:820px;margin:40px auto;padding:0 48px;color:#1e293b;background:#fff}
      h1{font-size:28px;font-weight:700;text-align:center;margin-bottom:4px;letter-spacing:1px}
      .subtitle{text-align:center;font-size:13px;color:#64748b;margin-bottom:20px}
      h2{font-size:14px;text-transform:uppercase;letter-spacing:2px;border-bottom:2px solid #1e293b;padding-bottom:4px;margin:24px 0 10px;font-weight:700}
      p,li{font-size:13.5px;line-height:1.8;color:#334155}li{margin-left:20px;list-style:disc}
      strong{font-weight:700}hr{border:none;border-top:1px solid #e2e8f0;margin:14px 0}
      @media print{body{margin:20px;padding:0 32px}}
    `,
  },
  {
    id: "creative", name: "Creative", desc: "Bold gradient header, vivid accent colours", accent: "#7c3aed", tag: "Stand Out",
    printCSS: `
      body{font-family:'Segoe UI','Helvetica Neue',sans-serif;max-width:820px;margin:0 auto;padding:0;color:#1e1b4b;background:#fff}
      .header{background:linear-gradient(135deg,#7c3aed 0%,#2563eb 100%);padding:36px 48px 28px;color:#fff}
      .header h1{font-size:32px;font-weight:900;margin:0 0 4px}
      .header .subtitle{font-size:14px;opacity:.85}
      .body{padding:28px 48px}h1{display:none}
      h2{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#7c3aed;padding:4px 10px;background:#ede9fe;border-radius:4px;display:inline-block;margin:24px 0 10px;font-weight:700}
      p,li{font-size:13.5px;line-height:1.7;color:#374151}li{margin-left:18px;list-style:disc}
      strong{color:#1e1b4b}hr{border:none;border-top:1px solid #ede9fe;margin:14px 0}
      @media print{@page{margin:0}}
    `,
  },
];

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: "professional", label: "Professional", desc: "Clear & corporate" },
  { value: "creative", label: "Creative", desc: "Dynamic & personal" },
  { value: "executive", label: "Executive", desc: "Strategic & commanding" },
];

function renderMarkdown(text: string) {
  return text
    .replace(/^# (.+)$/gm, "<h1 class='cv-name'>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr/>")
    .replace(/\n/g, "<br/>");
}

function buildPrintHTML(content: string, name: string, role: string, template: Template): string {
  const hasHeader = ["professional", "executive", "tech", "creative"].includes(template.id);
  const headerHTML = hasHeader
    ? `<div class="header"><h1>${name}</h1><div class="subtitle">${role}</div></div><div class="body">`
    : `<h1>${name}</h1><div class="subtitle">${role}</div>`;
  const closeBody = hasHeader ? "</div>" : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} — Resume</title>
<style>*{box-sizing:border-box;margin:0;padding:0}${template.printCSS}.cv-name{font-size:26px;font-weight:bold;margin-bottom:4px}</style>
</head><body>${headerHTML}${renderMarkdown(content)}${closeBody}</body></html>`;
}

function TemplateCard({ template, selected, onSelect }: { template: Template; selected: boolean; onSelect: () => void }) {
  const hasHeader = ["professional", "executive", "tech", "creative"].includes(template.id);
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-xl border-2 overflow-hidden text-left transition-all w-full ${
        selected ? "border-primary shadow-[0_0_0_3px_rgba(0,229,255,0.15)]" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="bg-white h-28 w-full overflow-hidden relative">
        {hasHeader ? (
          <div className="w-full h-8 flex flex-col justify-center px-2.5" style={{
            background: template.id === "creative" ? "linear-gradient(135deg,#7c3aed,#2563eb)" : template.accent,
          }}>
            <div className="h-2 w-20 rounded bg-white/70 mb-1" />
            <div className="h-1.5 w-14 rounded bg-white/45" />
          </div>
        ) : (
          <div className="pt-2.5 px-2.5 text-center">
            <div className="h-2.5 w-20 rounded mx-auto mb-1" style={{ background: template.accent + "aa" }} />
            <div className="h-1.5 w-14 rounded mx-auto mb-2" style={{ background: template.accent + "55" }} />
          </div>
        )}
        <div className="p-2 space-y-1.5">
          {[70, 85, 60, 75, 50, 65].map((w, i) => (
            i % 3 === 0
              ? <div key={i} className="h-1.5 w-12 rounded mb-0.5" style={{ background: template.accent + "bb" }} />
              : <div key={i} className="h-1 rounded bg-gray-300/60" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div className="px-2.5 py-2 bg-card border-t border-border">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-xs text-foreground">{template.name}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ background: template.accent }}>
            {template.tag}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">{template.desc}</p>
      </div>
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

function AtsPanel({ ats, onApplySummary }: { ats: AtsResult; onApplySummary: (s: string) => void }) {
  const color = ats.atsScore >= 70 ? "#4ade80" : ats.atsScore >= 45 ? "#facc15" : "#f87171";
  const label = ats.atsScore >= 70 ? "Strong Match" : ats.atsScore >= 45 ? "Moderate Match" : "Needs Work";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
            <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5"
              stroke={color}
              strokeDasharray={`${ats.atsScore} ${100 - ats.atsScore}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 1s ease" }}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-lg font-bold" style={{ color }}>{ats.atsScore}</div>
            <div className="text-[9px] text-muted-foreground">/100</div>
          </div>
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color }}>{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">ATS compatibility score for this job</div>
        </div>
      </div>

      {ats.presentKeywords.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-green-400 mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Matching Keywords
          </div>
          <div className="flex flex-wrap gap-1">
            {ats.presentKeywords.map(k => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">{k}</span>
            ))}
          </div>
        </div>
      )}

      {ats.missingKeywords.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-red-400 mb-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Missing Keywords
          </div>
          <div className="flex flex-wrap gap-1">
            {ats.missingKeywords.map(k => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">{k}</span>
            ))}
          </div>
        </div>
      )}

      {ats.suggestions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Improvement Tips
          </div>
          <ul className="space-y-1">
            {ats.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                <span className="text-primary shrink-0">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ats.tailoredSummary && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="text-xs font-semibold text-primary mb-1">Tailored Summary</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{ats.tailoredSummary}</p>
          <button
            onClick={() => onApplySummary(ats.tailoredSummary!)}
            className="mt-2 text-xs text-primary hover:underline font-medium"
          >
            Apply to my summary →
          </button>
        </div>
      )}
    </motion.div>
  );
}

function CvBuilderContent() {
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("build");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("professional");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [atsResult, setAtsResult] = useState<AtsResult | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showJobTarget, setShowJobTarget] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [tailorLoading, setTailorLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [assistLoading, setAssistLoading] = useState<AssistKey | null>(null);
  const [copied, setCopied] = useState<"resume" | "cover" | null>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "cover">("resume");
  const [editedCoverLetter, setEditedCoverLetter] = useState("");

  const [form, setForm] = useState<FormData>({
    name: user?.fullName ?? "",
    email: user?.primaryEmailAddress?.emailAddress ?? "",
    phone: "", location: "", linkedin: "",
    targetRole: "", targetCompany: "", currentRole: "",
    summary: "", experience: "", education: "", achievements: "",
    skills: [], skillInput: "", tone: "professional",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${basePath}/api/users/me`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setForm(prev => ({
          ...prev,
          name: prev.name || data.name || user?.fullName || "",
          email: prev.email || user?.primaryEmailAddress?.emailAddress || "",
          location: prev.location || data.location || data.country || "",
          linkedin: prev.linkedin || data.linkedinUrl || "",
          currentRole: prev.currentRole || data.role || "",
          summary: prev.summary || data.bio || "",
          skills: prev.skills.length > 0 ? prev.skills : (data.skills ?? []).map((s: any) => s.skill),
        }));
      } catch {}
    };
    load();
  }, []);

  const setField = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const addSkill = () => {
    const s = form.skillInput.trim();
    if (s && !form.skills.includes(s)) setForm(p => ({ ...p, skills: [...p.skills, s], skillInput: "" }));
  };

  const removeSkill = (skill: string) => setForm(p => ({ ...p, skills: p.skills.filter(x => x !== skill) }));

  const assist = async (key: AssistKey, action: string, content: string, field?: keyof FormData) => {
    if (!content.trim() && action !== "suggestSkills" && action !== "experienceSummary") {
      toast({ title: "Nothing to improve", description: "Add some content first.", variant: "destructive" });
      return;
    }
    setAssistLoading(key);
    try {
      const res = await fetch(`${basePath}/api/cv-builder/assist`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content, targetRole: form.targetRole, skills: form.skills, experience: form.experience }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = await res.json();
      if (action === "suggestSkills") {
        const newSkills = (data.skills ?? []).filter((s: string) => !form.skills.includes(s));
        setForm(p => ({ ...p, skills: [...p.skills, ...newSkills] }));
        toast({ title: `${newSkills.length} skills added`, description: "Review and remove any that don't apply." });
      } else if (field && data.result) {
        setField(field, data.result as any);
        toast({ title: "Updated by AI ✨" });
      }
    } catch (err: any) {
      toast({ title: "AI assist failed", description: err.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setAssistLoading(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseLoading(true);
    try {
      const text = await file.text();
      const res = await fetch(`${basePath}/api/cv-builder/parse`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText: text }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Parse failed");
      const data = await res.json();
      setForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        location: data.location || prev.location,
        linkedin: data.linkedin || prev.linkedin,
        currentRole: data.currentRole || prev.currentRole,
        targetRole: data.targetRole || prev.targetRole,
        summary: data.summary || prev.summary,
        experience: data.experience || prev.experience,
        education: data.education || prev.education,
        achievements: data.achievements || prev.achievements,
        skills: data.skills?.length > 0 ? [...new Set([...prev.skills, ...data.skills])] : prev.skills,
      }));
      toast({ title: "CV imported!", description: "Your data has been extracted. Review and adjust below." });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message ?? "Try a .txt or .md file.", variant: "destructive" });
    } finally {
      setParseLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const tailor = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "Paste a job description first", variant: "destructive" }); return;
    }
    const cvContent = [
      form.summary, form.experience, form.achievements, form.skills.join(", "),
    ].filter(Boolean).join("\n\n");
    if (!cvContent.trim()) {
      toast({ title: "Fill in your CV details first", variant: "destructive" }); return;
    }
    setTailorLoading(true);
    try {
      const res = await fetch(`${basePath}/api/cv-builder/tailor`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvContent, jobDescription, targetRole: form.targetRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setAtsResult(await res.json());
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setTailorLoading(false);
    }
  };

  const generate = async () => {
    if (!form.name || !form.targetRole || !form.experience) {
      toast({ title: "Missing required fields", description: "Name, target role, and experience are required.", variant: "destructive" });
      return;
    }
    setGenerateLoading(true);
    try {
      const res = await fetch(`${basePath}/api/cv-builder/generate`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, targetRole: form.targetRole, currentRole: form.currentRole,
          experience: form.experience, skills: form.skills, education: form.education,
          achievements: form.achievements, tone: form.tone, summary: form.summary,
          email: form.email, phone: form.phone, location: form.location,
          linkedin: form.linkedin, targetCompany: form.targetCompany,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const data: GenerateResult = await res.json();
      setResult(data);
      setEditedCoverLetter(data.coverLetter);
      setStep("preview");
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerateLoading(false);
    }
  };

  const previewHtml = useMemo(() => {
    if (!result) return "";
    const t = TEMPLATES.find(x => x.id === selectedTemplate) ?? TEMPLATES[0];
    return buildPrintHTML(result.resume, form.name, form.targetRole, t);
  }, [result, selectedTemplate, form.name, form.targetRole]);

  const downloadPDF = () => {
    const content = activeTab === "resume" ? result?.resume : editedCoverLetter;
    if (!content) return;
    const t = TEMPLATES.find(x => x.id === selectedTemplate) ?? TEMPLATES[0];
    const html = buildPrintHTML(content, form.name, form.targetRole, t);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      toast({ title: "Popup blocked", description: "Please allow popups for this site and try again.", variant: "destructive" });
      URL.revokeObjectURL(url);
      return;
    }
    win.onload = () => {
      setTimeout(() => {
        win.print();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, 300);
    };
  };

  const copyText = async (which: "resume" | "cover") => {
    const text = which === "resume" ? result?.resume : editedCoverLetter;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const inputCls = "w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50";
  const textareaCls = `${inputCls} resize-none`;

  const AiBtn = ({ assistKey, action, content, field, label }: {
    assistKey: AssistKey; action: string; content: string; field?: keyof FormData; label: string;
  }) => (
    <button
      onClick={() => assist(assistKey, action, content, field)}
      disabled={assistLoading !== null}
      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 transition-colors border border-primary/20 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-lg"
    >
      {assistLoading === assistKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {label}
    </button>
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
            <FileText className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-sm">AI CV Builder</span>
          </div>
          {step === "preview" && (
            <>
              <span className="text-border">|</span>
              <div className="flex gap-1 text-xs">
                <button onClick={() => setStep("build")} className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors">
                  ← Edit
                </button>
                <span className="text-border self-center">/</span>
                <span className="px-2 py-1 rounded-md text-primary font-semibold">Preview</span>
              </div>
            </>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <AnimatePresence mode="wait">

          {/* ─── STEP 1: BUILD ─── */}
          {step === "build" && (
            <motion.div key="build" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-6">

              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-full px-4 py-1.5 text-sm text-green-400 mb-3">
                  <Wand2 className="w-4 h-4" />AI-Powered Resume Builder
                </div>
                <h1 className="text-3xl font-bold mb-2">Build Your Professional CV</h1>
                <p className="text-muted-foreground">Your profile is pre-filled. Add experience, then generate with AI.</p>
              </div>

              {/* Section: Personal Info */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Personal Information</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Full Name *</label>
                    <input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="Your full name" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Email</label>
                    <input value={form.email} onChange={e => setField("email", e.target.value)} placeholder="your@email.com" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Phone</label>
                    <input value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="+1 555 000 0000" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Location</label>
                    <input value={form.location} onChange={e => setField("location", e.target.value)} placeholder="City, Country" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">LinkedIn URL</label>
                    <input value={form.linkedin} onChange={e => setField("linkedin", e.target.value)} placeholder="linkedin.com/in/yourprofile" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Current Role</label>
                    <input value={form.currentRole} onChange={e => setField("currentRole", e.target.value)} placeholder="e.g. Software Engineer at Company" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Section: Target */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Target Position</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Target Role *</label>
                    <input value={form.targetRole} onChange={e => setField("targetRole", e.target.value)} placeholder="e.g. Product Manager, Senior Engineer..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">Target Company <span className="text-muted-foreground font-normal">(for cover letter)</span></label>
                    <input value={form.targetCompany} onChange={e => setField("targetCompany", e.target.value)} placeholder="Company you're applying to (for cover letter)" className={inputCls} />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-xs font-medium mb-2">Writing Tone</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {TONE_OPTIONS.map(({ value, label, desc }) => (
                      <button key={value} onClick={() => setField("tone", value)} className={`rounded-xl border p-2.5 text-left transition-all ${form.tone === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80"}`}>
                        <div className="font-semibold text-xs">{label}</div>
                        <div className="text-[10px] mt-0.5 opacity-70">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section: Summary */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Professional Summary</h2>
                  </div>
                  <AiBtn assistKey="summary-gen" action="experienceSummary" content={form.experience} field="summary" label="Generate Summary" />
                </div>
                <textarea
                  value={form.summary}
                  onChange={e => setField("summary", e.target.value)}
                  placeholder="2-3 sentences about your expertise and what you bring to the role..."
                  rows={3}
                  className={textareaCls}
                />
              </div>

              {/* Section: Experience */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Work Experience *</h2>
                  </div>
                  <div className="flex gap-2">
                    <AiBtn assistKey="experience-rewrite" action="rewriteProfessionally" content={form.experience} field="experience" label="Rewrite" />
                    <AiBtn assistKey="experience-ats" action="atsOptimize" content={form.experience} field="experience" label="ATS Optimize" />
                  </div>
                </div>
                <textarea
                  value={form.experience}
                  onChange={e => setField("experience", e.target.value)}
                  placeholder={"Senior Engineer at Company A (2022–Present)\n- Led a team of 6, reduced load time by 40%\n- Architected a platform serving 200k+ users\n\nDeveloper at Company B (2019–2022)\n- Built REST APIs consumed by 100k+ users\n- Reduced infrastructure costs by 30%"}
                  rows={7}
                  className={textareaCls}
                />
              </div>

              {/* Section: Education + Achievements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Education</h2>
                  </div>
                  <textarea
                    value={form.education}
                    onChange={e => setField("education", e.target.value)}
                    placeholder={"BSc Computer Science\nUniversity Name (2019)\nFirst Class Honours\n\nAWS Solutions Architect Certification (2022)"}
                    rows={5}
                    className={textareaCls}
                  />
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Key Achievements</h2>
                    </div>
                    <AiBtn assistKey="achievements-improve" action="improveAchievements" content={form.achievements} field="achievements" label="Improve" />
                  </div>
                  <textarea
                    value={form.achievements}
                    onChange={e => setField("achievements", e.target.value)}
                    placeholder={"- Speaker at industry conference\n- Built product used by 100k+ users\n- Top performer award 2023"}
                    rows={5}
                    className={textareaCls}
                  />
                </div>
              </div>

              {/* Section: Skills */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Skills</h2>
                  </div>
                  <AiBtn assistKey="skills-suggest" action="suggestSkills" content={form.skills.join(", ")} label="Suggest Skills" />
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    value={form.skillInput}
                    onChange={e => setField("skillInput", e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    placeholder="React, Python, Figma, AWS..."
                    className={`flex-1 ${inputCls}`}
                  />
                  <Button onClick={addSkill} variant="outline" size="sm" className="rounded-xl h-auto px-3"><Plus className="w-4 h-4" /></Button>
                </div>
                {form.skills.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No skills added yet. Type above or click "Suggest Skills".</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {form.skills.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-xs rounded-full px-2.5 py-1">
                        {s}
                        <button onClick={() => removeSkill(s)} className="hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Section: Upload CV */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowUpload(v => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-sm">Upload Existing CV</span>
                    <span className="text-xs text-muted-foreground">— Parse & import your current resume</span>
                  </div>
                  {showUpload ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showUpload && (
                  <div className="px-6 pb-5 border-t border-border">
                    <p className="text-xs text-muted-foreground mt-3 mb-3">
                      Upload a <strong>.txt</strong> or <strong>.md</strong> file. AI will extract your info and populate the form above. For PDFs, copy-paste the text into a .txt file first.
                    </p>
                    <input ref={fileInputRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleFileUpload} />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={parseLoading}
                      variant="outline"
                      className="gap-2 rounded-xl"
                    >
                      {parseLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Parsing CV...</> : <><Upload className="w-4 h-4" />Choose File & Import</>}
                    </Button>
                  </div>
                )}
              </div>

              {/* Section: Job Targeting */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowJobTarget(v => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-400" />
                    <span className="font-semibold text-sm">Job Targeting & ATS Score</span>
                    <span className="text-xs text-muted-foreground">— Tailor your CV for a specific role</span>
                  </div>
                  {showJobTarget ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {showJobTarget && (
                  <div className="px-6 pb-5 border-t border-border">
                    <p className="text-xs text-muted-foreground mt-3 mb-2">
                      Paste a job description to get your ATS compatibility score, identify missing keywords, and get a tailored summary.
                    </p>
                    <textarea
                      value={jobDescription}
                      onChange={e => setJobDescription(e.target.value)}
                      placeholder="Paste the full job description here..."
                      rows={6}
                      className={textareaCls}
                    />
                    <div className="mt-3">
                      <Button onClick={tailor} disabled={tailorLoading} variant="outline" className="gap-2 rounded-xl">
                        {tailorLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing...</> : <><Target className="w-4 h-4" />Analyse & Get ATS Score</>}
                      </Button>
                    </div>
                    {atsResult && (
                      <AtsPanel ats={atsResult} onApplySummary={s => { setField("summary", s); toast({ title: "Summary applied!" }); }} />
                    )}
                  </div>
                )}
              </div>

              {/* Generate button */}
              <div className="flex justify-center pt-2 pb-8">
                <Button
                  onClick={generate}
                  disabled={generateLoading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-10 py-3.5 h-auto text-base font-bold rounded-2xl shadow-[0_0_40px_rgba(0,229,255,0.3)] hover:shadow-[0_0_60px_rgba(0,229,255,0.4)] transition-all"
                >
                  {generateLoading
                    ? <><Loader2 className="w-5 h-5 animate-spin" />Generating your CV...</>
                    : <><Sparkles className="w-5 h-5" />Generate with AI</>}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 2: PREVIEW ─── */}
          {step === "preview" && result && (
            <motion.div key="preview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold">Your CV is Ready 🎉</h1>
                  <p className="text-muted-foreground text-sm mt-1">Pick a template, preview, then download as PDF.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => setStep("build")} variant="outline" size="sm" className="rounded-xl gap-1.5">
                    <ChevronLeft className="w-4 h-4" />Edit
                  </Button>
                  <Button onClick={() => copyText(activeTab)} variant="outline" size="sm" className="rounded-xl gap-1.5">
                    {copied === activeTab ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    Copy
                  </Button>
                  <Button onClick={downloadPDF} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-1.5 px-5">
                    <Download className="w-4 h-4" />Download PDF
                  </Button>
                </div>
              </div>

              {/* Template picker */}
              <div className="mb-6">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-primary" />Choose Template
                </h2>
                <div className="grid grid-cols-5 gap-3">
                  {TEMPLATES.map(t => (
                    <TemplateCard key={t.id} template={t} selected={selectedTemplate === t.id} onSelect={() => setSelectedTemplate(t.id)} />
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {(["resume", "cover"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
                    {tab === "resume" ? "📄 Resume" : "✉️ Cover Letter"}
                  </button>
                ))}
              </div>

              {/* Two-column: content + iframe preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Content — editable for cover letter */}
                <div>
                  <div className="h-1.5 w-full rounded-t-lg" style={{ backgroundColor: TEMPLATES.find(t => t.id === selectedTemplate)?.accent }} />
                  {activeTab === "resume" ? (
                    <div className="bg-white border border-border rounded-b-2xl p-6 leading-relaxed max-h-[600px] overflow-y-auto">
                      <div
                        className="prose prose-sm max-w-none"
                        style={{ color: "#1e293b" }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(result.resume) }}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <textarea
                        value={editedCoverLetter}
                        onChange={e => setEditedCoverLetter(e.target.value)}
                        className="w-full bg-white border border-border rounded-b-2xl p-6 text-sm text-gray-800 leading-relaxed resize-none outline-none focus:border-primary/40 transition-colors"
                        style={{ minHeight: 600, fontFamily: "Georgia, serif" }}
                      />
                      <div className="absolute top-3 right-3 text-[10px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded">
                        editable
                      </div>
                    </div>
                  )}
                </div>

                {/* Live iframe preview */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Eye className="w-3.5 h-3.5" />Print Preview
                  </div>
                  <div className="rounded-2xl border border-border overflow-hidden" style={{ height: 600 }}>
                    <iframe
                      key={`${selectedTemplate}-${activeTab}-${editedCoverLetter.length}`}
                      title="CV Preview"
                      srcDoc={activeTab === "resume" ? previewHtml : buildPrintHTML(editedCoverLetter, form.name, form.targetRole, TEMPLATES.find(t => t.id === selectedTemplate) ?? TEMPLATES[0])}
                      className="w-full h-full border-0 bg-white"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-4">
                Download opens the print dialog → choose <strong>Save as PDF</strong> in your browser's print dialog
              </p>

              <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">Practice for your interview next</p>
                  <p className="text-muted-foreground text-sm">Use your new CV with the AI Interview Coach.</p>
                </div>
                <Link to="/interview-coach">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2" size="sm">
                    <Sparkles className="w-4 h-4" />Interview Coach
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

export default function CvBuilder() {
  return (
    <>
      <Show when="signed-in"><CvBuilderContent /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}
