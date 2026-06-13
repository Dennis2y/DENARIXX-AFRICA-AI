import { useState, useEffect } from "react";
import { Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ModerationStatus = "pending" | "approved" | "rejected";

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

function JobCard({ job }: { job: MyJob }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/60 backdrop-blur border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors"
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-foreground">{job.applicationCount}</span>
          <span className="text-muted-foreground">
            {job.applicationCount === 1 ? "applicant" : "applicants"}
          </span>
        </div>
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
                <JobCard key={job.id} job={job} />
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
    </div>
  );
}

export default function EmployerDashboard() {
  return (
    <>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
      <Show when="signed-in">
        <EmployerDashboardContent />
      </Show>
    </>
  );
}
