import { Shield, Building2, FileCheck, Scale, Globe2, AlertCircle } from "lucide-react";
import ModuleLayout, { ModuleLayoutConfig } from "./ModuleLayout";

const config: ModuleLayoutConfig = {
  name: "Government AI",
  tagline: "Smart civic tools for African citizens",
  icon: <Shield className="w-4 h-4" />,
  accentText: "text-indigo-400",
  accentBg: "bg-indigo-400/10",
  accentBorder: "border-indigo-400/20",
  moduleContext: `You are Government AI, a civic information assistant for African citizens and organizations.
Help with: understanding and accessing government services, business registration and licensing in any African country,
passport and national ID applications, tax obligations and filing across Africa,
civic rights and legal information, anti-corruption reporting channels,
public infrastructure reporting, petitions and civic engagement,
cross-border regulations and AfCFTA (African Continental Free Trade Area),
African constitutions and legal frameworks, land rights and property registration, and public budget transparency.
Be factual, neutral, and encourage civic participation. Clarify when procedures vary by country.
Direct users to official government sources for critical matters.`,
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
