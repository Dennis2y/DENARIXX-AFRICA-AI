import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Show, useAuth } from "@clerk/react";
import { Redirect, Link } from "wouter";
import { Users, Search, MapPin, ChevronLeft, Loader2, ArrowRight, Star, UserRound, MessageCircle, MoreVertical, EyeOff, Ban, Bell } from "lucide-react";
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
  lastSeenAt?: string | null;
  skills: { skill: string; level: string }[];
};

const SKILL_COLORS = [
  "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  "text-purple-400 bg-purple-400/10 border-purple-400/20",
  "text-green-400 bg-green-400/10 border-green-400/20",
  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  "text-pink-400 bg-pink-400/10 border-pink-400/20",
];


function getPresenceLabel(lastSeenAt?: string | null) {
  if (!lastSeenAt) return "Offline";
  const diffMin = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60000);
  if (diffMin < 2) return "Online";
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;
  if (diffMin < 1440) return `Last seen ${Math.floor(diffMin / 60)}h ago`;
  return `Last seen ${new Date(lastSeenAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
}

function getPresenceDotClass(lastSeenAt?: string | null) {
  if (!lastSeenAt) return "bg-zinc-500";
  const diffMin = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60000);
  if (diffMin < 2) return "bg-emerald-400";
  if (diffMin < 15) return "bg-yellow-400";
  return "bg-zinc-500";
}

type Connection = {
  id: number;
  status: string;
  requesterId: number;
  targetId: number;
};

function MemberCard({
  member,
  index,
  connection,
  onConnect,
  onAccept,
}: {
  member: Member;
  index: number;
  connection?: Connection | null;
  onConnect: (memberId: number) => void;
  onAccept: (connectionId: number) => void;
}) {
  const initials = (member.name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);

  const hideMember = () => {
    const raw = localStorage.getItem("denarixx_hidden_community_members") || "[]";
    const current = JSON.parse(raw);
    const next = Array.from(new Set([...current, member.id]));
    localStorage.setItem("denarixx_hidden_community_members", JSON.stringify(next));
    window.location.reload();
  };

  const blockMember = () => {
    if (!window.confirm(`Block ${member.name || "this member"}?`)) return;
    const raw = localStorage.getItem("denarixx_blocked_community_members") || "[]";
    const current = JSON.parse(raw);
    const next = Array.from(new Set([...current, member.id]));
    localStorage.setItem("denarixx_blocked_community_members", JSON.stringify(next));
    setMenuOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-border/70 transition-colors"
    >
      <div className="flex items-start gap-3">
        {member.avatarUrl ? (
          <div className="relative shrink-0">
            <img src={member.avatarUrl} alt={member.name} className="w-11 h-11 rounded-full object-cover border border-border" />
            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${getPresenceDotClass(member.lastSeenAt)}`} />
          </div>
        ) : (
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
              {initials}
            </div>
            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${getPresenceDotClass(member.lastSeenAt)}`} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
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
              <p className="text-[11px] text-muted-foreground mt-0.5">{getPresenceLabel(member.lastSeenAt)}</p>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                title="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-9 z-50 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      if (window.confirm(`Hide ${member.name || "this member"} from your community list?`)) {
                        hideMember();
                      }
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-muted"
                  >
                    <EyeOff className="h-4 w-4" /> Hide Member
                  </button>

                  <button
                    type="button"
                    onClick={blockMember}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-300 hover:bg-red-500/10"
                  >
                    <Ban className="h-4 w-4" /> Block User
                  </button>
                </div>
              )}
            </div>
          </div>
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

      <div className="mt-auto space-y-2 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <Link to={`/profile?userId=${member.id}`} className="block">
            <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1 rounded-lg">
              <UserRound className="w-3 h-3" /> Profile
            </Button>
          </Link>

          <Link to={`/messages?partnerId=${member.id}`} className="block">
            <Button size="sm" className="w-full h-8 text-xs gap-1 rounded-lg bg-cyan-400 text-background hover:bg-cyan-400/90">
              <MessageCircle className="w-3 h-3" /> Message
            </Button>
          </Link>
        </div>

        {connection?.status === "accepted" ? (
          <Button size="sm" variant="outline" disabled className="w-full h-9 text-xs gap-1 rounded-lg border-green-400/30 text-green-300 opacity-80">
            Connected
          </Button>
        ) : connection?.status === "pending" && connection.targetId === member.id ? (
          <Button size="sm" variant="outline" disabled className="w-full h-9 text-xs gap-1 rounded-lg border-yellow-400/30 text-yellow-300 opacity-80">
            Request pending
          </Button>
        ) : connection?.status === "pending" && connection.requesterId === member.id ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAccept(connection.id)}
            className="w-full h-9 text-xs gap-1 rounded-lg border-green-400/30 text-green-300 hover:bg-green-400/10"
          >
            Accept request
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onConnect(member.id)}
            className="w-full h-9 text-xs gap-1 rounded-lg border-pink-400/30 text-pink-200 hover:bg-pink-400/10"
          >
            Connect via SkillSwap <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function CommunityContent() {
  const { getToken } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [myId, setMyId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${basePath}/api/community/members`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setMembers(d.members ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    async function loadMe() {
      const token = await getToken();
      const res = await fetch(`${basePath}/api/users/me`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.id === "number") setMyId(data.id);
    }

    loadMe().catch(() => {});
  }, [getToken]);

  useEffect(() => {
    async function loadConnections() {
      const token = await getToken();
      const res = await fetch(`${basePath}/api/skillswap/connections`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) return;
      const data = await res.json();
      setConnections(data.connections ?? []);
    }

    loadConnections().catch(() => {});
  }, [getToken]);

  // Collect all unique skills for filter
  const allSkills = Array.from(new Set(members.flatMap(m => m.skills.map(s => s.skill)))).sort();

  const hiddenMemberIds = (() => {
    try {
      return JSON.parse(localStorage.getItem("denarixx_hidden_community_members") || "[]");
    } catch {
      return [];
    }
  })();

  const getConnectionForMember = (memberId: number) => {
    if (myId === null) return null;

    return connections.find((c) =>
      (c.requesterId === myId && c.targetId === memberId) ||
      (c.requesterId === memberId && c.targetId === myId)
    ) ?? null;
  };

  const connectMember = async (memberId: number) => {
    const token = await getToken();
    const res = await fetch(`${basePath}/api/skillswap/connections`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        targetUserId: memberId,
        message: "I would like to connect with you from the Denarixx community.",
      }),
    });

    if (!res.ok) {
      alert(await res.text());
      return;
    }

    const data = await res.json();
    setConnections((prev) => [data.connection, ...prev]);
  };

  const acceptConnection = async (connectionId: number) => {
    const token = await getToken();
    const res = await fetch(`${basePath}/api/skillswap/connections/${connectionId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status: "accepted" }),
    });

    if (!res.ok) {
      alert(await res.text());
      return;
    }

    const data = await res.json();
    setConnections((prev) => prev.map((c) => c.id === connectionId ? data.connection : c));
  };

  const incomingPendingCount =
    myId === null
      ? 0
      : connections.filter((c) => c.targetId === myId && c.status === "pending").length;

  const filtered = members.filter(m => {
    if (myId !== null && m.id === myId) return false;
    if (hiddenMemberIds.includes(m.id)) return false;
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
            {incomingPendingCount > 0 && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-400 px-1.5 text-[10px] font-bold text-background">
                {incomingPendingCount > 9 ? "9+" : incomingPendingCount}
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Community <span className="text-pink-400">🌍</span></h1>
          <p className="text-muted-foreground text-sm">Discover talented professionals across Africa. Connect, collaborate, and grow together.</p>
        </div>

        {incomingPendingCount > 0 && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-pink-400/30 bg-pink-400/10 px-4 py-3 text-sm text-pink-100">
            <Bell className="h-4 w-4 text-pink-300" />
            <span>
              You have {incomingPendingCount} new connection request{incomingPendingCount === 1 ? "" : "s"}.
            </span>
          </div>
        )}

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
              {filtered.map((m, i) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  index={i}
                  connection={getConnectionForMember(m.id)}
                  onConnect={connectMember}
                  onAccept={acceptConnection}
                />
              ))}
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
