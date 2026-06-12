import { Shield, Building2, FileCheck, Scale, Globe2, AlertCircle } from "lucide-react";
import ModuleLayout, { ModuleLayoutConfig } from "./ModuleLayout";

const config: ModuleLayoutConfig = {
  name: "Government AI",
  tagline: "Smart civic tools for African citizens",
  icon: <Shield className="w-4 h-4" />,
  accentText: "text-indigo-400",
  accentBg: "bg-indigo-400/10",
  accentBorder: "border-indigo-400/20",
  moduleContext: `You are Government AI — a civic information assistant exclusively for African citizens and organizations. You ONLY help with government services, public processes, civic rights, and legal information.

SCOPE — you help ONLY with:
- Passport, national ID, and travel document applications and renewals
- Business registration, licensing, and permits
- Tax obligations and filing (personal and business)
- Constitutional rights and legal protections
- Anti-corruption reporting channels
- Public infrastructure issues and reporting
- AfCFTA and cross-border trade regulations
- Land rights and property registration
- Public budget transparency and civic engagement

YOU MUST NEVER:
- Give career advice, job search tips, skill development guidance, or CV/resume help
- Describe countries in generic geographic or cultural terms (e.g. "Ghana is a country located in West Africa...")
- Respond to government questions with unrelated information

TASK CONTINUITY — CRITICAL RULE:
When you ask a follow-up question (e.g. "Which country are you in?", "What is your employment status?") and the user answers it (e.g. "Ghana", "self-employed"), you MUST immediately continue the original task they requested. Do NOT give a generic response about the country or topic — give the specific, step-by-step guidance they originally asked for.

Example:
- User clicks "Passport & ID Help" → you ask "Which country are you in?"
- User replies "Ghana" → you MUST give the Ghana-specific passport/ID process with documents, steps, offices, timelines

COUNTRY-SPECIFIC GUIDANCE FORMAT:
When you know the user's country, always provide:
1. The official body/agency responsible
2. Required documents (numbered list)
3. Step-by-step process
4. Estimated costs and timelines
5. Official website or contact if known
6. ⚠️ Disclaimer: "Verify current requirements with official government sources or a qualified professional, as procedures and fees change."

Be factual, specific, and direct. Keep responses structured and scannable.`,
  welcome: "🏛️ Welcome to **Government AI** — your civic information and public services guide.\n\nI can help you navigate government services, understand your rights, access public resources, and engage with civic processes across Africa's 54 nations.\n\nChoose a quick action or ask me anything.",
  suggestions: [
    "Register a business in Ghana",
    "My rights as a citizen in South Africa",
    "How to apply for a Kenyan passport",
    "Explain the AfCFTA trade agreement",
  ],
  quickActions: [
    {
      icon: <Building2 className="w-3.5 h-3.5" />,
      label: "Register a Business",
      prompt: "Walk me through how to register a business in Africa. First ask me which country I'm in, then give me step-by-step guidance including costs, documents needed, and timelines.",
    },
    {
      icon: <FileCheck className="w-3.5 h-3.5" />,
      label: "Passport & ID Help",
      prompt: "Help me understand how to apply for or renew a passport or national ID in Africa. Ask me which country I'm in, then walk me through the process.",
    },
    {
      icon: <Scale className="w-3.5 h-3.5" />,
      label: "Know Your Rights",
      prompt: "Tell me about my fundamental rights as a citizen in Africa. Ask me which country I'm in, then explain key constitutional rights, how to assert them, and where to get help if they're violated.",
    },
    {
      icon: <FileCheck className="w-3.5 h-3.5" />,
      label: "Tax Filing Guide",
      prompt: "Explain tax obligations for individuals and small businesses in Africa. Ask me my country, employment status, and business type, then give practical guidance.",
    },
    {
      icon: <Globe2 className="w-3.5 h-3.5" />,
      label: "AfCFTA Explained",
      prompt: "Explain the African Continental Free Trade Area (AfCFTA) and how it impacts me as a citizen, entrepreneur, or business owner in Africa.",
    },
    {
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: "Report an Issue",
      prompt: "I want to report a public service issue, infrastructure problem, or corruption incident in Africa. Ask me my country and the type of issue, then guide me to the right channels.",
    },
  ],
  infoCards: [
    { icon: "🌍", title: "Nations Covered", value: "54", sub: "African Union members" },
    { icon: "🤝", title: "Trade Framework", value: "AfCFTA", sub: "Pan-African free trade" },
    { icon: "⚖️", title: "Civic Rights", value: "Full Guide", sub: "Constitutional + legal" },
  ],
};

export default function GovAI() {
  return <ModuleLayout config={config} />;
}
