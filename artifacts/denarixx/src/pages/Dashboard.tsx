import { useUser, useClerk, Show } from "@clerk/react";
import { Redirect } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Zap, User, BookOpen, FileText, Briefcase, Users, BarChart3,
  LogOut, Trophy, ChevronRight, Sparkles, Lock, Mic, MessageCircle, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Module = {
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  bg: string;
  href: string;
  live: boolean;
};

const modules: Module[] = [
  { icon: Sparkles, label: "DENA AI", desc: "Your personal AI assistant", color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20", href: `${basePath}/dena`, live: true },
  { icon: BookOpen, label: "SkillSwap AI", desc: "Trade & grow skills with peers", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", href: `${basePath}/skillswap`, live: true },
  { icon: FileText, label: "CV Builder", desc: "AI-powered resume builder", color: "text-green-400", bg: "bg-green-400/10 border-green-400/20", href: `${basePath}/cv-builder`, live: true },
  { icon: Mic, label: "Interview Coach", desc: "Practice with AI feedback", color: "text-primary", bg: "bg-primary/10 border-primary/20", href: `${basePath}/interview-coach`, live: true },
  { icon: Briefcase, label: "Jobs AI", desc: "Matched jobs for your profile", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", href: `${basePath}/jobs`, live: true },
  { icon: Users, label: "Community", desc: "Connect with African talent", color: "text-pink-400", bg: "bg-pink-400/10 border-pink-400/20", href: `${basePath}/community`, live: true },
  { icon: MessageCircle, label: "Messages", desc: "Chat with your connections", color: "text-teal-400", bg: "bg-teal-400/10 border-teal-400/20", href: `${basePath}/messages`, live: true },
  { icon: Trophy, label: "Leaderboard", desc: "Your referral rank", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20", href: `${basePath}/leaderboard`, live: true },
];

function useProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/users/me`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useConnections() {
  return useQuery({
    queryKey: ["my-connections"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/skillswap/connections`, { credentials: "include" });
      if (!res.ok) return { connections: [] };
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useApplications() {
  return useQuery({
    queryKey: ["my-applications"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/jobs/my-applications`, { credentials: "include" });
      if (!res.ok) return { applications: [] };
      return res.json();
    },
    staleTime: 30_000,
  });
}

function DashboardContent() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: profile } = useProfile();
  const { data: connData } = useConnections();
  const { data: appData } = useApplications();

  const firstName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "Explorer";
  const skillCount = profile?.skills?.length ?? 0;
  const acceptedConnections = (connData?.connections ?? []).filter((c: any) => c.status === "accepted").length;
  const applicationCount = appData?.total ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <a href={basePath || "/"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/50">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">DENARIXX<span className="text-primary">.AI</span></span>
          </a>
          <div className="flex items-center gap-2">
            <a href={`${basePath}/home`}>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </a>
            <a href={`${basePath}/profile`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-2"
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center gap-4 mb-2">
            {(profile.data?.avatarUrl || user?.imageUrl) ? (
              <img src={profile.data?.avatarUrl || user?.imageUrl} alt="avatar" className="w-14 h-14 rounded-full border-2 border-primary/50 object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">Welcome back, <span className="text-primary">{firstName}</span> 👋</h1>
              <p className="text-muted-foreground text-sm">Africa's AI Operating System is ready for you.</p>
            </div>
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-10"
        >
          {[
            { label: "Skills", value: skillCount, icon: BookOpen },
            { label: "Connections", value: acceptedConnections, icon: Users },
            { label: "Applications", value: applicationCount, icon: Briefcase },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
              <Icon className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Module grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Your Modules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(({ icon: Icon, label, desc, color, bg, href, live }) => (
              <a key={label} href={live ? href : undefined} onClick={!live ? e => e.preventDefault() : undefined}>
                <motion.div
                  whileHover={live ? { scale: 1.02, y: -2 } : {}}
                  className={`rounded-xl border p-5 transition-colors relative ${bg} ${live ? "cursor-pointer hover:border-opacity-60" : "cursor-default opacity-60"}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`w-6 h-6 ${color}`} />
                    {live ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 border border-border">
                        <Lock className="w-2.5 h-2.5" />
                        Coming soon
                      </span>
                    )}
                  </div>
                  <div className="font-semibold">{label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{desc}</div>
                </motion.div>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6"
        >
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {skillCount === 0 ? "Complete your profile" : "Keep building your career"}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {skillCount === 0
              ? "Add your skills to unlock AI-powered job matching and personalised learning paths."
              : `You have ${skillCount} skill${skillCount !== 1 ? "s" : ""} listed. Build your CV or talk to DENA for next steps.`}
          </p>
          <div className="flex gap-3 flex-wrap">
            <a href={`${basePath}/profile`}>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                {skillCount === 0 ? "Set up profile" : "View profile"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
            <a href={`${basePath}/cv-builder`}>
              <Button variant="outline" className="rounded-xl gap-2">
                <FileText className="w-4 h-4" />
                Build CV
              </Button>
            </a>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <>
      <Show when="signed-in">
        <DashboardContent />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}
