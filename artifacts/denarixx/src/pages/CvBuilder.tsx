import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import {
  FileText, Sparkles, Download, Copy, Check, ChevronLeft,
  Loader2, Plus, X, Wand2, Layout, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tone = "professional" | "creative" | "executive";
type Step = "form" | "template" | "result";
type TemplateId = "modern" | "classic" | "minimal" | "executive" | "creative" | "corporate";

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: "professional", label: "Professional", desc: "Clear, structured, corporate" },
  { value: "creative", label: "Creative", desc: "Dynamic and personality-forward" },
  { value: "executive", label: "Executive", desc: "Strategic, high-level leadership" },
];

interface Template {
  id: TemplateId;
  name: string;
  desc: string;
  accent: string;
  tag: string;
  printCSS: string;
}

const TEMPLATES: Template[] = [
  {
    id: "modern",
    name: "Modern",
    desc: "Clean layout with a bold cyan accent bar",
    accent: "#00E5FF",
    tag: "Most Popular",
    printCSS: `
      body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 820px; margin: 0 auto; padding: 0; color: #1a1a2e; background: #fff; }
      .header { background: #00E5FF; padding: 32px 40px 24px; color: #0b1020; }
      .header h1 { font-size: 32px; font-weight: 900; margin: 0 0 4px; letter-spacing: -0.5px; }
      .header .subtitle { font-size: 14px; opacity: 0.75; }
      .body { padding: 28px 40px; }
      h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #00E5FF; border-left: 3px solid #00E5FF; padding-left: 10px; margin: 24px 0 10px; font-weight: 700; }
      h1 { display: none; }
      p, li { font-size: 13.5px; line-height: 1.7; color: #2d2d3a; }
      li { margin-left: 18px; list-style: disc; }
      strong { color: #0b1020; }
      hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
      @media print { @page { margin: 0; } }
    `,
  },
  {
    id: "classic",
    name: "Classic",
    desc: "Timeless serif style, traditional and polished",
    accent: "#1e293b",
    tag: "Traditional",
    printCSS: `
      body { font-family: Georgia, 'Times New Roman', serif; max-width: 820px; margin: 40px auto; padding: 0 48px; color: #1e293b; background: #fff; }
      h1 { font-size: 28px; font-weight: 700; text-align: center; margin-bottom: 4px; letter-spacing: 1px; }
      .subtitle { text-align: center; font-size: 13px; color: #64748b; margin-bottom: 20px; }
      h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #1e293b; padding-bottom: 4px; margin: 24px 0 10px; font-weight: 700; }
      p, li { font-size: 13.5px; line-height: 1.8; color: #334155; }
      li { margin-left: 20px; list-style: disc; }
      strong { font-weight: 700; }
      hr { border: none; border-top: 1px solid #e2e8f0; margin: 14px 0; }
      @media print { body { margin: 20px; padding: 0 32px; } }
    `,
  },
  {
    id: "minimal",
    name: "Minimal",
    desc: "Ultra-clean with generous white space",
    accent: "#6366f1",
    tag: "Elegant",
    printCSS: `
      body { font-family: 'Inter', 'Segoe UI', sans-serif; max-width: 760px; margin: 60px auto; padding: 0 48px; color: #18181b; background: #fff; }
      h1 { font-size: 30px; font-weight: 300; margin-bottom: 2px; letter-spacing: -0.5px; }
      .subtitle { font-size: 13px; color: #71717a; margin-bottom: 40px; }
      h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #6366f1; margin: 32px 0 10px; font-weight: 600; }
      p, li { font-size: 13.5px; line-height: 1.8; color: #3f3f46; font-weight: 300; }
      li { margin-left: 20px; list-style: none; padding-left: 12px; border-left: 1px solid #e4e4e7; }
      strong { font-weight: 500; color: #18181b; }
      hr { border: none; border-top: 1px solid #f4f4f5; margin: 20px 0; }
      @media print { body { margin: 30px; padding: 0 30px; } }
    `,
  },
  {
    id: "executive",
    name: "Executive",
    desc: "Dark header with a powerful leadership feel",
    accent: "#0f172a",
    tag: "Leadership",
    printCSS: `
      body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 820px; margin: 0 auto; padding: 0; color: #1e293b; background: #fff; }
      .header { background: #0f172a; padding: 36px 48px 28px; color: #fff; }
      .header h1 { font-size: 30px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.5px; }
      .header .subtitle { font-size: 13px; color: #94a3b8; }
      .body { padding: 28px 48px; }
      h1 { display: none; }
      h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin: 24px 0 10px; font-weight: 700; }
      p, li { font-size: 13.5px; line-height: 1.7; color: #334155; }
      li { margin-left: 18px; list-style: disc; }
      strong { color: #0f172a; font-weight: 700; }
      hr { border: none; border-top: 1px solid #e2e8f0; margin: 14px 0; }
      @media print { @page { margin: 0; } }
    `,
  },
  {
    id: "creative",
    name: "Creative",
    desc: "Bold gradient header, vivid accent colours",
    accent: "#7c3aed",
    tag: "Stand Out",
    printCSS: `
      body { font-family: 'Segoe UI', 'Helvetica Neue', sans-serif; max-width: 820px; margin: 0 auto; padding: 0; color: #1e1b4b; background: #fff; }
      .header { background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); padding: 36px 48px 28px; color: #fff; }
      .header h1 { font-size: 32px; font-weight: 900; margin: 0 0 4px; }
      .header .subtitle { font-size: 14px; opacity: 0.85; }
      .body { padding: 28px 48px; }
      h1 { display: none; }
      h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #7c3aed; padding: 4px 10px; background: #ede9fe; border-radius: 4px; display: inline-block; margin: 24px 0 10px; font-weight: 700; }
      p, li { font-size: 13.5px; line-height: 1.7; color: #374151; }
      li { margin-left: 18px; list-style: disc; }
      strong { color: #1e1b4b; }
      hr { border: none; border-top: 1px solid #ede9fe; margin: 14px 0; }
      @media print { @page { margin: 0; } }
    `,
  },
  {
    id: "corporate",
    name: "Corporate",
    desc: "Two-column with sidebar for a structured layout",
    accent: "#0369a1",
    tag: "Structured",
    printCSS: `
      body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 860px; margin: 0 auto; padding: 0; color: #1e293b; background: #fff; display: flex; flex-direction: column; }
      .header { background: #0369a1; padding: 30px 40px 22px; color: #fff; }
      .header h1 { font-size: 28px; font-weight: 800; margin: 0 0 4px; }
      .header .subtitle { font-size: 13px; opacity: 0.8; }
      .body { padding: 24px 40px; }
      h1 { display: none; }
      h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #0369a1; border-left: 3px solid #0369a1; padding-left: 8px; margin: 22px 0 8px; font-weight: 700; }
      p, li { font-size: 13px; line-height: 1.7; color: #374151; }
      li { margin-left: 16px; list-style: disc; }
      strong { color: #0369a1; }
      hr { border: none; border-top: 1px solid #e0f2fe; margin: 12px 0; }
      @media print { @page { margin: 0; } }
    `,
  },
];

const SAMPLE_CV = `# Amara Nwosu

**Email:** amara.nwosu@email.com | **Phone:** +234 801 234 5678 | **Location:** Lagos, Nigeria | **LinkedIn:** linkedin.com/in/amaranwosu

## Professional Summary

Results-driven Senior Software Engineer with 6+ years of experience building scalable fintech and e-commerce platforms across Africa. Passionate about leveraging technology to solve real-world problems and mentoring the next generation of African developers.

---

## Experience

**Senior Software Engineer** — Flutterwave, Lagos *(2021 – Present)*
- Led a team of 8 engineers to redesign the payment gateway, reducing transaction latency by 40%
- Architected a microservices platform processing $2M+ in daily transactions across 14 African countries
- Introduced automated testing practices that reduced production bugs by 65%

**Software Developer** — Andela, Remote *(2019 – 2021)*
- Built and maintained RESTful APIs serving 500k+ daily active users
- Collaborated with US-based clients on React and Node.js projects, consistently receiving 5-star ratings
- Contributed to open-source tooling adopted by 12,000+ developers globally

---

## Education

**BSc Computer Science** — University of Lagos *(First Class Honours, 2019)*

**AWS Certified Solutions Architect** — Amazon Web Services *(2022)*

---

## Skills

- **Languages:** JavaScript, TypeScript, Python, Go
- **Frontend:** React, Next.js, Tailwind CSS
- **Backend:** Node.js, Express, PostgreSQL, Redis
- **Cloud:** AWS, Docker, Kubernetes, CI/CD

---

## Key Achievements

- Speaker at AfricaTech Summit 2023 on "Scaling Fintech in Emerging Markets"
- Built a mobile money integration used by 200,000 users in Nigeria and Ghana
- Open-source contributor with 1,400+ GitHub stars across personal projects
`;

function previewTemplate(template: Template) {
  const html = buildPrintHTML(SAMPLE_CV, "Amara Nwosu", "Senior Software Engineer", template);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

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
  const hasHeader = template.id === "modern" || template.id === "executive" || template.id === "creative" || template.id === "corporate";
  const headerHTML = hasHeader
    ? `<div class="header"><h1>${name}</h1><div class="subtitle">${role}</div></div><div class="body">`
    : "";
  const closeBody = hasHeader ? "</div>" : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${name} — Resume</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    ${template.printCSS}
    .cv-name { font-size: 26px; font-weight: bold; margin-bottom: 4px; }
  </style>
</head>
<body>
  ${headerHTML}
  ${renderMarkdown(content)}
  ${closeBody}
</body>
</html>`;
}

// Mini visual preview cards for each template
function TemplatePreview({ template, selected, onClick }: { template: Template; selected: boolean; onClick: () => void }) {
  const accent = template.accent;
  const hasHeader = ["modern", "executive", "creative", "corporate"].includes(template.id);

  return (
    <div className={`relative rounded-xl border-2 transition-all overflow-hidden flex flex-col ${
      selected ? "border-primary shadow-[0_0_0_3px_rgba(0,229,255,0.2)]" : "border-border hover:border-primary/40"
    }`}>
      {/* Clickable mini CV thumbnail */}
      <button onClick={onClick} className="text-left flex-1">
        <div className="bg-white h-44 w-full overflow-hidden relative">
          {hasHeader && (
            <div className="w-full h-10 flex flex-col justify-center px-3" style={{ backgroundColor: template.id === "creative" ? undefined : accent, background: template.id === "creative" ? `linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)` : undefined }}>
              <div className="h-2.5 w-28 rounded-sm bg-white/70 mb-1.5" />
              <div className="h-1.5 w-20 rounded-sm bg-white/45" />
            </div>
          )}
          <div className="p-3 space-y-2">
            {!hasHeader && (
              <div className="mb-3 text-center">
                <div className="h-3 w-32 rounded mx-auto bg-gray-800/80 mb-1.5" />
                <div className="h-1.5 w-24 rounded mx-auto bg-gray-400/50" />
                <div className="h-px w-full bg-gray-200 mt-3 mb-1" />
              </div>
            )}
            {/* Simulated section labels + body lines */}
            {[
              { label: true, w: 60 },
              { label: false, w: 88 },
              { label: false, w: 72 },
              { label: true, w: 55 },
              { label: false, w: 80 },
              { label: false, w: 65 },
              { label: false, w: 75 },
              { label: true, w: 48 },
              { label: false, w: 70 },
            ].map((row, i) => (
              <div key={i}>
                {row.label ? (
                  <div className="h-1.5 w-14 rounded mt-2 mb-1" style={{ backgroundColor: accent + "cc" }} />
                ) : (
                  <div className="h-1 rounded bg-gray-300/70 mb-0.5" style={{ width: `${row.w}%` }} />
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Label row */}
        <div className="px-3 pt-2.5 pb-1 bg-card">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-semibold text-sm text-foreground">{template.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: accent }}>
              {template.tag}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{template.desc}</p>
        </div>
      </button>

      {/* Preview button */}
      <div className="px-3 pb-3 bg-card">
        <button
          onClick={(e) => { e.stopPropagation(); previewTemplate(template); }}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-lg py-1.5 transition-colors mt-1"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview with sample CV
        </button>
      </div>

      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center pointer-events-none">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

function CvBuilderContent() {
  const { user } = useUser();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"resume" | "cover" | null>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "cover">("resume");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("modern");

  const [form, setForm] = useState({
    name: user?.fullName ?? "",
    targetRole: "",
    currentRole: "",
    experience: "",
    education: "",
    achievements: "",
    tone: "professional" as Tone,
    skills: [] as string[],
    skillInput: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch(`${basePath}/api/users/me`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setForm(prev => ({
          ...prev,
          name: prev.name || data.name || user?.fullName || "",
          currentRole: prev.currentRole || data.role || "",
          skills: prev.skills.length > 0 ? prev.skills : (data.skills ?? []).map((s: any) => s.skill),
        }));
      } catch {}
    };
    loadProfile();
  }, []);

  const [result, setResult] = useState<{ resume: string; coverLetter: string } | null>(null);

  const addSkill = () => {
    const s = form.skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, s], skillInput: "" }));
    }
  };

  const removeSkill = (skill: string) =>
    setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));

  const generate = async () => {
    if (!form.name || !form.targetRole || !form.experience) {
      toast({ title: "Missing fields", description: "Name, target role, and experience are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/cv-builder/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          targetRole: form.targetRole,
          currentRole: form.currentRole,
          experience: form.experience,
          education: form.education,
          achievements: form.achievements,
          skills: form.skills,
          tone: form.tone,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generation failed");
      }
      const data = await res.json();
      setResult(data);
      setStep("template");
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (which: "resume" | "cover") => {
    const text = which === "resume" ? result?.resume : result?.coverLetter;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadPDF = () => {
    const content = activeTab === "resume" ? result?.resume : result?.coverLetter;
    if (!content) return;
    const template = TEMPLATES.find(t => t.id === selectedTemplate) ?? TEMPLATES[0];
    const html = buildPrintHTML(content, form.name, form.targetRole, template);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  const template = TEMPLATES.find(t => t.id === selectedTemplate) ?? TEMPLATES[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-sm">AI CV Builder</span>
          </div>
          {step !== "form" && (
            <>
              <span className="text-border">|</span>
              <div className="flex gap-1 text-xs">
                <button onClick={() => setStep("template")} className={`px-2 py-1 rounded-md transition-colors ${step === "template" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                  Template
                </button>
                <span className="text-border self-center">/</span>
                <button onClick={() => setStep("result")} className={`px-2 py-1 rounded-md transition-colors ${step === "result" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                  Preview
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: FORM ── */}
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-full px-4 py-1.5 text-sm text-green-400 mb-4">
                  <Wand2 className="w-4 h-4" />
                  AI-Powered Resume Builder
                </div>
                <h1 className="text-3xl font-bold mb-2">Build Your CV in Seconds</h1>
                <p className="text-muted-foreground">Fill in your details, pick a template, and download a polished PDF.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Personal Information</h2>
                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Full Name *</label>
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Amara Nwosu" className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Target Role *</label>
                    <input value={form.targetRole} onChange={e => setForm(p => ({ ...p, targetRole: e.target.value }))} placeholder="Senior Software Engineer" className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Current Role</label>
                    <input value={form.currentRole} onChange={e => setForm(p => ({ ...p, currentRole: e.target.value }))} placeholder="Software Developer at Andela" className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Education</label>
                    <input value={form.education} onChange={e => setForm(p => ({ ...p, education: e.target.value }))} placeholder="BSc Computer Science, University of Lagos" className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Experience & Skills</h2>
                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Experience Summary *</label>
                    <textarea value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} placeholder="Describe your work experience, projects, and impact..." rows={4} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Key Achievements</label>
                    <textarea value={form.achievements} onChange={e => setForm(p => ({ ...p, achievements: e.target.value }))} placeholder="e.g. Led team of 8, reduced system latency by 40%, launched product used by 50k users..." rows={3} className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Skills</label>
                    <div className="flex gap-2 mb-2">
                      <input value={form.skillInput} onChange={e => setForm(p => ({ ...p, skillInput: e.target.value }))} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())} placeholder="React, Python, Figma..." className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors" />
                      <Button onClick={addSkill} variant="outline" size="sm" className="rounded-xl h-auto"><Plus className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {form.skills.map(s => (
                        <span key={s} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-xs rounded-full px-2.5 py-1">
                          {s}
                          <button onClick={() => removeSkill(s)}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Writing Tone</h2>
                <div className="grid grid-cols-3 gap-3">
                  {TONE_OPTIONS.map(({ value, label, desc }) => (
                    <button key={value} onClick={() => setForm(p => ({ ...p, tone: value }))} className={`rounded-xl border p-3 text-left transition-all ${form.tone === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"}`}>
                      <div className="font-semibold text-sm">{label}</div>
                      <div className="text-xs mt-0.5 opacity-70">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Button onClick={generate} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8 py-3 h-auto text-base font-semibold rounded-xl">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Generating your CV...</> : <><Sparkles className="w-5 h-5" />Generate with AI</>}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: TEMPLATE PICKER ── */}
          {step === "template" && (
            <motion.div key="template" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-full px-4 py-1.5 text-sm text-green-400 mb-4">
                  <Layout className="w-4 h-4" />
                  Choose a Template
                </div>
                <h1 className="text-3xl font-bold mb-2">Your CV is Ready! 🎉</h1>
                <p className="text-muted-foreground">Select a professional template, then download your CV as a PDF.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {TEMPLATES.map(t => (
                  <TemplatePreview key={t.id} template={t} selected={selectedTemplate === t.id} onClick={() => setSelectedTemplate(t.id)} />
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={() => setStep("form")} variant="outline" className="rounded-xl gap-2 w-full sm:w-auto">
                  <ChevronLeft className="w-4 h-4" />
                  Edit Details
                </Button>
                <Button onClick={() => { setActiveTab("resume"); setStep("result"); }} variant="outline" className="rounded-xl gap-2 w-full sm:w-auto">
                  <FileText className="w-4 h-4" />
                  Preview Content
                </Button>
                <Button onClick={downloadPDF} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2 w-full sm:w-auto px-8">
                  <Download className="w-4 h-4" />
                  Download PDF — {template.name}
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-3">
                Opens in a new tab → use your browser's <strong>Print → Save as PDF</strong> to download
              </p>
            </motion.div>
          )}

          {/* ── STEP 3: PREVIEW ── */}
          {step === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold">Preview</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Template: <span className="text-primary font-medium">{template.name}</span> — switch template or download below.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => setStep("template")} variant="outline" size="sm" className="rounded-xl gap-1.5">
                    <Layout className="w-4 h-4" />
                    Templates
                  </Button>
                  <Button onClick={() => setStep("form")} variant="outline" size="sm" className="rounded-xl gap-1.5">
                    <ChevronLeft className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button onClick={() => copyText(activeTab)} variant="outline" size="sm" className="rounded-xl gap-1.5">
                    {copied === activeTab ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    Copy
                  </Button>
                  <Button onClick={downloadPDF} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-1.5">
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
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

              {/* Template colour accent bar */}
              <div className="h-1.5 w-full rounded-t-md mb-0" style={{ backgroundColor: template.accent }} />
              <div className="bg-white border border-border rounded-b-2xl p-6 md:p-8 leading-relaxed">
                <div
                  className="prose prose-sm max-w-none"
                  style={{ color: "#1e293b" }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(activeTab === "resume" ? result?.resume ?? "" : result?.coverLetter ?? "")
                  }}
                />
              </div>

              <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">Want to practice for interviews?</p>
                  <p className="text-muted-foreground text-sm">Use your new CV with the AI Interview Coach.</p>
                </div>
                <Link to="/interview-coach">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2" size="sm">
                    <Sparkles className="w-4 h-4" />
                    Interview Coach
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
      <Show when="signed-in">
        <CvBuilderContent />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}
