import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Show, useUser } from "@clerk/react";
import { Redirect, useLocation } from "wouter";
import {
  BookOpen, Sparkles, Users, Zap, ArrowLeft, Plus, Trash2, Send,
  CheckCircle2, XCircle, Clock, Search, Filter, RefreshCw, ChevronRight,
  MapPin, Star, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetSkillListings,
  useCreateSkillListing,
  useGetMySkillListings,
  useDeleteSkillListing,
  useGetSkillMatches,
  useGetSkillConnections,
  useCreateSkillConnection,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const CATEGORIES = ["General", "Technology", "Design", "Business", "Languages", "Arts", "Science", "Finance", "Marketing", "Education"];
const LEVELS = ["beginner", "intermediate", "advanced", "expert"];

const levelColors: Record<string, string> = {
  beginner: "text-green-400 bg-green-400/10 border-green-400/20",
  intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  advanced: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  expert: "text-red-400 bg-red-400/10 border-red-400/20",
};

const typeColors: Record<string, string> = {
  offering: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  seeking: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

type Tab = "browse" | "my-listings" | "matches" | "connections";

function NavBar() {
  const [, setLocation] = useLocation();
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/dashboard")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Dashboard</span>
          </button>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-purple-400/20 flex items-center justify-center border border-purple-400/30">
              <BookOpen className="w-4 h-4 text-purple-400" />
            </div>
            <span className="font-bold text-base">SkillSwap <span className="text-primary">AI</span></span>
          </div>
        </div>
        <a href={`${basePath}/profile`}>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </Button>
        </a>
      </div>
    </nav>
  );
}

function ListingCard({
  listing,
  onConnect,
  isConnecting,
  showConnect = true,
}: {
  listing: {
    id: number;
    userId: number;
    skillName: string;
    category: string;
    listingType: string;
    description?: string | null;
    level: string;
    availability?: string | null;
    userName?: string | null;
    userAvatar?: string | null;
    userLocation?: string | null;
    userRole?: string | null;
  };
  onConnect?: (listing: typeof listing) => void;
  isConnecting?: boolean;
  showConnect?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 hover:border-border/80 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeColors[listing.listingType] ?? "text-muted-foreground"}`}>
              {listing.listingType === "offering" ? "✦ Offering" : "◎ Seeking"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${levelColors[listing.level] ?? ""}`}>
              {listing.level}
            </span>
          </div>
          <h3 className="font-bold text-foreground text-base truncate">{listing.skillName}</h3>
          <p className="text-xs text-primary/80 mt-0.5">{listing.category}</p>
        </div>
      </div>

      {listing.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{listing.description}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        {listing.userAvatar ? (
          <img src={listing.userAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
            <User className="w-3 h-3" />
          </div>
        )}
        <span className="font-medium text-foreground/70">{listing.userName ?? "Anonymous"}</span>
        {listing.userRole && <span className="text-muted-foreground">· {listing.userRole}</span>}
        {listing.userLocation && (
          <>
            <MapPin className="w-3 h-3 ml-auto flex-shrink-0" />
            <span>{listing.userLocation}</span>
          </>
        )}
      </div>

      {listing.availability && (
        <p className="text-xs text-muted-foreground mb-3">⏰ {listing.availability}</p>
      )}

      {showConnect && onConnect && (
        <Button
          size="sm"
          className="w-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 gap-2"
          onClick={() => onConnect(listing)}
          disabled={isConnecting}
        >
          <Send className="w-3.5 h-3.5" />
          {isConnecting ? "Connecting…" : "Connect"}
        </Button>
      )}
    </motion.div>
  );
}

function BrowseTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "offering" | "seeking">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useGetSkillListings({ type: typeFilter || undefined, category: categoryFilter || undefined, q: search || undefined });
  const { mutateAsync: connect } = useCreateSkillConnection();

  const listings = data?.listings ?? [];

  const handleConnect = async (listing: (typeof listings)[0]) => {
    setConnectingId(listing.id);
    try {
      await connect({ data: { targetUserId: listing.userId, listingId: listing.id, message: `Hi! I saw your ${listing.listingType === "offering" ? "offer" : "request"} for ${listing.skillName} and I'd love to connect.` } });
      qc.invalidateQueries({ queryKey: ["/api/skillswap/connections"] });
      alert(`Connection request sent to ${listing.userName ?? "the user"}!`);
    } catch {
      alert("Failed to send connection. You may already have a pending request.");
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search skills…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
          className="h-9 rounded-lg bg-card border border-border text-sm text-foreground px-3 outline-none focus:border-primary/50"
        >
          <option value="">All types</option>
          <option value="offering">Offering</option>
          <option value="seeking">Seeking</option>
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="h-9 rounded-lg bg-card border border-border text-sm text-foreground px-3 outline-none focus:border-primary/50"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading listings…
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No listings found</p>
          <p className="text-sm mt-1">Be the first — post a skill in "My Listings".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(l => (
            <ListingCard
              key={l.id}
              listing={l}
              onConnect={handleConnect}
              isConnecting={connectingId === l.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MyListingsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ skillName: "", category: "Technology", listingType: "offering" as "offering" | "seeking", description: "", level: "intermediate", availability: "" });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useGetMySkillListings();
  const { mutateAsync: create, isPending: creating } = useCreateSkillListing();
  const { mutateAsync: remove } = useDeleteSkillListing();

  const listings = data?.listings ?? [];
  const active = listings.filter(l => l.isActive);
  const archived = listings.filter(l => !l.isActive);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.skillName.trim()) return;
    try {
      await create({ data: { ...form, description: form.description || undefined, availability: form.availability || undefined } });
      qc.invalidateQueries({ queryKey: ["/api/skillswap/my-listings"] });
      qc.invalidateQueries({ queryKey: ["/api/skillswap/listings"] });
      setForm({ skillName: "", category: "Technology", listingType: "offering", description: "", level: "intermediate", availability: "" });
      setShowForm(false);
    } catch {
      alert("Failed to create listing. Please try again.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this listing?")) return;
    try {
      await remove({ id });
      qc.invalidateQueries({ queryKey: ["/api/skillswap/my-listings"] });
    } catch {
      alert("Failed to remove listing.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{active.length} active listing{active.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Post a skill"}
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-6 overflow-hidden"
          >
            <h3 className="font-semibold mb-4">Post a skill</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Skill name *</label>
                <input
                  required
                  value={form.skillName}
                  onChange={e => setForm(f => ({ ...f, skillName: e.target.value }))}
                  placeholder="e.g. React, Python, Graphic Design"
                  className="w-full h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type *</label>
                <select
                  value={form.listingType}
                  onChange={e => setForm(f => ({ ...f, listingType: e.target.value as "offering" | "seeking" }))}
                  className="w-full h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground outline-none focus:border-primary/50"
                >
                  <option value="offering">I'm offering this skill</option>
                  <option value="seeking">I want to learn this</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground outline-none focus:border-primary/50"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Level</label>
                <select
                  value={form.level}
                  onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground outline-none focus:border-primary/50"
                >
                  {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Tell others what you'll teach or what you want to learn…"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none"
              />
            </div>
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">Availability (optional)</label>
              <input
                value={form.availability}
                onChange={e => setForm(f => ({ ...f, availability: e.target.value }))}
                placeholder="e.g. Weekends, Evenings, Flexible"
                className="w-full h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
              />
            </div>
            <Button type="submit" disabled={creating} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" />
              {creating ? "Posting…" : "Post listing"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading…</div>
      ) : active.length === 0 && !showForm ? (
        <div className="text-center py-16 text-muted-foreground">
          <Plus className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No listings yet</p>
          <p className="text-sm mt-1">Post skills you offer or skills you want to learn.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map(l => (
            <div key={l.id} className="rounded-xl border border-border bg-card p-5 relative group">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeColors[l.listingType] ?? ""}`}>
                  {l.listingType === "offering" ? "✦ Offering" : "◎ Seeking"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${levelColors[l.level] ?? ""}`}>{l.level}</span>
              </div>
              <h3 className="font-bold text-foreground">{l.skillName}</h3>
              <p className="text-xs text-primary/80 mb-2">{l.category}</p>
              {l.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{l.description}</p>}
              {l.availability && <p className="text-xs text-muted-foreground mb-3">⏰ {l.availability}</p>}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 mt-1"
                onClick={() => handleDelete(l.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <p className="text-xs text-muted-foreground mb-3">{archived.length} archived listing{archived.length !== 1 ? "s" : ""}</p>
          <div className="space-y-2">
            {archived.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border/50 bg-card/50 opacity-50">
                <span className="text-sm text-muted-foreground line-through">{l.skillName}</span>
                <span className="text-xs text-muted-foreground ml-auto">{l.listingType}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchesTab() {
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useGetSkillMatches();
  const { mutateAsync: connect } = useCreateSkillConnection();

  const matches = data?.matches ?? [];

  const handleConnect = async (listing: (typeof matches)[0]) => {
    setConnectingId(listing.id);
    try {
      await connect({ data: { targetUserId: listing.userId, listingId: listing.id, message: `Hi! DENA matched us — I'd love to swap skills around ${listing.skillName}.` } });
      qc.invalidateQueries({ queryKey: ["/api/skillswap/connections"] });
      alert(`Connection request sent to ${listing.userName ?? "the user"}!`);
    } catch {
      alert("Failed to send connection. You may already have a pending request.");
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI-Powered Matches
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.reason ?? "Based on your skills and learning goals"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 text-muted-foreground"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Sparkles className="w-6 h-6 animate-pulse mx-auto mb-2 text-primary" />
          DENA is finding your best matches…
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No matches yet</p>
          <p className="text-sm mt-1">Post skills in "My Listings" to unlock AI matching, or wait for more users to join.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((l, i) => (
            <div key={l.id} className="relative">
              {i < 3 && (
                <div className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shadow-lg">
                  {i + 1}
                </div>
              )}
              <ListingCard
                listing={l}
                onConnect={handleConnect}
                isConnecting={connectingId === l.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionsTab() {
  const { user } = useUser();
  const { data, isLoading } = useGetSkillConnections();
  const connections = data?.connections ?? [];

  const statusIcon: Record<string, React.ReactNode> = {
    pending: <Clock className="w-4 h-4 text-yellow-400" />,
    accepted: <CheckCircle2 className="w-4 h-4 text-green-400" />,
    declined: <XCircle className="w-4 h-4 text-red-400" />,
  };
  const statusLabel: Record<string, string> = {
    pending: "Pending",
    accepted: "Connected",
    declined: "Declined",
  };

  if (isLoading) return (
    <div className="text-center py-16 text-muted-foreground">
      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading…
    </div>
  );

  if (connections.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No connections yet</p>
      <p className="text-sm mt-1">Browse listings or check AI Matches to find your first swap partner.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {connections.map(c => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {statusIcon[c.status]}
              <span className="text-sm font-semibold">{statusLabel[c.status] ?? c.status}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {c.message ?? "Skill swap request"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="text-xs text-muted-foreground text-right flex-shrink-0">
            <div className="font-medium">
              {/* Show whether this is sent or received relative to current user */}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "browse", label: "Browse", icon: Search },
  { id: "my-listings", label: "My Listings", icon: Plus },
  { id: "matches", label: "AI Matches", icon: Sparkles },
  { id: "connections", label: "Connections", icon: Users },
];

function SkillSwapContent() {
  const [activeTab, setActiveTab] = useState<Tab>("browse");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black mb-2">
            SkillSwap <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-primary">AI</span>
          </h1>
          <p className="text-muted-foreground">Trade knowledge. Grow together. Africa's peer-to-peer learning network.</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card/50 border border-border rounded-xl p-1 mb-8 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                activeTab === id
                  ? "bg-card border border-border text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "browse" && <BrowseTab />}
            {activeTab === "my-listings" && <MyListingsTab />}
            {activeTab === "matches" && <MatchesTab />}
            {activeTab === "connections" && <ConnectionsTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function SkillSwap() {
  return (
    <>
      <Show when="signed-in">
        <SkillSwapContent />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}
