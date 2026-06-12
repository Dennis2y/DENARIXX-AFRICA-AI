import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, Show } from "@clerk/react";
import { Redirect, Link } from "wouter";
import {
  Camera,
  FileText, Sparkles, Download, Copy, Check, ChevronLeft, ChevronRight,
  Loader2, Plus, X, Wand2, Layout, Eye, Upload, Target,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  TrendingUp, User, Briefcase, GraduationCap, Trophy, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type TemplateId = "sidebar-dark" | "sidebar-teal" | "modern" | "photo-right" | "classic" | "compact" | "minimal" | "two-column";
type LayoutType = "single" | "sidebar" | "two-col-body";
type Tone = "professional" | "creative" | "executive";
type AssistKey = "summary-gen" | "experience-rewrite" | "achievements-improve" | "skills-suggest" | "experience-ats";

interface CvFormData {
  name: string; email: string; phone: string; location: string; linkedin: string;
  targetRole: string; targetCompany: string; currentRole: string;
  summary: string; experience: string; education: string; achievements: string;
  skills: string[]; skillInput: string; tone: Tone; language: string; photo: string;
}

const LANGUAGES = [
  "English", "French", "Arabic", "Portuguese", "Spanish", "Swahili",
  "German", "Chinese (Simplified)", "Hausa", "Yoruba", "Amharic", "Zulu",
];

interface GenerateResult { resume: string; coverLetter: string; }

interface AtsResult {
  atsScore: number;
  missingKeywords: string[];
  presentKeywords: string[];
  suggestions: string[];
  tailoredSummary?: string;
}

interface Template {
  id: TemplateId; name: string; desc: string; accent: string; tag: string; layout: LayoutType; sidebarBg?: string; printCSS: string;
}

const TEMPLATES: Template[] = [
  {
    id: "sidebar-dark", name: "Sidebar Dark", desc: "Dark navy sidebar with contact & skills panel", accent: "#00E5FF", tag: "Popular", layout: "sidebar", sidebarBg: "#1a1a2e",
    printCSS: `
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .page{display:flex;min-height:100vh}
      .sidebar{width:240px;background:#1a1a2e;padding:28px 20px;color:#fff;flex-shrink:0}
      .main{flex:1;padding:28px 28px;color:#1e293b}
      .avatar{width:82px;height:82px;border-radius:50%;background:linear-gradient(135deg,#00E5FF,#7c3aed);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff}
      .photo{width:82px;height:82px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.3);display:block;margin:0 auto 14px}
      .sname{font-size:17px;font-weight:800;color:#fff;text-align:center;margin-bottom:3px;line-height:1.2}
      .srole{font-size:10.5px;color:#00E5FF;text-align:center;margin-bottom:16px;font-weight:500}
      .sdiv{height:1px;background:rgba(255,255,255,.15);margin:10px 0}
      .st{font-size:8px;text-transform:uppercase;letter-spacing:2.5px;color:#00E5FF;margin-bottom:7px;font-weight:700}
      .ci{font-size:10px;color:#cbd5e1;margin-bottom:5px;display:flex;gap:5px;align-items:flex-start;word-break:break-all}
      .si{font-size:10.5px;color:#cbd5e1;margin-bottom:3px}
      .sedu{font-size:10.5px;color:#cbd5e1;line-height:1.6}
      .sedu strong{color:#fff}
      .sh{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#00E5FF;border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin:18px 0 9px;font-weight:700}
      .sc{font-size:12.5px;line-height:1.7;color:#334155}
      .sc strong{color:#1e293b;font-weight:700}
      .sc li{margin-left:14px;list-style:disc;margin-bottom:2px}
      .sc hr{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
      @media print{@page{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `,
  },
  {
    id: "sidebar-teal", name: "Sidebar Teal", desc: "Emerald sidebar with skill tags & language panel", accent: "#10b981", tag: "Vibrant", layout: "sidebar", sidebarBg: "#0f4c3a",
    printCSS: `
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .page{display:flex;min-height:100vh}
      .sidebar{width:240px;background:#0f4c3a;padding:28px 20px;color:#fff;flex-shrink:0}
      .main{flex:1;padding:28px 28px;color:#1e293b}
      .avatar{width:82px;height:82px;border-radius:50%;background:#10b981;border:4px solid rgba(255,255,255,.25);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff}
      .photo{width:82px;height:82px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.3);display:block;margin:0 auto 14px}
      .sname{font-size:17px;font-weight:800;color:#fff;text-align:center;margin-bottom:3px}
      .srole{font-size:10.5px;color:#6ee7b7;text-align:center;margin-bottom:16px}
      .sdiv{height:1px;background:rgba(255,255,255,.12);margin:10px 0}
      .st{font-size:8px;text-transform:uppercase;letter-spacing:2.5px;color:#6ee7b7;margin-bottom:7px;font-weight:700}
      .ci{font-size:10px;color:#d1fae5;margin-bottom:5px;display:flex;gap:5px;word-break:break-all}
      .si{display:inline-block;background:rgba(16,185,129,.25);border:1px solid rgba(110,231,183,.3);border-radius:3px;font-size:9px;color:#d1fae5;padding:2px 6px;margin:2px 2px 2px 0}
      .sedu{font-size:10.5px;color:#a7f3d0;line-height:1.6}
      .sedu strong{color:#fff}
      .sh{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#0f4c3a;border-bottom:2px solid #10b981;padding-bottom:3px;margin:18px 0 9px;font-weight:700}
      .sc{font-size:12.5px;line-height:1.7;color:#374151}
      .sc strong{color:#111827;font-weight:700}
      .sc li{margin-left:14px;list-style:none;margin-bottom:2px;padding-left:10px;position:relative}
      .sc li:before{content:"›";position:absolute;left:0;color:#10b981;font-weight:700}
      .sc hr{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
      @media print{@page{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `,
  },
  {
    id: "modern", name: "Modern", desc: "Dark header with skills bar & photo circle", accent: "#0f172a", tag: "Modern", layout: "single", sidebarBg: undefined,
    printCSS: `
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,sans-serif;max-width:860px;margin:0 auto;background:#fff;color:#1e293b}
      .header{background:#0f172a;padding:28px 40px 20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .hdr-inner{display:flex;justify-content:space-between;align-items:flex-start}
      .hdr-text{flex:1}
      h1{font-size:26px;font-weight:900;color:#fff;margin:0 0 4px;letter-spacing:-0.5px}
      .subtitle{font-size:13px;color:#00E5FF;font-weight:500;margin-bottom:12px}
      .contact-row{display:flex;gap:16px;flex-wrap:wrap}
      .cr-item{font-size:10.5px;color:#94a3b8}
      .cr-item span{color:#00E5FF}
      .hdr-photo{width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.25);margin-left:20px;flex-shrink:0}
      .avatar{width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#00E5FF,#7c3aed);margin-left:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff}
      .skills-bar{background:#1e293b;padding:8px 40px;display:flex;gap:7px;flex-wrap:wrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .skill-chip{font-size:9.5px;color:#e2e8f0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:3px;padding:2px 7px}
      .body{padding:24px 40px}
      h2{font-size:9px;text-transform:uppercase;letter-spacing:2.5px;color:#0f172a;font-weight:800;border-bottom:2px solid #0f172a;padding-bottom:3px;margin:20px 0 10px}
      .body p,.body li{font-size:12.5px;line-height:1.75;color:#374151}
      .body li{margin-left:16px;list-style:disc;margin-bottom:2px}
      .body strong{color:#1e293b;font-weight:700}
      .body hr{border:none;border-top:1px solid #e2e8f0;margin:10px 0}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px}
      @media print{@page{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `,
  },
  {
    id: "photo-right", name: "Photo Right", desc: "Name left, photo top-right, gradient accent", accent: "#3b82f6", tag: "Photo", layout: "single",
    printCSS: `
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,sans-serif;max-width:860px;margin:0 auto;padding:40px 48px;background:#fff;color:#1e293b}
      .hdr-inner{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
      h1{font-size:28px;font-weight:900;color:#1e293b;margin:0 0 5px;letter-spacing:-0.5px}
      .subtitle{font-size:13px;color:#3b82f6;font-weight:600;margin-bottom:12px}
      .contact-row{display:flex;flex-wrap:wrap;gap:5px 18px}
      .cr-item{font-size:11px;color:#64748b}
      .cr-item span{color:#3b82f6}
      .hdr-photo{width:92px;height:92px;border-radius:50%;object-fit:cover;border:4px solid #e2e8f0;margin-left:24px;flex-shrink:0}
      .avatar{width:92px;height:92px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);margin-left:24px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff}
      .accent-line{height:3px;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899);border-radius:2px;margin-bottom:22px}
      h2{font-size:9.5px;text-transform:uppercase;letter-spacing:2.5px;color:#3b82f6;font-weight:800;display:flex;align-items:center;gap:8px;margin:18px 0 9px}
      h2:after{content:"";flex:1;height:1px;background:#e2e8f0;display:block}
      p,li{font-size:12.5px;line-height:1.75;color:#4b5563}
      li{margin-left:0;list-style:none;padding-left:12px;position:relative;margin-bottom:2px}
      li:before{content:"›";position:absolute;left:0;color:#3b82f6;font-weight:700}
      strong{color:#1e293b;font-weight:700}
      hr{border:none;border-top:1px solid #e2e8f0;margin:10px 0}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:8px}
      .skill-tag{display:inline-block;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:4px;font-size:10px;padding:2px 7px;margin:2px 3px 2px 0}
      @media print{@page{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `,
  },
  {
    id: "classic", name: "Classic", desc: "Serif font, centered name, Harvard style", accent: "#1a1a1a", tag: "Classic", layout: "single",
    printCSS: `
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,'Times New Roman',serif;max-width:840px;margin:0 auto;padding:48px 56px;background:#fff;color:#1a1a1a}
      h1{font-size:26px;font-weight:700;text-align:center;letter-spacing:1.5px;margin-bottom:5px}
      .subtitle{font-size:12.5px;color:#4b5563;text-align:center;margin-bottom:8px;font-style:italic}
      .contact-row{text-align:center;font-size:11px;color:#6b7280;margin-bottom:18px}
      .top-line{height:2px;background:#1a1a1a;margin-bottom:18px}
      h2{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;border-bottom:1.5px solid #1a1a1a;padding-bottom:3px;margin:20px 0 10px;font-family:'Helvetica Neue',Arial,sans-serif}
      p,li{font-size:12.5px;line-height:1.85;color:#374151;text-align:justify}
      li{margin-left:18px;list-style:disc;margin-bottom:3px}
      strong{font-weight:700;color:#1a1a1a}
      hr{border:none;border-top:1px solid #e2e8f0;margin:10px 0}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}
      @media print{@page{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `,
  },
  {
    id: "compact", name: "Compact", desc: "Dense layout, 4-column skills, maximise one page", accent: "#1d4ed8", tag: "Compact", layout: "single",
    printCSS: `
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,sans-serif;max-width:860px;margin:0 auto;background:#fff;color:#1e293b}
      .header{background:#1d4ed8;padding:14px 32px;display:flex;justify-content:space-between;align-items:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      h1{font-size:19px;font-weight:900;color:#fff;margin-bottom:1px}
      .subtitle{font-size:10.5px;color:#bfdbfe}
      .contact-col{text-align:right;font-size:9.5px;color:#bfdbfe;line-height:1.8}
      .body{padding:12px 32px}
      h2{font-size:8px;text-transform:uppercase;letter-spacing:2.5px;color:#1d4ed8;font-weight:800;border-bottom:1.5px solid #1d4ed8;padding-bottom:2px;margin:12px 0 6px;display:flex;align-items:center;gap:5px}
      h2:before{content:"";width:5px;height:5px;background:#1d4ed8;border-radius:1px;display:inline-block}
      p,li{font-size:11px;line-height:1.6;color:#374151}
      li{list-style:none;padding-left:8px;position:relative;margin-bottom:1px}
      li:before{content:"•";position:absolute;left:0;color:#1d4ed8;font-size:10px}
      strong{color:#1e293b;font-weight:700}
      hr{border:none;border-top:1px solid #f1f5f9;margin:6px 0}
      .skills-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:3px 6px}
      .sk{font-size:9.5px;color:#374151;background:#eff6ff;border:1px solid #dbeafe;border-radius:2px;padding:2px 5px;text-align:center}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .exp-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px}
      @media print{@page{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `,
  },
  {
    id: "minimal", name: "Minimal", desc: "Huge name, thin lines, luxury whitespace", accent: "#111827", tag: "Minimal", layout: "single",
    printCSS: `
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,sans-serif;max-width:860px;margin:0 auto;padding:52px 60px;background:#fff;color:#111827}
      h1{font-size:34px;font-weight:900;letter-spacing:-1.5px;line-height:1.1;margin-bottom:5px}
      .subtitle{font-size:13px;color:#6b7280;font-weight:300;letter-spacing:.5px;margin-bottom:18px}
      .contact-row{font-size:11px;color:#9ca3af;display:flex;gap:20px;flex-wrap:wrap;margin-bottom:28px}
      .top-line{height:1px;background:#111827;margin-bottom:28px}
      .section-row{display:flex;gap:44px;margin-bottom:24px}
      .sec-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#111827;width:110px;flex-shrink:0;padding-top:2px}
      .sec-content{flex:1}
      .inner-line{height:1px;background:#e5e7eb;margin:20px 0}
      p,li{font-size:12.5px;line-height:1.85;color:#4b5563}
      li{list-style:none;padding-left:12px;position:relative;margin-bottom:2px}
      li:before{content:"—";position:absolute;left:0;color:#d1d5db}
      strong{font-weight:700;color:#111827}
      hr{border:none;border-top:1px solid #e5e7eb;margin:8px 0}
      h2{display:none}
      .skill-list{display:flex;flex-wrap:wrap;gap:5px 14px}
      .skill-list li{list-style:none;padding-left:0;color:#6b7280;font-size:12px}
      .skill-list li:before{display:none}
      @media print{@page{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `,
  },
  {
    id: "two-column", name: "Two-Column", desc: "Colored header, sidebar left + experience right", accent: "#7c3aed", tag: "Layout", layout: "two-col-body", sidebarBg: "#f5f3ff",
    printCSS: `
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,sans-serif;max-width:860px;margin:0 auto;background:#fff;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .header{background:#7c3aed;padding:24px 36px 18px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .hdr-inner{display:flex;justify-content:space-between;align-items:center}
      h1{font-size:23px;font-weight:900;color:#fff;margin-bottom:3px}
      .subtitle{font-size:11px;color:#ddd6fe}
      .contact-col{text-align:right;font-size:10px;color:#c4b5fd;line-height:1.8}
      .summary-bar{background:#f5f3ff;border-bottom:1px solid #ede9fe;padding:10px 36px;font-size:11.5px;color:#4b5563;line-height:1.65}
      .page{display:flex;min-height:80vh}
      .sidebar{width:220px;border-right:1px solid #f3f4f6;padding:20px 20px 20px 36px;background:#fafafa;flex-shrink:0}
      .main{flex:1;padding:20px 30px}
      h2{font-size:8.5px;text-transform:uppercase;letter-spacing:2.5px;color:#7c3aed;font-weight:800;border-bottom:2px solid #7c3aed;padding-bottom:3px;margin:16px 0 8px}
      .sidebar p,.sidebar li{font-size:11px;line-height:1.6;color:#374151}
      .sidebar li{list-style:none;padding-left:10px;position:relative;margin-bottom:3px}
      .sidebar li:before{content:"›";position:absolute;left:0;color:#7c3aed;font-weight:700}
      .sidebar strong{color:#1e293b;font-weight:700}
      .main p,.main li{font-size:12px;line-height:1.7;color:#374151}
      .main li{list-style:none;padding-left:12px;position:relative;margin-bottom:2px}
      .main li:before{content:"·";position:absolute;left:0;color:#7c3aed;font-weight:700}
      .main strong{color:#1e293b;font-weight:700}
      hr{border:none;border-top:1px solid #f1f5f9;margin:8px 0}
      .ach-star:before{content:"★ ";color:#7c3aed}
      @media print{@page{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `,
  },
];

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: "professional", label: "Professional", desc: "Clear & corporate" },
  { value: "creative", label: "Creative", desc: "Dynamic & personal" },
  { value: "executive", label: "Executive", desc: "Strategic & commanding" },
];

function parseSections(md: string): Record<string, string> {
  const result: Record<string, string> = {};
  let currentKey = "__preamble__";
  const buf: string[] = [];
  for (const line of md.split("\n")) {
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      result[currentKey] = buf.join("\n").trim();
      currentKey = h2[1].toLowerCase().trim();
      buf.length = 0;
    } else {
      buf.push(line);
    }
  }
  result[currentKey] = buf.join("\n").trim();
  return result;
}

function findSection(sections: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(sections).find(s => s.includes(k));
    if (found && sections[found]) return sections[found];
  }
  return "";
}

function mdInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr/>")
    .replace(/\n{2,}/g, "<br/>")
    .replace(/\n/g, "<br/>");
}

function buildPrintHTML(
  content: string, name: string, role: string, template: Template, photo?: string,
  formData?: { email?: string; phone?: string; location?: string; linkedin?: string; skills?: string[] }
): string {
  const initials = name.split(" ").slice(0, 2).map(n => n[0] ?? "").join("");
  const photoEl = photo
    ? `<img class="photo" src="${photo}" alt="${name}" />`
    : `<div class="avatar">${initials}</div>`;
  const contactItems = [
    formData?.email    ? `<div class="ci">✉ ${formData.email}</div>` : "",
    formData?.phone    ? `<div class="ci">✆ ${formData.phone}</div>` : "",
    formData?.location ? `<div class="ci">⌖ ${formData.location}</div>` : "",
    formData?.linkedin ? `<div class="ci">↗ ${formData.linkedin}</div>` : "",
  ].filter(Boolean).join("");

  if (template.layout === "sidebar") {
    const sections = parseSections(content);
    const summary     = findSection(sections, "summary", "profile", "objective", "about");
    const experience  = findSection(sections, "experience", "work", "employment");
    const education   = findSection(sections, "education", "academic");
    const skills      = findSection(sections, "skill", "technical", "competenc");
    const achievements = findSection(sections, "achievement", "certif", "award", "honor");
    const languages   = findSection(sections, "language");

    const skillItems = formData?.skills?.length
      ? formData.skills.map(s =>
          template.id === "sidebar-teal"
            ? `<span class="si">${s}</span>`
            : `<div class="si">${s}</div>`
        ).join("")
      : mdInline(skills);

    const sidebarHTML = `
      ${photoEl}
      <div class="sname">${name}</div>
      <div class="srole">${role}</div>
      ${contactItems ? `<div class="sdiv"></div><div class="st">Contact</div>${contactItems}` : ""}
      ${skillItems ? `<div class="sdiv"></div><div class="st">Skills</div><div class="skills-wrap">${skillItems}</div>` : ""}
      ${education ? `<div class="sdiv"></div><div class="st">Education</div><div class="sedu">${mdInline(education)}</div>` : ""}
      ${languages ? `<div class="sdiv"></div><div class="st">Languages</div><div class="sedu">${mdInline(languages)}</div>` : ""}
    `;
    const mainHTML = `
      ${summary     ? `<div class="sh">Summary</div><div class="sc">${mdInline(summary)}</div>` : ""}
      ${experience  ? `<div class="sh">Experience</div><div class="sc">${mdInline(experience)}</div>` : ""}
      ${achievements ? `<div class="sh">Achievements</div><div class="sc">${mdInline(achievements)}</div>` : ""}
    `;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} — Resume</title>
<style>${template.printCSS}.skills-wrap{display:flex;flex-wrap:wrap;gap:3px}</style>
</head><body><div class="page"><div class="sidebar">${sidebarHTML}</div><div class="main">${mainHTML}</div></div></body></html>`;
  }

  if (template.layout === "two-col-body") {
    const sections = parseSections(content);
    const summary    = findSection(sections, "summary", "profile", "objective");
    const experience = findSection(sections, "experience", "work", "employment");
    const education  = findSection(sections, "education");
    const skills     = findSection(sections, "skill", "technical");
    const achievements = findSection(sections, "achievement", "certif", "award");

    const skillItems = formData?.skills?.length
      ? formData.skills.map(s => `<li>${s}</li>`).join("")
      : mdInline(skills);

    const contactLine = [formData?.email, formData?.phone, formData?.location]
      .filter(Boolean).join(" &nbsp;·&nbsp; ");
    const linkedinLine = formData?.linkedin || "";

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} — Resume</title>
<style>${template.printCSS}</style>
</head><body>
<div class="header">
  <div class="hdr-inner">
    <div><h1>${name}</h1><div class="subtitle">${role}</div></div>
    <div class="contact-col">${contactLine}${linkedinLine ? `<br/>${linkedinLine}` : ""}</div>
  </div>
</div>
${summary ? `<div class="summary-bar">${mdInline(summary)}</div>` : ""}
<div class="page">
  <div class="sidebar">
    <h2>Skills</h2><div>${skillItems}</div>
    ${education ? `<h2>Education</h2><div class="sidebar">${mdInline(education)}</div>` : ""}
  </div>
  <div class="main">
    ${experience ? `<h2>Experience</h2>${mdInline(experience)}` : ""}
    ${achievements ? `<h2>Achievements</h2>${mdInline(achievements)}` : ""}
  </div>
</div>
</body></html>`;
  }

  const sections = parseSections(content);
  const summary    = findSection(sections, "summary", "profile", "objective");
  const experience = findSection(sections, "experience", "work", "employment");
  const education  = findSection(sections, "education");
  const skills     = findSection(sections, "skill", "technical");
  const achievements = findSection(sections, "achievement", "certif", "award");
  const languages  = findSection(sections, "language");

  const skillItems = formData?.skills?.length
    ? formData.skills.map(s => `<span class="skill-tag">${s}</span>`).join("")
    : mdInline(skills);

  if (template.id === "modern") {
    const contactRow = [
      formData?.email    ? `<span class="cr-item">✉ ${formData.email}</span>` : "",
      formData?.phone    ? `<span class="cr-item">✆ ${formData.phone}</span>` : "",
      formData?.location ? `<span class="cr-item">⌖ ${formData.location}</span>` : "",
      formData?.linkedin ? `<span class="cr-item">↗ ${formData.linkedin}</span>` : "",
    ].filter(Boolean).join("");
    const chipSkills = formData?.skills?.length
      ? formData.skills.map(s => `<span class="skill-chip">${s}</span>`).join("")
      : "";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} — Resume</title>
<style>${template.printCSS}</style>
</head><body>
<div class="header">
  <div class="hdr-inner">
    <div class="hdr-text"><h1>${name}</h1><div class="subtitle">${role}</div>
    ${contactRow ? `<div class="contact-row">${contactRow}</div>` : ""}
    </div>
    ${photo ? `<img class="hdr-photo" src="${photo}" alt="${name}"/>` : `<div class="avatar">${initials}</div>`}
  </div>
</div>
${chipSkills ? `<div class="skills-bar">${chipSkills}</div>` : ""}
<div class="body">
  ${summary ? `<h2>Professional Summary</h2>${mdInline(summary)}` : ""}
  ${experience ? `<h2>Work Experience</h2>${mdInline(experience)}` : ""}
  <div class="two-col">
    ${education ? `<div><h2>Education</h2>${mdInline(education)}</div>` : ""}
    ${achievements ? `<div><h2>Achievements</h2>${mdInline(achievements)}</div>` : ""}
  </div>
</div>
</body></html>`;
  }

  if (template.id === "photo-right") {
    const contactRow = [
      formData?.email    ? `<span class="cr-item">✉ ${formData.email}</span>` : "",
      formData?.phone    ? `<span class="cr-item">✆ ${formData.phone}</span>` : "",
      formData?.location ? `<span class="cr-item">⌖ ${formData.location}</span>` : "",
      formData?.linkedin ? `<span class="cr-item">↗ ${formData.linkedin}</span>` : "",
    ].filter(Boolean).join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} — Resume</title>
<style>${template.printCSS}</style>
</head><body>
<div class="hdr-inner">
  <div><h1>${name}</h1><div class="subtitle">${role}</div>
  ${contactRow ? `<div class="contact-row">${contactRow}</div>` : ""}
  </div>
  ${photo ? `<img class="hdr-photo" src="${photo}" alt="${name}"/>` : `<div class="avatar">${initials}</div>`}
</div>
<div class="accent-line"></div>
${summary ? `<h2>Summary</h2>${mdInline(summary)}` : ""}
${experience ? `<h2>Experience</h2>${mdInline(experience)}` : ""}
<div class="two-col">
  ${education ? `<div><h2>Education</h2>${mdInline(education)}</div>` : ""}
  ${achievements ? `<div><h2>Achievements</h2>${mdInline(achievements)}</div>` : ""}
</div>
${skillItems ? `<h2>Skills</h2><div style="display:flex;flex-wrap:wrap;gap:4px">${skillItems}</div>` : ""}
${languages ? `<h2>Languages</h2>${mdInline(languages)}` : ""}
</body></html>`;
  }

  if (template.id === "classic") {
    const contactRow = [formData?.email, formData?.phone, formData?.location, formData?.linkedin]
      .filter(Boolean).join("  ·  ");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} — Resume</title>
<style>${template.printCSS}</style>
</head><body>
<h1>${name}</h1>
<div class="subtitle">${role}</div>
${contactRow ? `<div class="contact-row">${contactRow}</div>` : ""}
<div class="top-line"></div>
${summary ? `<h2>Profile</h2>${mdInline(summary)}` : ""}
${experience ? `<h2>Experience</h2>${mdInline(experience)}` : ""}
<div class="two-col">
  ${education ? `<div><h2>Education</h2>${mdInline(education)}</div>` : ""}
  ${achievements ? `<div><h2>Achievements</h2>${mdInline(achievements)}</div>` : ""}
</div>
${skillItems ? `<h2>Skills</h2><div>${skillItems}</div>` : ""}
</body></html>`;
  }

  if (template.id === "compact") {
    const chipSkills = formData?.skills?.length
      ? formData.skills.map(s => `<div class="sk">${s}</div>`).join("")
      : mdInline(skills);
    const contactLeft = [formData?.location, formData?.linkedin].filter(Boolean).join("  ·  ");
    const contactRight = [formData?.email, formData?.phone].filter(Boolean).join("  ·  ");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} — Resume</title>
<style>${template.printCSS}</style>
</head><body>
<div class="header">
  <div><h1>${name}</h1><div class="subtitle">${role}</div></div>
  <div class="contact-col">${contactRight}${contactLeft ? `<br/>${contactLeft}` : ""}</div>
</div>
<div class="body">
  ${chipSkills ? `<h2>Skills</h2><div class="skills-grid">${chipSkills}</div>` : ""}
  ${summary ? `<h2>Summary</h2>${mdInline(summary)}` : ""}
  ${experience ? `<h2>Experience</h2>${mdInline(experience)}` : ""}
  <div class="two-col">
    ${education ? `<div><h2>Education</h2>${mdInline(education)}</div>` : ""}
    ${achievements ? `<div><h2>Achievements</h2>${mdInline(achievements)}</div>` : ""}
  </div>
  ${languages ? `<h2>Languages</h2>${mdInline(languages)}` : ""}
</div>
</body></html>`;
  }

  if (template.id === "minimal") {
    const contactRow = [formData?.email, formData?.phone, formData?.location, formData?.linkedin]
      .filter(Boolean).map(c => `<span>${c}</span>`).join("");
    const skillList = formData?.skills?.length
      ? formData.skills.map(s => `<li>${s}</li>`).join("")
      : mdInline(skills);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} — Resume</title>
<style>${template.printCSS}</style>
</head><body>
<h1>${name}</h1>
<div class="subtitle">${role}</div>
${contactRow ? `<div class="contact-row">${contactRow}</div>` : ""}
<div class="top-line"></div>
${summary ? `<div class="section-row"><div class="sec-label">Profile</div><div class="sec-content">${mdInline(summary)}</div></div><div class="inner-line"></div>` : ""}
${experience ? `<div class="section-row"><div class="sec-label">Experience</div><div class="sec-content">${mdInline(experience)}</div></div><div class="inner-line"></div>` : ""}
${skillList ? `<div class="section-row"><div class="sec-label">Skills</div><div class="sec-content"><ul class="skill-list">${skillList}</ul></div></div><div class="inner-line"></div>` : ""}
${education ? `<div class="section-row"><div class="sec-label">Education</div><div class="sec-content">${mdInline(education)}</div></div>` : ""}
${achievements ? `<div class="inner-line"></div><div class="section-row"><div class="sec-label">Achievements</div><div class="sec-content">${mdInline(achievements)}</div></div>` : ""}
</body></html>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} — Resume</title>
<style>${template.printCSS}</style>
</head><body>
<h1>${name}</h1><div class="subtitle">${role}</div>
${summary ? `<h2>Summary</h2>${mdInline(summary)}` : ""}
${experience ? `<h2>Experience</h2>${mdInline(experience)}` : ""}
${education ? `<h2>Education</h2>${mdInline(education)}` : ""}
${skillItems ? `<h2>Skills</h2>${skillItems}` : ""}
${achievements ? `<h2>Achievements</h2>${mdInline(achievements)}` : ""}
</body></html>`;
}

function TemplateCard({ template, selected, onSelect }: { template: Template; selected: boolean; onSelect: () => void }) {
  const isSidebar = template.layout === "sidebar";
  const isTwoCol  = template.layout === "two-col-body";
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-xl border-2 overflow-hidden text-left transition-all w-full ${
        selected ? "border-primary shadow-[0_0_0_3px_rgba(0,229,255,0.15)]" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="bg-white h-28 w-full overflow-hidden relative">
        {isSidebar ? (
          <div className="flex h-full">
            <div className="w-10 h-full flex flex-col items-center pt-3 gap-1.5" style={{ background: template.sidebarBg ?? template.accent }}>
              <div className="w-6 h-6 rounded-full bg-white/20" />
              <div className="h-1 w-7 rounded bg-white/30" />
              <div className="h-1 w-5 rounded bg-white/20" />
              <div className="mt-1 h-0.5 w-7 rounded" style={{ background: template.accent + "66" }} />
              {[6,8,7,6,8].map((w,i) => <div key={i} className="h-1 rounded bg-white/15" style={{width:`${w*4}px`}}/>)}
            </div>
            <div className="flex-1 p-2 space-y-1">
              <div className="h-1.5 w-20 rounded" style={{ background: template.accent + "99" }} />
              <div className="h-1 w-24 rounded bg-gray-200" />
              <div className="h-1 w-16 rounded bg-gray-200" />
              <div className="mt-1.5 h-1.5 w-14 rounded" style={{ background: template.accent + "66" }} />
              {[22,18,20].map((w,i) => <div key={i} className="h-1 rounded bg-gray-200/80" style={{width:`${w*4}px`}}/>)}
            </div>
          </div>
        ) : isTwoCol ? (
          <>
            <div className="w-full h-7 px-2 flex items-center gap-2" style={{ background: template.accent }}>
              <div className="h-2 w-16 rounded bg-white/70" />
              <div className="flex-1" />
              <div className="h-1.5 w-10 rounded bg-white/40" />
            </div>
            <div className="flex flex-1 h-full">
              <div className="w-14 border-r border-gray-100 p-1.5 space-y-1 bg-gray-50">
                {[3,2].map((n,i) => <div key={i} className="h-1 rounded bg-gray-200" style={{width:`${n*14}px`}}/>)}
              </div>
              <div className="flex-1 p-1.5 space-y-1">
                {[4,3,3,2,4].map((n,i) => <div key={i} className="h-1 rounded bg-gray-200/80" style={{width:`${n*12}px`}}/>)}
              </div>
            </div>
          </>
        ) : template.id === "minimal" ? (
          <div className="p-2.5">
            <div className="h-3 w-28 rounded mb-1" style={{ background: "#111827" }} />
            <div className="h-1.5 w-20 rounded bg-gray-300 mb-2" />
            <div className="h-px w-full bg-gray-900 mb-2" />
            {[["Profile","long text here"],["Experience","work details"]].map(([l],i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <div className="h-1 w-10 rounded bg-gray-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5 flex-1">{[18,22,16].map((w,j)=><div key={j} className="h-1 rounded bg-gray-200" style={{width:`${w*4}px`}}/>)}</div>
              </div>
            ))}
          </div>
        ) : template.id === "modern" ? (
          <>
            <div className="w-full h-9 px-2.5 flex items-center justify-between" style={{ background: "#0f172a" }}>
              <div>
                <div className="h-2 w-18 rounded bg-white/80 mb-1" />
                <div className="h-1.5 w-14 rounded" style={{ background: "#00E5FF55" }} />
              </div>
              <div className="w-7 h-7 rounded-full" style={{ background: "linear-gradient(135deg,#00E5FF,#7c3aed)" }} />
            </div>
            <div className="bg-slate-800 h-4 px-2 flex items-center gap-1">
              {["A","B","C","D"].map((_,i)=><div key={i} className="h-2 w-8 rounded bg-white/10"/>)}
            </div>
            <div className="p-2 space-y-1">
              {[20,24,18,20].map((w,i)=><div key={i} className="h-1 rounded bg-gray-200" style={{width:`${w*4}px`}}/>)}
            </div>
          </>
        ) : template.id === "photo-right" ? (
          <div className="p-2.5 flex gap-2">
            <div className="flex-1">
              <div className="h-2.5 w-20 rounded mb-1" style={{ background: "#1e293b" }} />
              <div className="h-1.5 w-14 rounded mb-0.5" style={{ background: template.accent + "99" }} />
              <div className="h-px w-full rounded mb-2" style={{ background: `linear-gradient(90deg,${template.accent},#8b5cf6,#ec4899)` }} />
              {[18,22,16,20].map((w,i)=><div key={i} className="h-1 rounded bg-gray-200 mb-0.5" style={{width:`${w*4}px`}}/>)}
            </div>
            <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: `linear-gradient(135deg,${template.accent},#8b5cf6)` }} />
          </div>
        ) : template.id === "compact" ? (
          <>
            <div className="w-full h-6 px-2 flex items-center justify-between" style={{ background: template.accent }}>
              <div className="h-2 w-14 rounded bg-white/80" />
              <div className="h-1.5 w-10 rounded bg-white/40" />
            </div>
            <div className="p-1.5">
              <div className="grid grid-cols-4 gap-0.5 mb-1">
                {[0,1,2,3].map(i=><div key={i} className="h-1.5 rounded" style={{background: template.accent+"22", border:`1px solid ${template.accent}33`}}/>)}
              </div>
              {[22,18,24,20].map((w,i)=><div key={i} className="h-1 rounded bg-gray-200 mb-0.5" style={{width:`${w*4}px`}}/>)}
            </div>
          </>
        ) : template.id === "classic" ? (
          <div className="p-2.5 text-center">
            <div className="h-2.5 w-24 rounded mx-auto mb-1 bg-gray-800" />
            <div className="h-1.5 w-16 rounded mx-auto mb-0.5 bg-gray-400" />
            <div className="h-px w-full bg-gray-900 my-1.5" />
            <div className="text-left space-y-0.5">
              {[20,24,18,22,16].map((w,i)=><div key={i} className="h-1 rounded bg-gray-200" style={{width:`${w*4}px`}}/>)}
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {[70, 85, 60, 75, 50, 65].map((w, i) => (
              i % 3 === 0
                ? <div key={i} className="h-1.5 w-12 rounded mb-0.5" style={{ background: template.accent + "bb" }} />
                : <div key={i} className="h-1 rounded bg-gray-300/60" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
      </div>
      <div className="px-2.5 py-2 bg-card border-t border-border">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-xs text-foreground">{template.name}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ background: template.accent }}>
            {template.tag}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">{template.desc}</p>
      </div>
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

function AtsPanel({ ats, onApplySummary }: { ats: AtsResult; onApplySummary: (s: string) => void }) {
  const color = ats.atsScore >= 70 ? "#4ade80" : ats.atsScore >= 45 ? "#facc15" : "#f87171";
  const label = ats.atsScore >= 70 ? "Strong Match" : ats.atsScore >= 45 ? "Moderate Match" : "Needs Work";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
            <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5"
              stroke={color}
              strokeDasharray={`${ats.atsScore} ${100 - ats.atsScore}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 1s ease" }}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-lg font-bold" style={{ color }}>{ats.atsScore}</div>
            <div className="text-[9px] text-muted-foreground">/100</div>
          </div>
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color }}>{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">ATS compatibility score for this job</div>
        </div>
      </div>

      {ats.presentKeywords.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-green-400 mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Matching Keywords
          </div>
          <div className="flex flex-wrap gap-1">
            {ats.presentKeywords.map(k => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">{k}</span>
            ))}
          </div>
        </div>
      )}

      {ats.missingKeywords.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-red-400 mb-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Missing Keywords
          </div>
          <div className="flex flex-wrap gap-1">
            {ats.missingKeywords.map(k => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">{k}</span>
            ))}
          </div>
        </div>
      )}

      {ats.suggestions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Improvement Tips
          </div>
          <ul className="space-y-1">
            {ats.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                <span className="text-primary shrink-0">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ats.tailoredSummary && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="text-xs font-semibold text-primary mb-1">Tailored Summary</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{ats.tailoredSummary}</p>
          <button
            onClick={() => onApplySummary(ats.tailoredSummary!)}
            className="mt-2 text-xs text-primary hover:underline font-medium"
          >
            Apply to my summary →
          </button>
        </div>
      )}
    </motion.div>
  );
}

function cleanText(s: unknown): string {
  if (!s) return "";
  const str = typeof s === "string" ? s : Array.isArray(s) ? (s as unknown[]).join("\n") : String(s);
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD\uFFFE\uFFFF]/g, "")
    .replace(/^[·•▪◆▶►→]\s*/gm, "- ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of skills) {
    for (const part of raw.split(/[,;|\/]/)) {
      const s = part.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, "");
      const key = s.toLowerCase();
      if (s.length > 1 && s.length < 60 && !seen.has(key)) {
        seen.add(key);
        result.push(s);
      }
    }
  }
  return result;
}

function prioritizeExperience(experience: string): string {
  if (!experience) return "";
  const techRx = /\b(AI|ML|software|engineer|developer|data scientist|backend|frontend|full.?stack|python|javascript|typescript|machine learning|NLP|API|cloud|aws|azure|docker|kubernetes|react|node|django|flask|java|golang|rust|computer|tech|IT|information technology)\b/i;
  const logisticsRx = /\b(warehouse|logistics|driver|delivery|forklift|picker|packer|stocker|stock|shipping|transport|freight|postal|courier|operative|production line|assembly|factory|manufacturing)\b/i;
  const entries = experience.split(/\n\n+/).filter(e => e.trim());
  const tech = entries.filter(e => techRx.test(e) && !logisticsRx.test(e));
  const logistics = entries.filter(e => logisticsRx.test(e));
  const other = entries.filter(e => !techRx.test(e) && !logisticsRx.test(e));
  return [...tech, ...other, ...logistics].join("\n\n");
}

function buildRawPreviewHTML(form: CvFormData, template: Template): string {
  const sections = [
    form.summary    ? `## Summary\n${form.summary}` : "",
    form.experience ? `## Experience\n${form.experience}` : "",
    form.education  ? `## Education\n${form.education}` : "",
    form.achievements ? `## Achievements\n${form.achievements}` : "",
  ].filter(Boolean).join("\n\n");
  return buildPrintHTML(
    sections,
    form.name || "Your Name",
    form.targetRole || form.currentRole || "Your Target Role",
    template,
    form.photo || undefined,
    { email: form.email, phone: form.phone, location: form.location, linkedin: form.linkedin, skills: form.skills }
  );
}

interface ImportedCV {
  name: string; email: string; phone: string; location: string; linkedin: string;
  currentRole: string; targetRole: string; summary: string; experience: string;
  education: string; achievements: string; skills: string[]; photo?: string;
  _diagnostics?: { fileType: string; pageCount: number; textExtracted: number; ocrUsed: boolean; method: string };
}

const WIZARD_STEPS = [
  { id: 1, label: "Personal Info" },
  { id: 2, label: "Target Job" },
  { id: 3, label: "Experience" },
  { id: 4, label: "Skills & Education" },
  { id: 5, label: "AI Review" },
  { id: 6, label: "Preview" },
] as const;

function CvBuilderContent() {
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [wizardStep, setWizardStep] = useState(1);
  const [importedData, setImportedData] = useState<ImportedCV | null>(null);
  const [showImportReview, setShowImportReview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("sidebar-dark");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [atsResult, setAtsResult] = useState<AtsResult | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [tailorLoading, setTailorLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [assistLoading, setAssistLoading] = useState<AssistKey | null>(null);
  const [copied, setCopied] = useState<"resume" | "cover" | null>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "cover">("resume");
  const [editedCoverLetter, setEditedCoverLetter] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ ach: false, jd: false, exp: true });

  const [form, setForm] = useState<CvFormData>({
    name: user?.fullName ?? "",
    email: user?.primaryEmailAddress?.emailAddress ?? "",
    phone: "", location: "", linkedin: "",
    targetRole: "", targetCompany: "", currentRole: "",
    summary: "", experience: "", education: "", achievements: "",
    skills: [], skillInput: "", tone: "professional", language: "English", photo: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${basePath}/api/users/me`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setForm(prev => ({
          ...prev,
          name: prev.name || data.name || user?.fullName || "",
          email: prev.email || user?.primaryEmailAddress?.emailAddress || "",
          location: prev.location || data.location || data.country || "",
          linkedin: prev.linkedin || data.linkedinUrl || "",
          currentRole: prev.currentRole || data.role || "",
          summary: prev.summary || data.bio || "",
          skills: prev.skills.length > 0 ? prev.skills : (data.skills ?? []).map((s: any) => s.skill),
        }));
      } catch {}
    };
    load();
  }, []);

  const setField = <K extends keyof CvFormData>(key: K, val: CvFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const addSkill = () => {
    const s = form.skillInput.trim();
    if (s && !form.skills.includes(s)) setForm(p => ({ ...p, skills: [...p.skills, s], skillInput: "" }));
  };

  const removeSkill = (skill: string) => setForm(p => ({ ...p, skills: p.skills.filter(x => x !== skill) }));

  const assist = async (key: AssistKey, action: string, content: string, field?: keyof CvFormData) => {
    if (!content.trim() && action !== "suggestSkills" && action !== "experienceSummary") {
      toast({ title: "Nothing to improve", description: "Add some content first.", variant: "destructive" });
      return;
    }
    setAssistLoading(key);
    try {
      const res = await fetch(`${basePath}/api/cv-builder/assist`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content, targetRole: form.targetRole, skills: form.skills, experience: form.experience, language: form.language }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = await res.json();
      if (action === "suggestSkills") {
        const newSkills = (data.skills ?? []).filter((s: string) => !form.skills.includes(s));
        setForm(p => ({ ...p, skills: [...p.skills, ...newSkills] }));
        toast({ title: `${newSkills.length} skills added`, description: "Review and remove any that don't apply." });
      } else if (field && data.result) {
        setField(field, data.result as any);
        toast({ title: "Updated by AI ✨" });
      }
    } catch (err: any) {
      toast({ title: "AI assist failed", description: err.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setAssistLoading(null);
    }
  };

  const parseFile = async (file: File) => {
    const SUPPORTED = ["pdf", "docx", "txt", "md", "rtf"];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!SUPPORTED.includes(ext)) {
      toast({ title: "Unsupported file type", description: `Please upload a PDF, DOCX, TXT, or MD file.`, variant: "destructive" });
      return;
    }
    setParseLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const fileBase64 = btoa(binary);

      const res = await fetch(`${basePath}/api/cv-builder/parse`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, filename: file.name }),
      });
      if (!res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const j = await res.json();
          throw new Error(j.error ?? "Parse failed");
        }
        if (res.status === 413) throw new Error("File too large. Please use a file under 20 MB.");
        throw new Error(`Server error (${res.status}). Please try again.`);
      }
      const data = await res.json();
      const str = (v: unknown) => (typeof v === "string" ? v : v ? String(v) : "").trim();
      const cleaned: ImportedCV = {
        name: str(data.name),
        email: str(data.email),
        phone: str(data.phone),
        location: str(data.location),
        linkedin: str(data.linkedin),
        currentRole: str(data.currentRole),
        targetRole: str(data.targetRole),
        summary: cleanText(data.summary),
        experience: prioritizeExperience(cleanText(data.experience)),
        education: cleanText(data.education),
        achievements: cleanText(data.achievements),
        skills: cleanSkills(Array.isArray(data.skills) ? data.skills : []),
        photo: data.photo,
        _diagnostics: data._diagnostics,
      };
      setImportedData(cleaned);
      setShowImportReview(true);
      toast({ title: "CV extracted!", description: "Review the imported data below — then apply to your CV." });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message ?? "Check file format and try again.", variant: "destructive" });
    } finally {
      setParseLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const applyImportedData = () => {
    if (!importedData) return;
    setForm(prev => ({
      ...prev,
      name: importedData.name || prev.name,
      email: importedData.email || prev.email,
      phone: importedData.phone || prev.phone,
      location: importedData.location || prev.location,
      linkedin: importedData.linkedin || prev.linkedin,
      currentRole: importedData.currentRole || prev.currentRole,
      targetRole: importedData.targetRole || prev.targetRole,
      summary: importedData.summary || prev.summary,
      experience: importedData.experience || prev.experience,
      education: importedData.education || prev.education,
      achievements: importedData.achievements || prev.achievements,
      skills: importedData.skills.length > 0 ? [...new Set([...prev.skills, ...importedData.skills])] : prev.skills,
      photo: importedData.photo || prev.photo,
    }));
    setShowImportReview(false);
    setImportedData(null);
    toast({ title: "CV imported! ✨", description: "Data applied. Review each step and generate your CV." });
  };

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please use an image under 5 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setField("photo", reader.result as string);
    reader.readAsDataURL(file);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const tailor = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "Paste a job description first", variant: "destructive" }); return;
    }
    const cvContent = [
      form.summary, form.experience, form.achievements, form.skills.join(", "),
    ].filter(Boolean).join("\n\n");
    if (!cvContent.trim()) {
      toast({ title: "Fill in your CV details first", variant: "destructive" }); return;
    }
    setTailorLoading(true);
    try {
      const res = await fetch(`${basePath}/api/cv-builder/tailor`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvContent, jobDescription, targetRole: form.targetRole, language: form.language }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setAtsResult(await res.json());
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setTailorLoading(false);
    }
  };

  const generate = async () => {
    if (!form.name || !form.targetRole || !form.experience) {
      toast({ title: "Missing required fields", description: "Name, target role, and experience are required.", variant: "destructive" });
      return;
    }
    setGenerateLoading(true);
    try {
      const res = await fetch(`${basePath}/api/cv-builder/generate`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, targetRole: form.targetRole, currentRole: form.currentRole,
          experience: form.experience, skills: form.skills, education: form.education,
          achievements: form.achievements, tone: form.tone, summary: form.summary,
          email: form.email, phone: form.phone, location: form.location,
          linkedin: form.linkedin, targetCompany: form.targetCompany, language: form.language,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const data: GenerateResult = await res.json();
      setResult(data);
      setEditedCoverLetter(data.coverLetter);
      setWizardStep(6);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerateLoading(false);
    }
  };

  const previewHtml = useMemo(() => {
    const t = TEMPLATES.find(x => x.id === selectedTemplate) ?? TEMPLATES[0];
    if (result) {
      return buildPrintHTML(result.resume, form.name, form.targetRole, t, form.photo || undefined, {
        email: form.email, phone: form.phone, location: form.location, linkedin: form.linkedin, skills: form.skills,
      });
    }
    return buildRawPreviewHTML(form, t);
  }, [result, selectedTemplate, form]);

  const downloadPDF = () => {
    const content = activeTab === "resume" ? result?.resume : editedCoverLetter;
    if (!content) return;
    const t = TEMPLATES.find(x => x.id === selectedTemplate) ?? TEMPLATES[0];
    const html = buildPrintHTML(content, form.name, form.targetRole, t, form.photo || undefined, {
      email: form.email, phone: form.phone, location: form.location, linkedin: form.linkedin, skills: form.skills,
    });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      toast({ title: "Popup blocked", description: "Please allow popups for this site and try again.", variant: "destructive" });
      URL.revokeObjectURL(url);
      return;
    }
    win.onload = () => {
      setTimeout(() => {
        win.print();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, 300);
    };
  };

  const copyText = async (which: "resume" | "cover") => {
    const text = which === "resume" ? result?.resume : editedCoverLetter;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const inputCls = "w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50";
  const textareaCls = `${inputCls} resize-none`;

  const AiBtn = ({ assistKey, action, content, field, label }: {
    assistKey: AssistKey; action: string; content: string; field?: keyof CvFormData; label: string;
  }) => (
    <button
      onClick={() => assist(assistKey, action, content, field)}
      disabled={assistLoading !== null}
      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 transition-colors border border-primary/20 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-lg"
    >
      {assistLoading === assistKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />Dashboard
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-sm">AI CV Builder</span>
          </div>
          {wizardStep < 6 && (
            <>
              <span className="text-border">|</span>
              <span className="text-xs text-muted-foreground">Step {wizardStep} of 5</span>
            </>
          )}
          {wizardStep === 6 && (
            <>
              <span className="text-border">|</span>
              <button onClick={() => setWizardStep(5)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Edit</button>
            </>
          )}
        </div>
      </nav>

      {/* Progress bar */}
      {wizardStep < 6 && (
        <div className="border-b border-border bg-card/50">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center gap-0.5 overflow-x-auto">
              {WIZARD_STEPS.slice(0, 5).map((s, i) => (
                <span key={s.id} className="flex items-center">
                  <button
                    onClick={() => setWizardStep(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      wizardStep === s.id ? "bg-primary text-primary-foreground"
                      : wizardStep > s.id ? "text-green-400 hover:bg-muted/50"
                      : "text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${
                      wizardStep > s.id ? "bg-green-400 text-black"
                      : wizardStep === s.id ? "bg-white text-black"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      {wizardStep > s.id ? "✓" : s.id}
                    </span>
                    {s.label}
                  </button>
                  {i < 4 && <ChevronRight className="w-3 h-3 text-border flex-shrink-0 mx-0.5" />}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import Review Overlay */}
      <AnimatePresence>
        {showImportReview && importedData && (
          <motion.div
            key="import-review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <div className="min-h-full flex items-start justify-center p-4 pt-10 pb-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-3xl bg-background border border-border rounded-2xl overflow-hidden shadow-2xl"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-green-400/5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <div>
                      <h2 className="font-bold text-base">CV Extracted — Review Before Applying</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        AI cleaned and structured your data. Confirm to apply to your form.
                        {importedData._diagnostics && ` · ${importedData._diagnostics.textExtracted?.toLocaleString()} chars read`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowImportReview(false)} className="text-muted-foreground hover:text-foreground p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Personal Info</span>
                      </div>
                      {importedData.photo && (
                        <div className="mb-3">
                          <img src={importedData.photo} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-border" />
                          <p className="text-[10px] text-green-400 mt-1">Photo extracted ✓</p>
                        </div>
                      )}
                      <div className="space-y-1.5 text-sm">
                        {importedData.name && <div><span className="text-muted-foreground text-xs">Name: </span>{importedData.name}</div>}
                        {importedData.email && <div><span className="text-muted-foreground text-xs">Email: </span>{importedData.email}</div>}
                        {importedData.phone && <div><span className="text-muted-foreground text-xs">Phone: </span>{importedData.phone}</div>}
                        {importedData.location && <div><span className="text-muted-foreground text-xs">Location: </span>{importedData.location}</div>}
                        {importedData.currentRole && <div><span className="text-muted-foreground text-xs">Role: </span>{importedData.currentRole}</div>}
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Skills ({importedData.skills.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                        {importedData.skills.length > 0
                          ? importedData.skills.map(s => (
                              <span key={s} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">{s}</span>
                            ))
                          : <span className="text-xs text-muted-foreground">No skills extracted</span>
                        }
                      </div>
                    </div>
                  </div>

                  {importedData.summary && (
                    <div className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Summary</span>
                      </div>
                      <p className="text-sm leading-relaxed">{importedData.summary}</p>
                    </div>
                  )}

                  {importedData.experience && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection("rev-exp")}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Work Experience</span>
                          {!expandedSections["rev-exp"] && <span className="text-[10px] text-primary">Click to expand</span>}
                        </div>
                        {expandedSections["rev-exp"] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedSections["rev-exp"]
                        ? <div className="px-4 pb-4 border-t border-border"><pre className="text-sm whitespace-pre-wrap leading-relaxed mt-3 font-sans">{importedData.experience}</pre></div>
                        : <div className="px-4 pb-3"><p className="text-xs text-muted-foreground line-clamp-2">{importedData.experience.split("\n")[0]}</p></div>
                      }
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {importedData.education && (
                      <div className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Education</span>
                        </div>
                        <p className="text-sm whitespace-pre-line leading-relaxed">{importedData.education}</p>
                      </div>
                    )}
                    {importedData.achievements && (
                      <div className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Achievements</span>
                        </div>
                        <p className="text-sm whitespace-pre-line leading-relaxed line-clamp-5">{importedData.achievements}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-border bg-card/50">
                  <button
                    onClick={() => { setShowImportReview(false); setImportedData(null); }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Discard
                  </button>
                  <Button onClick={applyImportedData} className="bg-green-500 hover:bg-green-600 text-white gap-2 rounded-xl px-6">
                    <CheckCircle2 className="w-4 h-4" />Apply to my CV
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <AnimatePresence mode="wait">

          {/* Steps 1–5: two-column wizard */}
          {wizardStep < 6 && (
            <motion.div key={`step-${wizardStep}`} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

                {/* ── Left: step form ── */}
                <div className="space-y-5 min-w-0">

                  {/* ── Step 1: Personal Info ── */}
                  {wizardStep === 1 && (<>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-primary" /></div>
                      <div>
                        <h2 className="font-bold text-lg">Personal Information</h2>
                        <p className="text-xs text-muted-foreground">Your contact details appear on every template</p>
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span className="font-semibold text-sm">Import from Existing CV</span>
                        <span className="text-xs text-muted-foreground ml-1">— AI extracts all sections, you review first</span>
                      </div>
                      <div className="p-5">
                        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.rtf" className="hidden" onChange={handleFileUpload} />
                        <div
                          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => !parseLoading && fileInputRef.current?.click()}
                          className={`rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 text-center ${isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-muted/20"} ${parseLoading ? "pointer-events-none opacity-60" : ""}`}
                        >
                          {parseLoading ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-7 h-7 text-primary animate-spin" />
                              <p className="text-sm font-medium">Reading your CV…</p>
                              <p className="text-xs text-muted-foreground">AI extracts all sections — usually 5–10s</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="w-7 h-7 text-blue-400" />
                              <p className="text-sm font-semibold">Drop your CV or click to browse</p>
                              <p className="text-xs text-muted-foreground">You review extracted data before it's applied</p>
                              <div className="flex gap-1.5 mt-1">
                                {["PDF", "DOCX", "TXT", "MD"].map(f => (
                                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20 font-medium">{f}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-center gap-4 mb-5">
                        <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="relative w-16 h-16 rounded-full border-2 border-dashed border-border hover:border-primary/60 overflow-hidden bg-muted/30 flex items-center justify-center flex-shrink-0 group transition-all"
                        >
                          {form.photo
                            ? <img src={form.photo} alt="Profile" className="w-full h-full object-cover" />
                            : <Camera className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                          }
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </button>
                        <div>
                          <p className="text-sm font-medium">Profile Photo</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Shown on sidebar templates. JPG/PNG/WebP.</p>
                          {form.photo && <button onClick={() => setField("photo", "")} className="text-xs text-red-400 hover:text-red-300 mt-1 transition-colors">Remove photo</button>}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label className="block text-xs font-medium mb-1.5">Full Name *</label><input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="Your full name" className={inputCls} /></div>
                        <div><label className="block text-xs font-medium mb-1.5">Current Role</label><input value={form.currentRole} onChange={e => setField("currentRole", e.target.value)} placeholder="e.g. Software Engineer" className={inputCls} /></div>
                        <div><label className="block text-xs font-medium mb-1.5">Email</label><input value={form.email} onChange={e => setField("email", e.target.value)} placeholder="your@email.com" className={inputCls} /></div>
                        <div><label className="block text-xs font-medium mb-1.5">Phone</label><input value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="+234 800 000 0000" className={inputCls} /></div>
                        <div><label className="block text-xs font-medium mb-1.5">Location</label><input value={form.location} onChange={e => setField("location", e.target.value)} placeholder="Lagos, Nigeria" className={inputCls} /></div>
                        <div><label className="block text-xs font-medium mb-1.5">LinkedIn URL</label><input value={form.linkedin} onChange={e => setField("linkedin", e.target.value)} placeholder="linkedin.com/in/yourprofile" className={inputCls} /></div>
                      </div>
                    </div>
                  </>)}

                  {/* ── Step 2: Target Job ── */}
                  {wizardStep === 2 && (<>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-400/10 flex items-center justify-center flex-shrink-0"><Target className="w-4 h-4 text-orange-400" /></div>
                      <div>
                        <h2 className="font-bold text-lg">Target Job</h2>
                        <p className="text-xs text-muted-foreground">Define the role — AI tailors every word to it</p>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-medium mb-1.5">Target Role *</label><input value={form.targetRole} onChange={e => setField("targetRole", e.target.value)} placeholder="AI Engineer, Backend Dev..." className={inputCls} /></div>
                        <div><label className="block text-xs font-medium mb-1.5">Target Company</label><input value={form.targetCompany} onChange={e => setField("targetCompany", e.target.value)} placeholder="Google, Andela, Flutterwave..." className={inputCls} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-2">Writing Tone</label>
                          <div className="grid grid-cols-3 gap-2">
                            {TONE_OPTIONS.map(({ value, label, desc }) => (
                              <button key={value} onClick={() => setField("tone", value)} className={`rounded-xl border p-2.5 text-left transition-all ${form.tone === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                                <div className="font-semibold text-xs">{label}</div>
                                <div className="text-[10px] mt-0.5 opacity-70">{desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5">🌍 CV Language</label>
                          <select value={form.language} onChange={e => setField("language", e.target.value)} className={`${inputCls} cursor-pointer`}>
                            {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                          </select>
                          <p className="text-[10px] text-muted-foreground mt-1">AI writes the whole CV in this language</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <button onClick={() => toggleSection("jd")} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-orange-400" />
                          <span className="font-semibold text-sm">ATS Matching</span>
                          <span className="text-xs text-muted-foreground">— optional, paste job description to score your CV</span>
                        </div>
                        {expandedSections.jd ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedSections.jd && (
                        <div className="px-5 pb-5 border-t border-border space-y-3">
                          <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the full job description here..." rows={5} className={`${textareaCls} mt-3`} />
                          <Button onClick={tailor} disabled={tailorLoading} variant="outline" className="gap-2 rounded-xl" size="sm">
                            {tailorLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing...</> : <><Target className="w-4 h-4" />Analyse & Score</>}
                          </Button>
                          {atsResult && <AtsPanel ats={atsResult} onApplySummary={s => { setField("summary", s); toast({ title: "Summary applied!" }); }} />}
                        </div>
                      )}
                    </div>
                  </>)}

                  {/* ── Step 3: Experience ── */}
                  {wizardStep === 3 && (<>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-400/10 flex items-center justify-center flex-shrink-0"><Briefcase className="w-4 h-4 text-blue-400" /></div>
                      <div>
                        <h2 className="font-bold text-lg">Work Experience</h2>
                        <p className="text-xs text-muted-foreground">AI enhances and reorders — tech roles prioritised over logistics</p>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /><h3 className="font-semibold text-sm">Work Experience *</h3></div>
                        <div className="flex gap-2">
                          <AiBtn assistKey="experience-rewrite" action="rewriteProfessionally" content={form.experience} field="experience" label="Rewrite" />
                          <AiBtn assistKey="experience-ats" action="atsOptimize" content={form.experience} field="experience" label="ATS Optimize" />
                        </div>
                      </div>
                      <textarea
                        value={form.experience}
                        onChange={e => setField("experience", e.target.value)}
                        placeholder={"Senior Engineer at Company A (2022–Present)\n- Led a team of 6, reduced load time by 40%\n- Architected a platform serving 200k+ users\n\nDeveloper at Company B (2019–2022)\n- Built REST APIs consumed by 100k+ users"}
                        rows={10}
                        className={textareaCls}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5">Separate roles with a blank line. Include company, title, dates, and bullet points.</p>
                    </div>
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <button onClick={() => toggleSection("ach")} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          <span className="font-semibold text-sm">Achievements & Certifications</span>
                          {form.achievements && <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">✓ Added</span>}
                        </div>
                        {expandedSections.ach ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedSections.ach && (
                        <div className="px-5 pb-5 border-t border-border">
                          <div className="flex items-center justify-between mt-3 mb-2">
                            <p className="text-xs text-muted-foreground">Awards, certs, publications, honors</p>
                            <AiBtn assistKey="achievements-improve" action="improveAchievements" content={form.achievements} field="achievements" label="Improve" />
                          </div>
                          <textarea
                            value={form.achievements}
                            onChange={e => setField("achievements", e.target.value)}
                            placeholder={"Forbes Africa 30 Under 30 (2022)\nAWS Certified Solutions Architect\nSpeaker at PyCon Africa 2023"}
                            rows={4}
                            className={textareaCls}
                          />
                        </div>
                      )}
                    </div>
                  </>)}

                  {/* ── Step 4: Skills & Education ── */}
                  {wizardStep === 4 && (<>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-400/10 flex items-center justify-center flex-shrink-0"><GraduationCap className="w-4 h-4 text-purple-400" /></div>
                      <div>
                        <h2 className="font-bold text-lg">Skills & Education</h2>
                        <p className="text-xs text-muted-foreground">Skills appear as tags in sidebar templates</p>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /><h3 className="font-semibold text-sm">Skills</h3></div>
                        <AiBtn assistKey="skills-suggest" action="suggestSkills" content={form.experience} label="Suggest Skills" />
                      </div>
                      <div className="flex gap-2 mb-3">
                        <input value={form.skillInput} onChange={e => setField("skillInput", e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())} placeholder="Type a skill and press Enter…" className={`flex-1 ${inputCls}`} />
                        <Button onClick={addSkill} variant="outline" size="sm" className="rounded-xl h-auto px-3"><Plus className="w-4 h-4" /></Button>
                      </div>
                      {form.skills.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No skills yet. Add manually or click "Suggest Skills".</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {form.skills.map(s => (
                            <span key={s} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-xs rounded-full px-2.5 py-1">
                              {s}<button onClick={() => removeSkill(s)} className="hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3"><GraduationCap className="w-4 h-4 text-primary" /><h3 className="font-semibold text-sm">Education</h3></div>
                      <textarea
                        value={form.education}
                        onChange={e => setField("education", e.target.value)}
                        placeholder={"BSc Computer Science\nUniversity Name (2019)\nFirst Class Honours\n\nAWS Solutions Architect Certification (2022)"}
                        rows={5}
                        className={textareaCls}
                      />
                    </div>
                  </>)}

                  {/* ── Step 5: AI Review ── */}
                  {wizardStep === 5 && (<>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Sparkles className="w-4 h-4 text-primary" /></div>
                      <div>
                        <h2 className="font-bold text-lg">AI Review</h2>
                        <p className="text-xs text-muted-foreground">Fine-tune your summary, then generate your polished CV</p>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /><h3 className="font-semibold text-sm">Professional Summary</h3></div>
                        <AiBtn assistKey="summary-gen" action="experienceSummary" content={form.experience} field="summary" label="Generate Summary" />
                      </div>
                      <textarea
                        value={form.summary}
                        onChange={e => setField("summary", e.target.value)}
                        placeholder="2–3 sentences about your expertise and what you bring to the role..."
                        rows={4}
                        className={textareaCls}
                      />
                    </div>
                    {atsResult && <AtsPanel ats={atsResult} onApplySummary={s => { setField("summary", s); toast({ title: "Summary applied!" }); }} />}
                    <div className="bg-gradient-to-r from-primary/10 to-green-400/10 border border-primary/20 rounded-2xl p-6 text-center">
                      <h3 className="font-bold text-lg mb-1">Ready to Generate</h3>
                      <p className="text-sm text-muted-foreground mb-4">AI crafts a professional CV + cover letter in your chosen tone</p>
                      <Button
                        onClick={generate}
                        disabled={generateLoading}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-10 py-3.5 h-auto text-base font-bold rounded-2xl shadow-[0_0_40px_rgba(0,229,255,0.3)] hover:shadow-[0_0_60px_rgba(0,229,255,0.4)] transition-all"
                      >
                        {generateLoading
                          ? <><Loader2 className="w-5 h-5 animate-spin" />Generating your CV...</>
                          : <><Sparkles className="w-5 h-5" />Generate with AI</>}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-3">Takes 10–20 seconds</p>
                    </div>
                  </>)}

                  {/* Step navigation */}
                  <div className="flex justify-between items-center pt-2 pb-6">
                    <Button onClick={() => setWizardStep(s => Math.max(1, s - 1))} variant="outline" className="rounded-xl gap-1.5" disabled={wizardStep === 1}>
                      <ChevronLeft className="w-4 h-4" />Back
                    </Button>
                    {wizardStep < 5 && (
                      <Button onClick={() => setWizardStep(s => s + 1)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-1.5">
                        Next<ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                    {wizardStep === 5 && (
                      <Button onClick={generate} disabled={generateLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-1.5">
                        {generateLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate CV</>}
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── Right: Sticky live preview ── */}
                <div className="hidden lg:block">
                  <div className="sticky top-20 space-y-3">
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Live Preview</span>
                          {result && <span className="text-green-400 font-medium">· AI Enhanced</span>}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {TEMPLATES.map(t => (
                            <button
                              key={t.id}
                              onClick={() => setSelectedTemplate(t.id)}
                              title={t.name}
                              className={`w-4 h-4 rounded-sm transition-all ${selectedTemplate === t.id ? "ring-2 ring-white ring-offset-1 ring-offset-card" : "opacity-50 hover:opacity-80"}`}
                              style={{ background: t.sidebarBg ?? t.accent }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="relative overflow-hidden bg-white" style={{ height: 440 }}>
                        <iframe
                          key={`live-${selectedTemplate}-${form.name}-${form.experience.length}-${form.skills.length}`}
                          title="Live CV Preview"
                          srcDoc={previewHtml}
                          className="border-0 bg-white absolute top-0 left-0"
                          sandbox="allow-same-origin"
                          style={{ width: "154%", height: "154%", transform: "scale(0.65)", transformOrigin: "top left" }}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={generate}
                      disabled={generateLoading}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 py-3 h-auto font-bold rounded-xl shadow-[0_0_30px_rgba(0,229,255,0.2)] hover:shadow-[0_0_40px_rgba(0,229,255,0.35)] transition-all"
                    >
                      {generateLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                        : <><Sparkles className="w-4 h-4" />Generate Enhanced CV</>}
                    </Button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* Step 6: Preview & Download */}
          {wizardStep === 6 && result && (
            <motion.div key="preview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold">Your CV is Ready 🎉</h1>
                  <p className="text-muted-foreground text-sm mt-1">Pick a template, preview, then download as PDF.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => setWizardStep(5)} variant="outline" size="sm" className="rounded-xl gap-1.5">
                    <ChevronLeft className="w-4 h-4" />Edit
                  </Button>
                  <Button onClick={() => copyText(activeTab)} variant="outline" size="sm" className="rounded-xl gap-1.5">
                    {copied === activeTab ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}Copy
                  </Button>
                  <Button onClick={downloadPDF} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-1.5 px-5">
                    <Download className="w-4 h-4" />Download PDF
                  </Button>
                </div>
              </div>

              <div className="mb-5">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Layout className="w-4 h-4 text-primary" />Choose Template</h2>
                <div className="grid grid-cols-4 gap-3">
                  {TEMPLATES.map(t => <TemplateCard key={t.id} template={t} selected={selectedTemplate === t.id} onSelect={() => setSelectedTemplate(t.id)} />)}
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                {(["resume", "cover"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
                    {tab === "resume" ? "📄 Resume" : "✉️ Cover Letter"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="h-1.5 w-full rounded-t-lg" style={{ backgroundColor: TEMPLATES.find(t => t.id === selectedTemplate)?.accent }} />
                  {activeTab === "resume" ? (
                    <div className="bg-white border border-border rounded-b-2xl p-6 leading-relaxed max-h-[600px] overflow-y-auto">
                      <div className="prose prose-sm max-w-none" style={{ color: "#1e293b" }} dangerouslySetInnerHTML={{ __html: mdInline(result.resume) }} />
                    </div>
                  ) : (
                    <div className="relative">
                      <textarea
                        value={editedCoverLetter}
                        onChange={e => setEditedCoverLetter(e.target.value)}
                        className="w-full bg-white border border-border rounded-b-2xl p-6 text-sm text-gray-800 leading-relaxed resize-none outline-none focus:border-primary/40 transition-colors"
                        style={{ minHeight: 600, fontFamily: "Georgia, serif" }}
                      />
                      <div className="absolute top-3 right-3 text-[10px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded">editable</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2"><Eye className="w-3.5 h-3.5" />Print Preview</div>
                  <div className="rounded-2xl border border-border overflow-hidden" style={{ height: 600 }}>
                    <iframe
                      key={`${selectedTemplate}-${activeTab}-${editedCoverLetter.length}`}
                      title="CV Preview"
                      srcDoc={activeTab === "resume" ? previewHtml : buildPrintHTML(editedCoverLetter, form.name, form.targetRole, TEMPLATES.find(t => t.id === selectedTemplate) ?? TEMPLATES[0], form.photo || undefined, { email: form.email, phone: form.phone, location: form.location, linkedin: form.linkedin, skills: form.skills })}
                      className="w-full h-full border-0 bg-white"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-4">
                Download opens the print dialog → choose <strong>Save as PDF</strong>
              </p>

              <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">Practice for your interview next</p>
                  <p className="text-muted-foreground text-sm">Use your new CV with the AI Interview Coach.</p>
                </div>
                <Link to="/interview-coach">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2" size="sm">
                    <Sparkles className="w-4 h-4" />Interview Coach
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

export default function CvBuilder() {
  return (
    <>
      <Show when="signed-in"><CvBuilderContent /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}
