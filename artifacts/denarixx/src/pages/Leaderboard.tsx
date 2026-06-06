import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Zap,
  ArrowLeft,
  RefreshCw,
  Link2,
  Search,
  Users,
  TrendingUp,
  Medal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type LeaderboardEntry = {
  rank: number;
  displayName: string;
  maskedEmail: string;
  referralCount: number;
  referralCode: string;
};

type LeaderboardData = {
  entries: LeaderboardEntry[];
  total: number;
};

const MEDAL_STYLES = [
  { label: "🥇", ring: "ring-amber-400/40 bg-amber-400/10 border-amber-400/30", text: "text-amber-400" },
  { label: "🥈", ring: "ring-zinc-400/40 bg-zinc-400/10 border-zinc-400/30", text: "text-zinc-300" },
  { label: "🥉", ring: "ring-orange-700/40 bg-orange-700/10 border-orange-700/30", text: "text-orange-500" },
];

function getBase(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export default function Leaderboard() {
  const [myCode, setMyCode] = useState("");
  const [searchCode, setSearchCode] = useState("");

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<LeaderboardData>({
    queryKey: ["leaderboard"],
    queryFn: () =>
      fetch(`${getBase()}/api/waitlist/leaderboard`).then((r) => {
        if (!r.ok) throw new Error("Failed to load leaderboard");
        return r.json();
      }),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const entries = data?.entries ?? [];

  const myRank = searchCode
    ? entries.find((e) => e.referralCode.toUpperCase() === searchCode.toUpperCase())
    : null;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded bg-primary/20 border border-primary/50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              DENARIXX<span className="text-primary">.AI</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden md:inline">
              {lastUpdated ? `Updated ${lastUpdated}` : ""}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <a href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline">Back to Home</span>
              </Button>
            </a>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-6 py-12 max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Ambassador <span className="text-primary">Leaderboard</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            The community builders spreading DENARIXX across Africa. Invite more people to climb the ranks.
          </p>
        </motion.div>

        {/* Stats row */}
        {!isLoading && entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-4 mb-8"
          >
            <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 text-center">
              <Users className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-black text-primary">{entries.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Active Ambassadors</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 text-center">
              <TrendingUp className="w-5 h-5 text-accent mx-auto mb-2" />
              <p className="text-2xl font-black text-accent">
                {entries.reduce((s, e) => s + e.referralCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total Referrals</p>
            </div>
          </motion.div>
        )}

        {/* Look up your rank */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card/60 backdrop-blur border border-border rounded-2xl p-6 mb-8"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <Search className="w-3.5 h-3.5" /> Find Your Rank
          </h2>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Enter your referral code (e.g. A3F29B1C)"
                value={myCode}
                onChange={(e) => setMyCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-mono"
                maxLength={8}
              />
            </div>
            <Button
              onClick={() => setSearchCode(myCode)}
              disabled={myCode.length < 6}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Check
            </Button>
          </div>

          <AnimatePresence>
            {searchCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                {myRank ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/30">
                    <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-black text-primary text-xl">
                      #{myRank.rank}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{myRank.displayName}</p>
                      <p className="text-sm text-muted-foreground">{myRank.referralCount} people invited</p>
                    </div>
                    <Medal className="w-6 h-6 text-primary ml-auto" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Code <span className="font-mono text-foreground">{searchCode}</span> not found on the leaderboard yet — invite more people to earn a spot!
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Leaderboard list */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading leaderboard…
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No ambassadors yet.</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Be the first — <a href="/" className="text-primary hover:underline">join the waitlist</a> and share your referral link!
              </p>
            </div>
          ) : (
            entries.map((entry, i) => {
              const medal = MEDAL_STYLES[i];
              const isTop3 = i < 3;
              const pct = Math.round((entry.referralCount / entries[0].referralCount) * 100);

              return (
                <motion.div
                  key={entry.referralCode}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`relative rounded-2xl border p-5 flex items-center gap-4 overflow-hidden ${
                    isTop3
                      ? `${medal.ring} ring-1`
                      : "bg-card/60 border-border"
                  } backdrop-blur`}
                >
                  {/* Rank glow for top 3 */}
                  {isTop3 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-current/5 to-transparent opacity-20 pointer-events-none" />
                  )}

                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isTop3 ? `border ${medal.ring}` : "bg-muted text-muted-foreground"}`}>
                    {isTop3 ? (
                      <span className="text-lg">{medal.label}</span>
                    ) : (
                      `#${entry.rank}`
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{entry.displayName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{entry.maskedEmail}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`font-black text-xl tabular-nums ${isTop3 ? medal.text : "text-foreground"}`}>
                          {entry.referralCount}
                        </p>
                        <p className="text-xs text-muted-foreground">invited</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.04 + 0.2 }}
                        className={`h-full rounded-full ${
                          i === 0
                            ? "bg-gradient-to-r from-amber-400 to-amber-300"
                            : i === 1
                            ? "bg-gradient-to-r from-zinc-400 to-zinc-300"
                            : i === 2
                            ? "bg-gradient-to-r from-orange-600 to-orange-500"
                            : "bg-gradient-to-r from-primary to-secondary"
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* CTA */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <p className="text-muted-foreground mb-4">
              Want to see your name here?
            </p>
            <a href="/">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8 py-5 text-base font-bold">
                <Zap className="w-4 h-4" />
                Join & Get Your Referral Link
              </Button>
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
}
