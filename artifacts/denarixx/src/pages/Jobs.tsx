import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import {
  Briefcase, MapPin, Clock, ChevronLeft, Search, Filter,
  Sparkles, CheckCircle, Send, Loader2, X, Star, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  applied: boolean;
};

type Tab = "browse" | "applications";

type Application = {
  id: number;
  jobId: number;
  status: string;
  appliedAt: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  level: string;
  salary: string | null;
};

const LEVEL_COLORS: Record<string, string> = {
  junior: "text-green-400 bg-green-400/10 border-green-400/20",
  mid: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  senior: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  executive: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

const TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  remote: "Remote",
};

function matchColor(score: number) {
  if (score >= 75) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-orange-400";
}

function JobCard({
  job,
  onApply,
  applying,
}: {
  job: Job;
  onApply: (job: Job) => void;
  applying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-card p-5 transition-colors ${job.applied ? "border-primary/30 bg-primary/5" : "border-border hover:border-border/80"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold truncate">{job.title}</h3>
            {job.applied && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
                <CheckCircle className="w-2.5 h-2.5" /> Applied
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">{job.company}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{TYPE_LABELS[job.jobType] ?? job.jobType}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {job.matchScore !== null && (
            <div className={`text-xs font-bold flex items-center gap-1 ${matchColor(job.matchScore)}`}>
              <Star className="w-3 h-3" />
              {job.matchScore}% match
            </div>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${LEVEL_COLORS[job.level] ?? "text-muted-foreground"}`}>
            {job.level}
          </span>
        </div>
      </div>

      {job.salary && (
        <div className="text-sm font-medium text-green-400 mb-3">{job.salary}</div>
      )}

      {/* Skills required */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {job.requiredSkills.slice(0, 5).map(s => (
          <span key={s} className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">{s}</span>
        ))}
        {job.requiredSkills.length > 5 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">+{job.requiredSkills.length - 5} more</span>
        )}
      </div>

      {/* Description toggle */}
      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-muted-foreground mb-3 leading-relaxed overflow-hidden"
          >
            {job.description}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "Show less" : "See details"}
        </button>
        <Button
          size="sm"
          onClick={() => onApply(job)}
          disabled={job.applied || applying}
          className={`rounded-xl gap-1.5 h-8 text-xs ${job.applied ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
        >
          {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : job.applied ? <><CheckCircle className="w-3 h-3" />Applied</> : <><Send className="w-3 h-3" />Apply Now</>}
        </Button>
      </div>
    </motion.div>
  );
}

function JobsContent() {
  const { user } = useUser();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("browse");
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<number | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/jobs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAllJobs(data.jobs ?? []);
      // Check if user has skills (any match scores calculated means they have profile)
      setHasProfile((data.jobs ?? []).some((j: Job) => j.matchScore !== null));
    } catch {
      toast({ title: "Failed to load jobs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch(`${basePath}/api/jobs/my-applications`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setApplications(data.applications ?? []);
    } catch {}
  };

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, []);

  const applyToJob = async (job: Job) => {
    if (job.applied || applying !== null) return;
    setApplying(job.id);
    try {
      const res = await fetch(`${basePath}/api/jobs/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.status === 409) {
        toast({ title: "Already applied", description: "You've already applied to this job." });
        return;
      }
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Application submitted! 🎉", description: `Applied to ${job.title} at ${job.company}.` });
      // Update local state
      setAllJobs(prev => prev.map(j => j.id === job.id ? { ...j, applied: true } : j));
      fetchApplications();
    } catch {
      toast({ title: "Application failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setApplying(null);
    }
  };

  const filtered = allJobs.filter(j => {
    const q = search.toLowerCase();
    const matches = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.location.toLowerCase().includes(q) || j.requiredSkills.some(s => s.toLowerCase().includes(q));
    const levelOk = filterLevel === "all" || j.level === filterLevel;
    const typeOk = filterType === "all" || j.jobType === filterType;
    return matches && levelOk && typeOk;
  });

  const topMatches = filtered.filter(j => (j.matchScore ?? 0) >= 60 && !j.applied);

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
            <Briefcase className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold text-sm">Jobs AI</span>
          </div>
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setTab("browse")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "browse" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Browse Jobs
            </button>
            <button
              onClick={() => { setTab("applications"); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === "applications" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              My Applications
              {applications.length > 0 && <span className="bg-primary/20 text-primary text-[10px] rounded-full px-1.5 py-0.5">{applications.length}</span>}
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {tab === "browse" ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1">Jobs AI <span className="text-yellow-400">🌍</span></h1>
              <p className="text-muted-foreground text-sm">
                {hasProfile
                  ? "Jobs are ranked by how well they match your skills. Apply with one click."
                  : "Add skills to your profile to see personalised match scores."}
              </p>
            </div>

            {/* No profile warning */}
            {!hasProfile && (
              <div className="mb-6 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-sm text-yellow-400">Your profile is incomplete</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Add skills to unlock AI job matching scores.</p>
                </div>
                <Link to="/profile">
                  <Button size="sm" className="rounded-xl bg-yellow-400 text-background hover:bg-yellow-400/90 gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Complete Profile
                  </Button>
                </Link>
              </div>
            )}

            {/* AI Top Matches */}
            {topMatches.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Top AI Matches for You
                </h2>
                <div className="space-y-3">
                  {topMatches.slice(0, 3).map(job => (
                    <JobCard key={job.id} job={job} onApply={applyToJob} applying={applying === job.id} />
                  ))}
                </div>
                {filtered.length > 3 && <div className="my-6 border-t border-border" />}
              </div>
            )}

            {/* Search & filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <div className="flex-1 min-w-48 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search jobs, companies, skills..."
                  className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary/50 transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50"
              >
                <option value="all">All Levels</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50"
              >
                <option value="all">All Types</option>
                <option value="full-time">Full-time</option>
                <option value="contract">Contract</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            {/* All jobs */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">{filtered.length} job{filtered.length !== 1 ? "s" : ""} found</p>
                <div className="space-y-3">
                  {filtered.map(job => (
                    <JobCard key={job.id} job={job} onApply={applyToJob} applying={applying === job.id} />
                  ))}
                  {filtered.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No jobs found matching your search.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
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
                      <div>
                        <h3 className="font-semibold">{app.title}</h3>
                        <p className="text-sm text-muted-foreground">{app.company} · {app.location}</p>
                        {app.salary && <p className="text-sm text-green-400 mt-1">{app.salary}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium capitalize ${
                          app.status === "applied" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" :
                          app.status === "reviewing" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" :
                          app.status === "offered" ? "text-green-400 bg-green-400/10 border-green-400/20" :
                          "text-muted-foreground bg-muted border-border"
                        }`}>
                          {app.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function Jobs() {
  return (
    <>
      <Show when="signed-in">
        <JobsContent />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}
