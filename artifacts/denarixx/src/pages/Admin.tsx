import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Mail,
  Briefcase,
  Calendar,
  Download,
  RefreshCw,
  Zap,
  Search,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { useListWaitlist } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

const USER_TYPE_COLORS: Record<string, string> = {
  Student: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Freelancer: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  Professional: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  Entrepreneur: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Investor: "bg-green-500/15 text-green-300 border-green-500/30",
  Farmer: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  Recruiter: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Other: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SortField = "createdAt" | "email" | "name" | "userType";
type SortDir = "asc" | "desc";

export default function Admin() {
  const { data, isLoading, isError, refetch, isFetching } = useListWaitlist();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const entries = data?.entries ?? [];

  const filtered = entries
    .filter((e) => {
      const q = search.toLowerCase();
      return (
        e.email.toLowerCase().includes(q) ||
        (e.name ?? "").toLowerCase().includes(q) ||
        (e.userType ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      const va = String(a[sortField] ?? "");
      const vb = String(b[sortField] ?? "");
      return va.localeCompare(vb) * mul;
    });

  const typeCounts = entries.reduce<Record<string, number>>((acc, e) => {
    const t = e.userType ?? "Unknown";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function downloadCSV() {
    const rows = [
      ["ID", "Email", "Name", "Role", "Signed Up"],
      ...filtered.map((e) => [
        String(e.id),
        e.email,
        e.name ?? "",
        e.userType ?? "",
        formatDate(e.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "denarixx-waitlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === "asc" ? (
        <ChevronUp className="w-3 h-3 ml-1 inline text-primary" />
      ) : (
        <ChevronDown className="w-3 h-3 ml-1 inline text-primary" />
      )
    ) : (
      <ChevronDown className="w-3 h-3 ml-1 inline opacity-30" />
    );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="border-b border-border bg-card/60 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-primary/20 border border-primary/50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              DENARIXX<span className="text-primary">.AI</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 border border-primary/20 text-primary ml-2">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              data-testid="button-refresh"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              data-testid="button-export-csv"
              onClick={downloadCSV}
              disabled={filtered.length === 0}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export CSV</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            Waitlist <span className="text-primary">Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Track early access signups for DENARIXX AFRICA AI.
          </p>
        </motion.div>

        {/* Stat Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
        >
          {[
            {
              icon: Users,
              label: "Total Signups",
              value: isLoading ? "—" : String(data?.total ?? 0),
              color: "text-primary",
              bg: "bg-primary/10 border-primary/20",
            },
            {
              icon: Mail,
              label: "Filtered Results",
              value: isLoading ? "—" : String(filtered.length),
              color: "text-secondary",
              bg: "bg-secondary/10 border-secondary/20",
            },
            {
              icon: UserCheck,
              label: "Named Signups",
              value: isLoading
                ? "—"
                : String(entries.filter((e) => e.name).length),
              color: "text-accent",
              bg: "bg-accent/10 border-accent/20",
            },
            {
              icon: TrendingUp,
              label: "Top Role",
              value: isLoading ? "—" : (topType ? topType[0] : "—"),
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/20",
            },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div
              key={label}
              className={`rounded-2xl border p-5 ${bg} backdrop-blur`}
            >
              <div className={`${color} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black mb-1">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Role Breakdown */}
        {!isLoading && Object.keys(typeCounts).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-10 bg-card/60 backdrop-blur border border-border rounded-2xl p-6"
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-5">
              Signups by Role
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div
                    key={type}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${
                      USER_TYPE_COLORS[type] ?? USER_TYPE_COLORS["Other"]
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    {type}
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {/* Search + Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-card/60 backdrop-blur border border-border rounded-2xl overflow-hidden"
        >
          {/* Search bar */}
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                data-testid="input-search"
                type="text"
                placeholder="Search by email, name, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading signups...
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <p className="font-semibold text-destructive">Failed to load data.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Users className="w-10 h-10 opacity-30" />
              <p className="font-medium">
                {search ? "No results match your search." : "No signups yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-waitlist">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 w-10">#</th>
                    <th
                      className="text-left px-5 py-3 cursor-pointer hover:text-foreground transition select-none"
                      onClick={() => toggleSort("email")}
                    >
                      Email <SortIcon field="email" />
                    </th>
                    <th
                      className="text-left px-5 py-3 cursor-pointer hover:text-foreground transition select-none hidden md:table-cell"
                      onClick={() => toggleSort("name")}
                    >
                      Name <SortIcon field="name" />
                    </th>
                    <th
                      className="text-left px-5 py-3 cursor-pointer hover:text-foreground transition select-none hidden sm:table-cell"
                      onClick={() => toggleSort("userType")}
                    >
                      Role <SortIcon field="userType" />
                    </th>
                    <th
                      className="text-left px-5 py-3 cursor-pointer hover:text-foreground transition select-none hidden lg:table-cell"
                      onClick={() => toggleSort("createdAt")}
                    >
                      Signed Up <SortIcon field="createdAt" />
                    </th>
                  </tr>
                </thead>
                <AnimatePresence>
                  <tbody>
                    {filtered.map((entry, i) => (
                      <motion.tr
                        key={entry.id}
                        data-testid={`row-waitlist-${entry.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="border-b border-border/50 last:border-0 hover:bg-primary/5 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">
                          {entry.id}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {entry.email[0].toUpperCase()}
                            </div>
                            <span
                              className="font-medium truncate max-w-[180px] md:max-w-none"
                              data-testid={`text-email-${entry.id}`}
                            >
                              {entry.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                          {entry.name ?? (
                            <span className="italic opacity-50">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          {entry.userType ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${
                                USER_TYPE_COLORS[entry.userType] ??
                                USER_TYPE_COLORS["Other"]
                              }`}
                            >
                              {entry.userType}
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground opacity-50 text-xs">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {formatDate(entry.createdAt)}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </AnimatePresence>
              </table>
            </div>
          )}

          {/* Footer count */}
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
              Showing {filtered.length} of {data?.total ?? 0} signup
              {(data?.total ?? 0) !== 1 ? "s" : ""}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
