import { useUser, useClerk, Show } from "@clerk/react";
import { Redirect } from "wouter";
import { motion } from "framer-motion";
import {
  Zap, User, BookOpen, FileText, Briefcase, Users, BarChart3,
  LogOut, Settings, Trophy, ChevronRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const modules = [
  { icon: Sparkles, label: "DENA AI", desc: "Your personal AI assistant", color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20", href: "#dena" },
  { icon: BookOpen, label: "SkillSwap AI", desc: "Learn & grow your skills", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", href: "#skillswap" },
  { icon: FileText, label: "CV Builder", desc: "AI-powered resume builder", color: "text-green-400", bg: "bg-green-400/10 border-green-400/20", href: "#cv" },
  { icon: Briefcase, label: "Jobs AI", desc: "Matched jobs for your profile", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", href: "#jobs" },
  { icon: Users, label: "Community", desc: "Connect with professionals", color: "text-pink-400", bg: "bg-pink-400/10 border-pink-400/20", href: "#community" },
  { icon: Trophy, label: "Leaderboard", desc: "Your referral rank", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20", href: "/leaderboard" },
];

function DashboardContent() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const firstName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "Explorer";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/50">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">DENARIXX<span className="text-primary">.AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <a href={`${basePath}/profile`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </a>
            <a href={`${basePath}/settings`}>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
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
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="avatar" className="w-14 h-14 rounded-full border-2 border-primary/50 object-cover" />
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
            { label: "Skills", value: "0", icon: BookOpen },
            { label: "Applications", value: "0", icon: Briefcase },
            { label: "Referrals", value: "0", icon: Trophy },
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
            {modules.map(({ icon: Icon, label, desc, color, bg, href }) => (
              <a key={label} href={href}>
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className={`rounded-xl border p-5 cursor-pointer transition-colors ${bg} hover:border-opacity-60`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`w-6 h-6 ${color}`} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
            Complete your profile
          </h2>
          <p className="text-sm text-muted-foreground mb-4">A complete profile unlocks AI-powered job matching and personalized learning paths.</p>
          <a href={`${basePath}/profile`}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Set up profile
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </a>
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
