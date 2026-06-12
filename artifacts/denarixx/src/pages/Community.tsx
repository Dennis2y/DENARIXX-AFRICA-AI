import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import { Users, Search, MapPin, ChevronLeft, Loader2, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Member = {
  id: number;
  name: string;
  role: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  reputationScore: number;
  skills: { skill: string; level: string }[];
};

const SKILL_COLORS = [
  "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  "text-purple-400 bg-purple-400/10 border-purple-400/20",
  "text-green-400 bg-green-400/10 border-green-400/20",
  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  "text-pink-400 bg-pink-400/10 border-pink-400/20",
];

function MemberCard({ member, index }: { member: Member; index: number }) {
  const initials = (member.name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-border/70 transition-colors"
    >
      <div className="flex items-start gap-3">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt={member.name} className="w-11 h-11 rounded-full object-cover border border-border shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{member.name || "Anonymous"}</span>
            {member.reputationScore > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-1.5 py-0.5">
                <Star className="w-2.5 h-2.5" />{member.reputationScore}
              </span>
            )}
          </div>
          {member.role && <p className="text-xs text-primary mt-0.5 truncate">{member.role}</p>}
          {member.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5" />{member.location}
            </p>
          )}
        </div>
      </div>

      {member.bio && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{member.bio}</p>
      )}

      {member.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {member.skills.slice(0, 4).map((s, i) => (
            <span key={s.skill} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${SKILL_COLORS[i % SKILL_COLORS.length]}`}>
              {s.skill}
            </span>
          ))}
          {member.skills.length > 4 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
              +{member.skills.length - 4}
            </span>
          )}
        </div>
      )}

      <Link to="/skillswap">
        <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1 rounded-lg">
          Connect via SkillSwap <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
    </motion.div>
  );
}

function CommunityContent() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");

  useEffect(() => {
    fetch(`${basePath}/api/community/members`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setMembers(d.members ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Collect all unique skills for filter
  const allSkills = Array.from(new Set(members.flatMap(m => m.skills.map(s => s.skill)))).sort();

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const nameMatch = !q || (m.name ?? "").toLowerCase().includes(q) || (m.role ?? "").toLowerCase().includes(q) || (m.location ?? "").toLowerCase().includes(q);
    const skillMatch = !skillFilter || m.skills.some(s => s.skill === skillFilter);
    return nameMatch && skillMatch;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />Dashboard
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-400" />
            <span className="font-semibold text-sm">Community</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Community <span className="text-pink-400">🌍</span></h1>
          <p className="text-muted-foreground text-sm">Discover talented professionals across Africa. Connect, collaborate, and grow together.</p>
        </div>

        {/* Search + filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, role, or location..."
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          {allSkills.length > 0 && (
            <select
              value={skillFilter}
              onChange={e => setSkillFilter(e.target.value)}
              className="px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50"
            >
              <option value="">All Skills</option>
              {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            {members.length === 0 ? (
              <>
                <p className="mb-2">No members yet — be the first!</p>
                <Link to="/profile" className="text-sm text-primary hover:underline">Complete your profile to appear here →</Link>
              </>
            ) : (
              <p>No members match your search.</p>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">{filtered.length} member{filtered.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((m, i) => <MemberCard key={m.id} member={m} index={i} />)}
            </div>
            <div className="mt-8 rounded-xl border border-pink-400/20 bg-pink-400/5 p-5 text-center">
              <p className="text-sm font-semibold text-pink-400 mb-1">Want to appear here?</p>
              <p className="text-xs text-muted-foreground mb-3">Complete your profile with your role, bio, and skills.</p>
              <Link to="/profile">
                <Button size="sm" className="bg-pink-400 text-background hover:bg-pink-400/90">Edit Profile</Button>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function Community() {
  return (
    <>
      <Show when="signed-in"><CommunityContent /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}
