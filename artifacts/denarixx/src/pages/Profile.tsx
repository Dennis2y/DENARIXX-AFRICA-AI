import { useState } from "react";
import { useUser, Show } from "@clerk/react";
import { Redirect } from "wouter";
import { motion } from "framer-motion";
import {
  User, MapPin, Globe, Twitter, Linkedin, Github,
  Plus, X, ArrowLeft, Save, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;

const SUGGESTED_SKILLS = [
  "JavaScript", "Python", "React", "Node.js", "Data Analysis",
  "UI/UX Design", "Product Management", "Machine Learning", "SQL",
  "Digital Marketing", "Entrepreneurship", "Agile", "TypeScript",
];

type Skill = { skill: string; level: string };

function ProfileContent() {
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState<string>("intermediate");

  const [form, setForm] = useState({
    bio: "",
    location: "",
    website: "",
    twitterHandle: "",
    linkedinUrl: "",
    githubHandle: "",
    role: "",
  });

  const handleChange = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const addSkill = (name?: string) => {
    const skillName = name ?? newSkill.trim();
    if (!skillName || skills.find((s) => s.skill === skillName)) return;
    setSkills((prev) => [...prev, { skill: skillName, level: newLevel }]);
    setNewSkill("");
  };

  const removeSkill = (skill: string) =>
    setSkills((prev) => prev.filter((s) => s.skill !== skill));

  const handleSave = async () => {
    setSaving(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      await fetch(`${base}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      await fetch(`${base}/api/users/me/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ skills }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const firstName = user?.firstName ?? "User";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <a href={`${basePath}/dashboard`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </a>
          <h1 className="font-semibold">Edit Profile</h1>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 mb-8"
        >
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="avatar" className="w-20 h-20 rounded-full border-2 border-primary/50 object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{firstName}</h2>
            <p className="text-sm text-muted-foreground">{user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Basic info */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-primary">Basic Info</h3>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Your Role / Title</label>
              <Input
                placeholder="e.g. Full-Stack Developer, Product Designer..."
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Bio</label>
              <Textarea
                placeholder="Tell the community about yourself..."
                value={form.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                rows={4}
                className="bg-background border-border resize-none"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location
              </label>
              <Input
                placeholder="e.g. Lagos, Nigeria"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </section>

          {/* Links */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-primary">Links & Social</h3>
            {[
              { field: "website", icon: Globe, placeholder: "https://yoursite.com" },
              { field: "twitterHandle", icon: Twitter, placeholder: "@yourhandle" },
              { field: "linkedinUrl", icon: Linkedin, placeholder: "linkedin.com/in/yourprofile" },
              { field: "githubHandle", icon: Github, placeholder: "github.com/yourhandle" },
            ].map(({ field, icon: Icon, placeholder }) => (
              <div key={field} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder={placeholder}
                  value={form[field as keyof typeof form]}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            ))}
          </section>

          {/* Skills */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-primary">Skills</h3>

            {/* Current skills */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map(({ skill, level }) => (
                  <span key={skill} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary/10 border border-primary/20 text-primary">
                    {skill}
                    <span className="text-xs text-muted-foreground">({level})</span>
                    <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add skill */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSkill()}
                className="bg-background border-border"
              />
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
              >
                {SKILL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <Button onClick={() => addSkill()} size="sm" className="shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Suggested */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SKILLS.filter((s) => !skills.find((sk) => sk.skill === s)).map((s) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    className="px-2 py-1 rounded-md text-xs border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : saved ? (
              "✓ Saved!"
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Profile</>
            )}
          </Button>
        </motion.div>
      </main>
    </div>
  );
}

export default function Profile() {
  return (
    <>
      <Show when="signed-in">
        <ProfileContent />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}
