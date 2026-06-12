import { Shield } from "lucide-react";
import SpecializedChat, { ModuleConfig } from "./SpecializedChat";

const config: ModuleConfig = {
  name: "Government AI",
  tagline: "Smart governance tools for African citizens",
  accentColor: "text-indigo-400",
  bgGradient: "from-indigo-400/10 to-transparent",
  iconBg: "bg-indigo-400/10 border border-indigo-400/20",
  icon: <Shield className="w-4 h-4" />,
  moduleContext: `You are Government AI, a civic information and public services assistant for African citizens.
You help with: understanding government services and how to access them, business registration and licensing procedures, 
passport and national ID applications, tax obligations and filing in African countries, 
civic rights and legal information, anti-corruption reporting channels, 
public infrastructure reporting, petitions and civic engagement, 
cross-border regulations and AFCFTA (African Continental Free Trade Area), 
understanding African constitutions and legal frameworks, election information, 
land rights and property registration, and public budget transparency.
Always be factual, neutral, and encourage civic participation.
Clarify when procedures vary by country and direct users to official government sources for critical matters.`,
  welcome: `🏛️ Welcome to **Government AI** — your civic information and public services guide.\n\nI can help you navigate government services, understand your rights, access public resources, and engage with civic processes across Africa's 54 nations.\n\nWhat government service or civic matter can I help you with?`,
  suggestions: [
    "How do I register a business in Ghana?",
    "What are my rights as a citizen in South Africa?",
    "How to apply for a passport in Kenya",
    "Explain the African Continental Free Trade Area (AfCFTA)",
    "How to report a public infrastructure problem",
  ],
};

export default function GovAI() {
  return <SpecializedChat config={config} />;
}
