import { Building } from "lucide-react";
import SpecializedChat, { ModuleConfig } from "./SpecializedChat";

const config: ModuleConfig = {
  name: "Business AI",
  tagline: "Intelligent automation for African enterprises",
  accentColor: "text-cyan-400",
  bgGradient: "from-cyan-400/10 to-transparent",
  iconBg: "bg-cyan-400/10 border border-cyan-400/20",
  icon: <Building className="w-4 h-4" />,
  moduleContext: `You are Business AI, an expert business advisor for African entrepreneurs and enterprises.
You help with: business operations automation, marketing strategy, supplier discovery, cash flow forecasting, 
multi-currency invoicing across 54 African countries, business registration, funding sources, scaling strategies, 
African regulatory compliance, and connecting with pan-African markets.
Be practical, data-driven, and Africa-specific in your advice.`,
  welcome: `👋 Welcome to **Business AI** — your intelligent operations partner.\n\nI can help you automate operations, build marketing strategies, discover suppliers, forecast cash flow, and scale your business across Africa's 54 markets.\n\nWhat business challenge can I help you solve today?`,
  suggestions: [
    "How do I register a business in Nigeria?",
    "What funding options exist for African startups?",
    "Help me build a cash flow forecast",
    "How do I find suppliers across Africa?",
    "Best marketing strategies for East African markets",
  ],
};

export default function BusinessAI() {
  return <SpecializedChat config={config} />;
}
