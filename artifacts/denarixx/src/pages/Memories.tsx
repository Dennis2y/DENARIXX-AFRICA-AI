import { useEffect, useState } from "react";
import { Link, Redirect } from "wouter";
import { useUser } from "@clerk/react";
import { ArrowLeft, Brain, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Memory = {
  id: number;
  category: string;
  content: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

function MemoriesContent() {
  const { toast } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/memories`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load memories");
      const data = await res.json();
      setMemories(data.memories ?? []);
    } catch (err: any) {
      toast({
        title: "Could not load memories",
        description: err.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${basePath}/api/memories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete memory");
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Memory deleted" });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="font-semibold">DENA Memory</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">What DENA remembers</h1>
          <p className="text-sm text-muted-foreground">
            These memories help DENA personalize your career guidance. You can delete any memory anytime.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : memories.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="font-semibold mb-1">No memories yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Chat with DENA while logged in. Useful profile details will appear here.
            </p>
            <Link to="/dena">
              <Button>Chat with DENA</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map((memory) => (
              <div key={memory.id} className="rounded-2xl border border-border bg-card p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                      {memory.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(memory.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{memory.content}</p>
                </div>
                <button
                  onClick={() => deleteMemory(memory.id)}
                  disabled={deletingId === memory.id}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  aria-label="Delete memory"
                >
                  {deletingId === memory.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Memories() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  return <MemoriesContent />;
}
