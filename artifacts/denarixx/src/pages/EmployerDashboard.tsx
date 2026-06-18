import { useState, useEffect } from "react";
import { Show } from "@clerk/react";
import { Redirect, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Plus,
  RefreshCw,
  Zap,
  Users,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  Building2,
  MapPin,
  DollarSign,
  Tag,
  Layers,
  Wifi,
  X,
  ShieldCheck,
  MessageSquare,
  ChevronDown,
  FileText,
  User,
  Mail,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ModerationStatus = "pending" | "approved" | "rejected";
type ApplicationStatus = "applied" | "reviewing" | "interview" | "offered" | "rejected";

interface MyJob {
  id: number;
  title: string;
  company: string;
  location: string;
  jobType: string;
  level: string;
  salary: string | null;
  remoteType: string | null;
  moderationStatus: ModerationStatus;
  isActive: boolean;
  createdAt: string;
  applicationCount: number;
}

interface Applicant {
  id: number;
  userId: number;
  jobId: number;
  status: ApplicationStatus;
  coverLetter: string | null;
  appliedAt: string;
  candidateName: string | null;
  candidateEmail: string;
  candidateRole: string | null;
  candidateAvatarUrl: string | null;
}

interface PostJobPayload {
  title: string;
  company: string;
  location: string;
  description: string;
  requiredSkills: string;
  salary: string;
  jobType: string;
  level: string;
  remoteType: string;
  country: string;
}

const EMPTY_FORM: PostJobPayload = {
  title: "",
  company: "",
  location: "",
  description: "",
  requiredSkills: "",
  salary: "",
  jobType: "full-time",
  level: "mid",
  remoteType: "on-site",
  country: "",
};

const STATUS_CONFIG: Record<ModerationStatus, { label: string; icon: typeof Clock; classes: string }> = {
  pending: { label: "Under Review", icon: Clock, classes: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  approved: { label: "Live", icon: CheckCircle, classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  rejected: { label: "Rejected", icon: XCircle, classes: "bg-red-500/15 text-red-300 border-red-500/30" },
};

const APP_STATUS_CONFIG: Record<ApplicationStatus, { label: string; classes: string }> = {
  applied:    { label: "Applied",    classes: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  reviewing:  { label: "Reviewing",  classes: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  interview:  { label: "Interview",  classes: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  offered:    { label: "Offered",    classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  rejected:   { label: "Rejected",   classes: "bg-red-500/15 text-red-300 border-red-500/30" },
};

function StatusBadge({ status }: { status: ModerationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${cfg.classes}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function AppStatusBadge({ status }: { status: ApplicationStatus }) {
  const cfg = APP_STATUS_CONFIG[status] ?? APP_STATUS_CONFIG.applied;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

function CandidateAvatar({ name, url, size = 36 }: { name?: string | null; url?: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (url) return <img src={url} alt={name ?? "Candidate"} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 font-bold text-primary" style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

function ApplicantRow({
  applicant,
  jobTitle,
  onStatusChange,
}: {
  applicant: Applicant;
  jobTitle: string;
  onStatusChange: (appId: number, status: ApplicationStatus) => void;
}) {
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const STATUS_OPTIONS: ApplicationStatus[] = ["applied", "reviewing", "interview", "offered", "rejected"];

  async function handleStatusChange(newStatus: ApplicationStatus) {
    if (newStatus === applicant.status) return;
    setUpdating(true);
    try {
      const res = await fetch(`${BASE}/api/jobs/applications/${applicant.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update");
      onStatusChange(applicant.id, newStatus);
      toast({ title: "Status updated", description: `${applicant.candidateName ?? "Candidate"} marked as ${APP_STATUS_CONFIG[newStatus].label}` });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  }

  function handleMessage() {
    const params = new URLSearchParams({
      partnerId: String(applicant.userId),
      jobApplicationId: String(applicant.id),
      jobTitle,
    });
    setLocation(`/messages?${params.toString()}`);
  }

  return (
    <div className="border border-border rounded-xl bg-card/40 overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <CandidateAvatar name={applicant.candidateName} url={applicant.candidateAvatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{applicant.candidateName ?? "Anonymous"}</p>
              {applicant.candidateRole && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3" />
                  {applicant.candidateRole}
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3" />
                {applicant.candidateEmail}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <AppStatusBadge status={applicant.status} />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Status dropdown */}
            <div className="relative">
              <select
                value={applicant.status}
                disabled={updating}
                onChange={e => handleStatusChange(e.target.value as ApplicationStatus)}
                className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50 appearance-none pr-7 cursor-pointer"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{APP_STATUS_CONFIG[s].label}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleMessage}
              className="h-7 text-xs gap-1.5 px-2.5"
            >
              <MessageSquare className="w-3 h-3" />
              Message
            </Button>

            {applicant.coverLetter && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <FileText className="w-3 h-3" />
                {expanded ? "Hide" : "Cover letter"}
              </button>
            )}

            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(applicant.appliedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {expanded && applicant.coverLetter && (
        <div className="px-4 pb-4 border-t border-border mt-0">
          <p className="text-xs text-muted-foreground font-medium mt-3 mb-2">Cover letter</p>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{applicant.coverLetter}</p>
        </div>
      )}
    </div>
  );
}

function ApplicantsModal({
  job,
  onClose,
}: {
  job: MyJob;
  onClose: () => void;
}) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${BASE}/api/jobs/${job.id}/applicants`, { credentials: "include" });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load");
        const data = await res.json();
        setApplicants(data.applicants ?? []);
      } catch (e: any) {
        setError(e.message ?? "Failed to load applicants");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [job.id]);

  function handleStatusChange(appId: number, newStatus: ApplicationStatus) {
    setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{job.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {loading ? "Loading…" : `${applicants.length} ${applicants.length === 1 ? "applicant" : "applicants"}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading applicants…</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive text-sm">{error}</div>
          ) : applicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
              <Users className="w-12 h-12 mb-3 opacity-25" />
              <p className="font-semibold">No applicants yet</p>
              <p className="text-sm mt-1">When candidates apply, they'll show up here.</p>
            </div>
          ) : (
            applicants.map(applicant => (
              <ApplicantRow
                key={applicant.id}
                applicant={applicant}
                jobTitle={job.title}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

function EditJobModal({
  job,
  onClose,
  onSuccess,
}: {
  job: MyJob;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setFormState] = useState<PostJobPayload>({
    title: job.title,
    company: job.company,
    location: job.location,
    description: "",
    requiredSkills: "",
    salary: job.salary ?? "",
    jobType: job.jobType,
    level: job.level,
    remoteType: job.remoteType ?? "on-site",
    country: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BASE}/api/jobs/${job.id}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const j = data.job ?? data;
          setFormState({
            title: j.title ?? job.title,
            company: j.company ?? job.company,
            location: j.location ?? job.location,
            description: j.description ?? "",
            requiredSkills: Array.isArray(j.requiredSkills) ? j.requiredSkills.join(", ") : "",
            salary: j.salary ?? "",
            jobType: j.jobType ?? job.jobType,
            level: j.level ?? job.level,
            remoteType: j.remoteType ?? job.remoteType ?? "on-site",
            country: j.country ?? "",
          });
        }
      } catch {}
      setLoadingDetails(false);
    }
    load();
  }, [job.id]);

  function set(key: keyof PostJobPayload, value: string) {
    setFormState((f) => ({ ...f, [key]: value }));
    setFieldError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.company.trim() || !form.location.trim() || !form.description.trim()) {
      setFieldError("Title, company, location, and description are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          requiredSkills: form.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
          salary: form.salary || null,
          country: form.country || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to update job");
      }
      toast({ title: "Listing updated", description: "Your changes have been submitted for re-review." });
      onSuccess();
      onClose();
    } catch (e: any) {
      setFieldError(e.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl bg-background/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">Edit Listing</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Changes will be re-reviewed before going live.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loadingDetails ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Job Title *</label>
                <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Company *</label>
                <input className={inputClass} value={form.company} onChange={(e) => set("company", e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Location *</label>
                <input className={inputClass} value={form.location} onChange={(e) => set("location", e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input className={inputClass} placeholder="e.g. Nigeria" value={form.country} onChange={(e) => set("country", e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Description *</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={5}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Required Skills</label>
              <input
                className={inputClass}
                placeholder="Comma-separated, e.g. React, TypeScript, Node.js"
                value={form.requiredSkills}
                onChange={(e) => set("requiredSkills", e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Salary / Compensation</label>
              <input className={inputClass} placeholder="e.g. $3,000–5,000/month" value={form.salary} onChange={(e) => set("salary", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Job Type</label>
                <select className={inputClass} value={form.jobType} onChange={(e) => set("jobType", e.target.value)}>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Level</label>
                <select className={inputClass} value={form.level} onChange={(e) => set("level", e.target.value)}>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Work Mode</label>
                <select className={inputClass} value={form.remoteType} onChange={(e) => set("remoteType", e.target.value)}>
                  <option value="on-site">On-site</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
            </div>

            {fieldError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
                {fieldError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                {submitting ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                ) : (
                  <><Pencil className="w-4 h-4 mr-2" />Save Changes</>
                )}
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function PostJobModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<PostJobPayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { toast } = useToast();

  function set(key: keyof PostJobPayload, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.company.trim() || !form.location.trim() || !form.description.trim()) {
      setFieldError("Title, company, location, and description are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          requiredSkills: form.requiredSkills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          salary: form.salary || null,
          country: form.country || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to post job");
      }
      toast({ title: "Job submitted for review", description: "It will go live after admin approval." });
      onSuccess();
      onClose();
    } catch (e: any) {
      setFieldError(e.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl bg-background/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">Post a Job</h2>
            <p className="text-sm text-muted-foreground mt-0.5">New listings are reviewed before going live.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Job Title *</label>
              <input
                className={inputClass}
                placeholder="e.g. Senior Frontend Engineer"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Company *</label>
              <input
                className={inputClass}
                placeholder="e.g. Acme Corp"
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Location *</label>
              <input
                className={inputClass}
                placeholder="e.g. Lagos, Nigeria"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                className={inputClass}
                placeholder="e.g. Nigeria"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description *</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={5}
              placeholder="Describe the role, responsibilities, and what makes it exciting..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Required Skills</label>
            <input
              className={inputClass}
              placeholder="Comma-separated, e.g. React, TypeScript, Node.js"
              value={form.requiredSkills}
              onChange={(e) => set("requiredSkills", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Salary / Compensation</label>
            <input
              className={inputClass}
              placeholder="e.g. $3,000–5,000/month"
              value={form.salary}
              onChange={(e) => set("salary", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Job Type</label>
              <select
                className={inputClass}
                value={form.jobType}
                onChange={(e) => set("jobType", e.target.value)}
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Level</label>
              <select
                className={inputClass}
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
              >
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="executive">Executive</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Work Mode</label>
              <select
                className={inputClass}
                value={form.remoteType}
                onChange={(e) => set("remoteType", e.target.value)}
              >
                <option value="on-site">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>
          </div>

          {fieldError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
              {fieldError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit for Review
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function JobCard({
  job,
  onViewApplicants,
  onEdit,
  onClose,
}: {
  job: MyJob;
  onViewApplicants: (job: MyJob) => void;
  onEdit: (job: MyJob) => void;
  onClose: (job: MyJob) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/60 backdrop-blur border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-base truncate">{job.title}</h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{job.company}</span>
          </div>
        </div>
        <StatusBadge status={job.moderationStatus} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {job.location}
        </span>
        {job.remoteType && (
          <span className="flex items-center gap-1">
            <Wifi className="w-3 h-3" />
            {job.remoteType}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {job.level}
        </span>
        <span className="flex items-center gap-1">
          <Tag className="w-3 h-3" />
          {job.jobType}
        </span>
        {job.salary && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {job.salary}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto">
        <button
          onClick={() => onViewApplicants(job)}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
        >
          <Users className="w-4 h-4" />
          <span className="text-foreground group-hover:text-primary transition-colors">{job.applicationCount}</span>
          <span className="text-muted-foreground group-hover:text-primary/70 transition-colors">
            {job.applicationCount === 1 ? "applicant" : "applicants"}
          </span>
          {job.applicationCount > 0 && (
            <span className="text-xs text-primary/60 font-normal ml-0.5">→ view</span>
          )}
        </button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {job.isActive ? (
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" />
          )}
          <span>
            {new Date(job.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {job.moderationStatus === "pending" && (
        <p className="mt-3 text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Your listing is under review and will go live once our team approves it.
        </p>
      )}
      {job.moderationStatus === "rejected" && (
        <p className="mt-3 text-xs text-red-300/80 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          This listing was not approved. Please review our guidelines and resubmit.
        </p>
      )}

      {job.isActive && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <button
            onClick={() => onEdit(job)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={() => onClose(job)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive border border-border hover:border-destructive/40 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Close listing
          </button>
        </div>
      )}
    </motion.div>
  );
}

function ActivateEmployerPrompt({ onActivated }: { onActivated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function activate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userType: "employer" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to activate employer account");
      }
      toast({ title: "Employer account activated!", description: "You can now post jobs on DENARIXX." });
      onActivated();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <nav className="border-b border-border bg-card/60 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <Link href="/dashboard">
            <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition text-sm mr-1">
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          </Link>
          <div className="w-7 h-7 rounded bg-primary/20 border border-primary/50 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            DENARIXX<span className="text-primary">.AI</span>
          </span>
        </div>
      </nav>

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-black mb-3">Activate Employer Account</h1>
          <p className="text-muted-foreground mb-2 leading-relaxed">
            Switch your account to <span className="text-foreground font-semibold">Employer</span> to post job listings and hire African tech talent directly on DENARIXX.
          </p>
          <p className="text-xs text-muted-foreground mb-8 bg-muted/30 rounded-xl px-4 py-3 border border-border">
            All new listings are reviewed by our team before going live. This keeps the platform high-quality for candidates.
          </p>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={activate}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Activating…
                </>
              ) : (
                <>
                  <Briefcase className="w-5 h-5" />
                  Activate Employer Account
                </>
              )}
            </Button>
            <Link href="/jobs">
              <Button variant="ghost" className="w-full text-muted-foreground">
                Browse jobs as a candidate instead
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function EmployerDashboardContent() {
  const [showModal, setShowModal] = useState(false);
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<MyJob | null>(null);
  const [editingJob, setEditingJob] = useState<MyJob | null>(null);
  const [closingJob, setClosingJob] = useState<MyJob | null>(null);
  const [closing, setClosing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`${BASE}/api/users/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUserType(data.userType ?? "candidate");
        }
      } catch {}
      setProfileLoading(false);
    }
    loadProfile();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/jobs/mine`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load your listings");
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userType === "employer" || userType === "admin") {
      fetchJobs();
    }
  }, [userType]);

  async function handleCloseJob(job: MyJob) {
    setClosing(true);
    try {
      const res = await fetch(`${BASE}/api/jobs/${job.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to close listing");
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, isActive: false } : j));
      toast({ title: "Listing closed", description: `"${job.title}" has been removed from the job board.` });
    } catch (e: any) {
      toast({ title: "Failed to close listing", description: e.message, variant: "destructive" });
    } finally {
      setClosing(false);
      setClosingJob(null);
    }
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (userType !== "employer" && userType !== "admin") {
    return (
      <ActivateEmployerPrompt
        onActivated={() => {
          setUserType("employer");
        }}
      />
    );
  }

  const approved = jobs.filter((j) => j.moderationStatus === "approved").length;
  const pending = jobs.filter((j) => j.moderationStatus === "pending").length;
  const totalApplicants = jobs.reduce((sum, j) => sum + j.applicationCount, 0);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <nav className="border-b border-border bg-card/60 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition text-sm mr-1">
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            </Link>
            <div className="w-7 h-7 rounded bg-primary/20 border border-primary/50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              DENARIXX<span className="text-primary">.AI</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 border border-primary/20 text-primary ml-2">
              Employer
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/messages">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Messages</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchJobs}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowModal(true)}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Post a Job</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            Employer <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your job listings and track applicants from across Africa.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { icon: Briefcase, label: "Total Listings", value: jobs.length, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
            { icon: CheckCircle, label: "Live", value: approved, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { icon: Clock, label: "Under Review", value: pending, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { icon: Users, label: "Total Applicants", value: totalApplicants, color: "text-secondary", bg: "bg-secondary/10 border-secondary/20" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-5 ${bg} backdrop-blur`}>
              <div className={`${color} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black mb-1">{loading ? "—" : value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </motion.div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl px-6 py-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading your listings…
          </div>
        ) : jobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">No listings yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Post your first job opening and connect with top African tech talent.
              </p>
            </div>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              <Plus className="w-4 h-4" />
              Post Your First Job
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onViewApplicants={setSelectedJob}
                  onEdit={setEditingJob}
                  onClose={setClosingJob}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <PostJobModal
            onClose={() => setShowModal(false)}
            onSuccess={fetchJobs}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingJob && (
          <EditJobModal
            job={editingJob}
            onClose={() => setEditingJob(null)}
            onSuccess={fetchJobs}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedJob && (
          <ApplicantsModal
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {closingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h2 className="font-bold text-base">Close listing?</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">This will remove it from the job board.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                <span className="font-medium text-foreground">"{closingJob.title}"</span> will no longer be visible to candidates. Application history is preserved.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setClosingJob(null)} className="flex-1" disabled={closing}>
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCloseJob(closingJob)}
                  disabled={closing}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {closing ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Closing…</>
                  ) : (
                    <><Trash2 className="w-4 h-4 mr-2" />Close listing</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EmployerDashboard() {
  return (
    <>
      <Show when="signed-in">
        <EmployerDashboardContent />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}
