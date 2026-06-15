import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Maximize2, Minimize2, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "../ui/button";

export type DenaArtifact = {
  id: number;
  title: string;
  type: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
};

type ArtifactPanelProps = {
  open: boolean;
  onClose: () => void;
  basePath: string;
  getToken: () => Promise<string | null>;
};


function renderCanvasMarkdown(content: string) {
  const html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br />");

  return html;
}

export function ArtifactPanel({ open, onClose, basePath, getToken }: ArtifactPanelProps) {
  const [artifacts, setArtifacts] = useState<DenaArtifact[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<DenaArtifact | null>(null);
  const [title, setTitle] = useState("Untitled artifact");
  const [type, setType] = useState("document");
  const [content, setContent] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const hasActiveChanges = useMemo(() => {
    if (!activeArtifact) return content.trim().length > 0;
    return (
      activeArtifact.title !== title ||
      activeArtifact.type !== type ||
      activeArtifact.content !== content
    );
  }, [activeArtifact, title, type, content]);

  async function authHeaders() {
    const token = await getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function loadArtifacts() {
    try {
      const res = await fetch(`${basePath}/api/artifacts`, {
        credentials: "include",
        headers: await authHeaders(),
      });

      if (!res.ok) return;

      const data = await res.json();
      setArtifacts(data.artifacts ?? []);
    } catch {}
  }

  useEffect(() => {
    if (open) loadArtifacts();
  }, [open]);

  function selectArtifact(artifact: DenaArtifact) {
    setActiveArtifact(artifact);
    setTitle(artifact.title);
    setType(artifact.type);
    setContent(artifact.content);
  }

  function newArtifact() {
    setActiveArtifact(null);
    setTitle("Untitled artifact");
    setType("document");
    setContent("");
  }

  async function generateArtifact() {
    const prompt = content.trim();

    if (!prompt) {
      alert("Write an instruction first, then click Generate.");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch(`${basePath}/api/ai/generate`, {
        method: "POST",
        credentials: "include",
        headers: await authHeaders(),
        body: JSON.stringify({
          message: `Create a high-quality ${type} artifact titled "${title}". Use this instruction:\n\n${prompt}`,
          prompt: `Create a high-quality ${type} artifact titled "${title}". Use this instruction:\n\n${prompt}`,
        }),
      });

      const raw = await res.text();

      if (!res.ok) {
        alert(`Canvas generation failed: ${res.status}\n${raw}`);
        return;
      }

      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        data = { content: raw };
      }

      const generated =
        data.content ||
        data.text ||
        data.result ||
        data.output ||
        data.message ||
        data.reply ||
        data.data?.content ||
        data.data?.text ||
        "";

      if (!generated) {
        alert("Canvas generation returned no content. Check the server response in terminal logs.");
        console.log("Canvas generate response:", data);
        return;
      }

      setContent(generated);
    } catch (err) {
      console.error("Canvas generation error:", err);
      alert("Canvas generation failed. Check browser console and API logs.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveArtifact() {
    if (!content.trim()) return;

    setSaving(true);

    try {
      const payload = {
        title: title.trim() || "Untitled artifact",
        type: type.trim() || "document",
        content,
      };

      const res = await fetch(
        activeArtifact ? `${basePath}/api/artifacts/${activeArtifact.id}` : `${basePath}/api/artifacts`,
        {
          method: activeArtifact ? "PATCH" : "POST",
          credentials: "include",
          headers: await authHeaders(),
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) return;

      const data = await res.json();
      const saved = data.artifact as DenaArtifact;

      setActiveArtifact(saved);
      setTitle(saved.title);
      setType(saved.type);
      setContent(saved.content);

      await loadArtifacts();
    } finally {
      setSaving(false);
    }
  }

  async function deleteArtifact() {
    if (!activeArtifact) return;
    if (!window.confirm("Delete this artifact?")) return;

    try {
      const res = await fetch(`${basePath}/api/artifacts/${activeArtifact.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: await authHeaders(),
      });

      if (!res.ok) return;

      newArtifact();
      await loadArtifacts();
    } catch {}
  }

  async function copyArtifact() {
    await navigator.clipboard.writeText(content);
  }

  function downloadArtifact() {
    const ext =
      type === "code" ? "txt" :
      type === "html" ? "html" :
      type === "markdown" || type === "document" ? "md" :
      "txt";

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${title || "dena-artifact"}.${ext}`;
    link.click();

    URL.revokeObjectURL(url);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4">
      <div
        className={`mx-auto flex h-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ${
          fullscreen ? "max-w-[98vw]" : "max-w-7xl"
        }`}
      >
        <aside className="hidden w-72 border-r border-border bg-background/60 p-3 md:block">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">DENA Artifacts</div>
              <div className="text-xs text-muted-foreground">Canvas workspace</div>
            </div>
            <Button size="sm" variant="ghost" onClick={newArtifact}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1 overflow-y-auto">
            {artifacts.length === 0 && (
              <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                No artifacts yet. Create one from DENA’s output or start a blank artifact.
              </p>
            )}

            {artifacts.map((artifact) => (
              <button
                key={artifact.id}
                onClick={() => selectArtifact(artifact)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  activeArtifact?.id === artifact.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="truncate font-medium">{artifact.title}</div>
                <div className="mt-0.5 text-[10px] opacity-60">{artifact.type}</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Canvas / Artifact Mode</div>
              <div className="truncate text-xs text-muted-foreground">
                Edit, save, copy, download, and manage DENA-generated work.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={generateArtifact} disabled={!content.trim() || generating}>
                <Sparkles className="mr-2 h-4 w-4" />
                {generating ? "Generating..." : "Generate"}
              </Button>

              <Button size="sm" variant="outline" onClick={copyArtifact} disabled={!content.trim()}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>

              <Button size="sm" variant="outline" onClick={downloadArtifact} disabled={!content.trim()}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>

              <Button size="sm" onClick={saveArtifact} disabled={!content.trim() || saving || !hasActiveChanges}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>

              {activeArtifact && (
                <Button size="sm" variant="destructive" onClick={deleteArtifact}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              <Button size="sm" variant="ghost" onClick={() => setFullscreen((value) => !value)}>
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-2">
            <section className="flex min-h-0 flex-col border-r border-border">
              <div className="grid grid-cols-1 gap-3 border-b border-border p-3 md:grid-cols-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Artifact title"
                />

                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="document">Document</option>
                  <option value="code">Code</option>
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                  <option value="business-plan">Business Plan</option>
                  <option value="resume">Resume</option>
                  <option value="cover-letter">Cover Letter</option>
                </select>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-0 flex-1 resize-none bg-background p-4 font-mono text-sm leading-6 outline-none"
                placeholder="Start writing here, or create an artifact from DENA output..."
              />
            </section>

            <section className="hidden min-h-0 overflow-y-auto bg-background/40 p-6 lg:block">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </div>

              <div
                className="prose prose-invert max-w-none rounded-xl border border-border bg-card p-5 text-sm leading-7"
                dangerouslySetInnerHTML={{
                  __html: content ? renderCanvasMarkdown(content) : "Preview will appear here...",
                }}
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
