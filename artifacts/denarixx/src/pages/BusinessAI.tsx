import { Building, FileText, Users, TrendingUp, BarChart2, Megaphone } from "lucide-react";
import ModuleLayout, { ModuleLayoutConfig } from "./ModuleLayout";

const config: ModuleLayoutConfig = {
  name: "Business AI",
  tagline: "Intelligent automation for African enterprises",
  icon: <Building className="w-4 h-4" />,
  accentText: "text-cyan-400",
  accentBg: "bg-cyan-400/10",
  accentBorder: "border-cyan-400/20",
  moduleContext: `You are Business AI, an expert business advisor for African entrepreneurs and enterprises.
Help with: business plan creation, operations automation, marketing strategy, supplier discovery across Africa,
cash flow forecasting, multi-currency invoicing across 54 African countries, funding options, 
business registration in any African country, scaling strategies, regulatory compliance, 
connecting with pan-African markets, hiring, and digital transformation.
Be practical, specific, and reference real African business resources.`,
  welcome: "👋 Welcome to **Business AI** — your intelligent operations partner for Africa.\n\nI can help you build business plans, automate operations, find suppliers, forecast cash flow, and scale across all 54 African markets.\n\nChoose a quick action or ask me anything about your business.",
  suggestions: [
    "How do I register a business in Nigeria?",
    "What funding exists for African startups?",
    "Build me a cash flow forecast template",
    "Find suppliers across East Africa",
  ],
  quickActions: [
    {
      icon: <FileText className="w-3.5 h-3.5" />,
      label: "Write a Business Plan",
      prompt: "Help me create a comprehensive business plan for an African business. Start by asking me what type of business I want to build and which country I'm operating in.",
    },
    {
      icon: <Users className="w-3.5 h-3.5" />,
      label: "Find Suppliers",
      prompt: "I need to find reliable suppliers for my African business. Ask me what product or service category I need, and guide me through the best sourcing options across Africa.",
    },
    {
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      label: "Cash Flow Forecast",
      prompt: "Help me understand how to build a cash flow forecast for a small-to-medium African business. Give me a practical template and explain each component.",
    },
    {
      icon: <Megaphone className="w-3.5 h-3.5" />,
      label: "Marketing Strategy",
      prompt: "Create a digital marketing strategy for my African business. First ask me about my target market, budget, and type of product or service.",
    },
    {
      icon: <BarChart2 className="w-3.5 h-3.5" />,
      label: "Market Analysis",
      prompt: "Help me conduct a market analysis for a business in Africa. Ask me what industry I'm in and which country or region I'm targeting.",
    },
    {
      icon: <FileText className="w-3.5 h-3.5" />,
      label: "Invoice Template",
      prompt: "Create a professional invoice template for an African business that supports multi-currency billing across different African countries.",
    },
  ],
  infoCards: [
    { icon: "🌍", title: "African Markets", value: "54", sub: "Countries covered" },
    { icon: "💱", title: "Currencies", value: "30+", sub: "Supported for invoicing" },
    { icon: "🤝", title: "B2B Network", value: "Pan-African", sub: "Supplier directory" },
  ],
};

export default function BusinessAI() {
  return <ModuleLayout config={config} />;
}
