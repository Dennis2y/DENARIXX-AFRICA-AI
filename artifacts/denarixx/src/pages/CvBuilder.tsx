import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, Show } from "@clerk/react";
import { Redirect } from "wouter";
import {
  FileText, Sparkles, Download, Copy, Check, ChevronLeft,
  Loader2, Plus, X, Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tone = "professional" | "creative" | "executive";
type Step = "form" | "result";

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: "professional", label: "Professional", desc: "Clear, structured, corporate" },
  { value: "creative", label: "Creative", desc: "Dynamic and personality-forward" },
  { value: "executive", label: "Executive", desc: "Strategic, high-level leadership" },
];

function renderMarkdown(text: string) {
  return text
    .replace(/^# (.+)$/gm, "<h1 class='text-xl font-bold mt-4 mb-1'>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2 class='text-base font-semibold mt-4 mb-2 text-primary'>$2</h2>".replace("$2", "$1"))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc text-sm'>$1</li>")
    .replace(/^---$/gm, "<hr class='border-border my-3' />")
    .replace(/\n/g, "<br/>");
}

function CvBuilderContent() {
  const { user } = useUser();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"resume" | "cover" | null>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "cover">("resume");
  const [profileLoaded, setProfileLoaded] = useState(false);

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

  // Pre-fill from profile on mount
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
      } catch {} finally {
        setProfileLoaded(true);
      }
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

  const removeSkill = (skill: string) => setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));

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
      setStep("result");
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

  const printDocument = () => {
    const content = activeTab === "resume" ? result?.resume : result?.coverLetter;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${activeTab === "resume" ? "Resume" : "Cover Letter"} — ${form.name}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.6; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        h2 { font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px; }
        li { margin-left: 20px; }
        hr { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
        @media print { body { margin: 20px; } }
      </style></head>
      <body>${renderMarkdown(content)}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <a href={`${basePath}/dashboard`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </a>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-sm">AI CV Builder</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-full px-4 py-1.5 text-sm text-green-400 mb-4">
                  <Wand2 className="w-4 h-4" />
                  AI-Powered Resume Builder
                </div>
                <h1 className="text-3xl font-bold mb-2">Build Your CV in Seconds</h1>
                <p className="text-muted-foreground">Tell DENA about yourself and get a professional resume + cover letter tailored for the African and global job market.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal info */}
                <div className="space-y-4">
                  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Personal Information</h2>

                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Full Name *</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Amara Nwosu"
                      className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Target Role *</label>
                    <input
                      value={form.targetRole}
                      onChange={e => setForm(p => ({ ...p, targetRole: e.target.value }))}
                      placeholder="Senior Software Engineer"
                      className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Current Role</label>
                    <input
                      value={form.currentRole}
                      onChange={e => setForm(p => ({ ...p, currentRole: e.target.value }))}
                      placeholder="Software Developer at Andela"
                      className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Education</label>
                    <input
                      value={form.education}
                      onChange={e => setForm(p => ({ ...p, education: e.target.value }))}
                      placeholder="BSc Computer Science, University of Lagos"
                      className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Experience & skills */}
                <div className="space-y-4">
                  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Experience & Skills</h2>

                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Experience Summary *</label>
                    <textarea
                      value={form.experience}
                      onChange={e => setForm(p => ({ ...p, experience: e.target.value }))}
                      placeholder="Describe your work experience, projects, and impact..."
                      rows={4}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Key Achievements</label>
                    <textarea
                      value={form.achievements}
                      onChange={e => setForm(p => ({ ...p, achievements: e.target.value }))}
                      placeholder="e.g. Led team of 8, reduced system latency by 40%, launched product used by 50k users..."
                      rows={3}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors resize-none"
                    />
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="block text-sm mb-1.5 font-medium">Skills</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={form.skillInput}
                        onChange={e => setForm(p => ({ ...p, skillInput: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
                        placeholder="React, Python, Figma..."
                        className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
                      />
                      <Button onClick={addSkill} variant="outline" size="sm" className="rounded-xl h-auto">
                        <Plus className="w-4 h-4" />
                      </Button>
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

              {/* Tone */}
              <div className="mt-6">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Writing Tone</h2>
                <div className="grid grid-cols-3 gap-3">
                  {TONE_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setForm(p => ({ ...p, tone: value }))}
                      className={`rounded-xl border p-3 text-left transition-all ${form.tone === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"}`}
                    >
                      <div className="font-semibold text-sm">{label}</div>
                      <div className="text-xs mt-0.5 opacity-70">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  onClick={generate}
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8 py-3 h-auto text-base font-semibold rounded-xl"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Generating your CV...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" />Generate with AI</>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              {/* Result header */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold">Your CV is Ready! 🎉</h1>
                  <p className="text-muted-foreground text-sm mt-1">Review, copy, or print your resume and cover letter.</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setStep("form")} variant="outline" size="sm" className="rounded-xl gap-1.5">
                    <ChevronLeft className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button onClick={printDocument} variant="outline" size="sm" className="rounded-xl gap-1.5">
                    <Download className="w-4 h-4" />
                    Print / PDF
                  </Button>
                  <Button
                    onClick={() => copyText(activeTab)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5"
                  >
                    {copied === activeTab ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    Copy
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {(["resume", "cover"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {tab === "resume" ? "📄 Resume" : "✉️ Cover Letter"}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div ref={printRef} className="bg-card border border-border rounded-2xl p-6 md:p-8 leading-relaxed">
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(activeTab === "resume" ? result?.resume ?? "" : result?.coverLetter ?? "")
                  }}
                />
              </div>

              {/* Footer CTA */}
              <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">Want to practice for interviews?</p>
                  <p className="text-muted-foreground text-sm">Use your new CV with the AI Interview Coach.</p>
                </div>
                <a href={`${basePath}/interview-coach`}>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2" size="sm">
                    <Sparkles className="w-4 h-4" />
                    Interview Coach
                  </Button>
                </a>
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
