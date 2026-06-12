import { Sprout, Calendar, Bug, DollarSign, Droplets, BarChart } from "lucide-react";
import ModuleLayout, { ModuleLayoutConfig } from "./ModuleLayout";

const config: ModuleLayoutConfig = {
  name: "Farm AI",
  tagline: "Precision agriculture for African farmers",
  icon: <Sprout className="w-4 h-4" />,
  accentText: "text-lime-400",
  accentBg: "bg-lime-400/10",
  accentBorder: "border-lime-400/20",
  moduleContext: `You are Farm AI, an expert agricultural advisor specialized in African farming conditions.
Help with: crop yield predictions, seasonal planting calendars for all African climate zones (Sahel, East Africa highlands, 
West African rainforest, Southern African savannah), soil health and treatment, pest and disease management,
drought-resistant crop varieties, irrigation techniques for arid regions, direct-to-market channels for produce,
micro-financing for smallholder farmers, cooperatives, organic farming, and agribusiness scaling.
Use local crop names, reference AGRA, AfDB, and other African agricultural organizations.`,
  welcome: "🌱 Welcome to **Farm AI** — your precision agriculture advisor.\n\nI'm here to help with crop planning, soil health, pest control, market access, and farming finance across every African climate zone.\n\nChoose a quick action or ask me anything about your farm.",
  suggestions: [
    "Best crops for the Nigerian dry season",
    "How do I improve my soil naturally?",
    "Pest control for maize in East Africa",
    "How to access micro-finance for my farm",
  ],
  quickActions: [
    {
      icon: <Calendar className="w-3.5 h-3.5" />,
      label: "Seasonal Crop Planner",
      prompt: "Help me plan what crops to plant this season. Ask me which country or region I'm in, my farm size, and whether I farm on rain-fed or irrigated land.",
    },
    {
      icon: <Bug className="w-3.5 h-3.5" />,
      label: "Pest & Disease Control",
      prompt: "I need help identifying and controlling pests or diseases on my farm. Ask me what crop I'm growing, what symptoms I'm seeing, and where I'm located in Africa.",
    },
    {
      icon: <Sprout className="w-3.5 h-3.5" />,
      label: "Soil Health Check",
      prompt: "Guide me on how to assess and improve my soil health. Ask me what region I farm in and what crops I want to grow, then give practical advice.",
    },
    {
      icon: <BarChart className="w-3.5 h-3.5" />,
      label: "Market Prices & Sales",
      prompt: "How do I find fair market prices for my produce and connect with buyers in Africa? Ask me what crop I'm selling and which country I'm in.",
    },
    {
      icon: <DollarSign className="w-3.5 h-3.5" />,
      label: "Farm Finance Options",
      prompt: "What financing options are available for smallholder farmers in Africa? Ask me my country and what I need funding for, then list specific options.",
    },
    {
      icon: <Droplets className="w-3.5 h-3.5" />,
      label: "Irrigation Advice",
      prompt: "Help me set up an effective irrigation system for my African farm. Ask me my water source, farm size, and crops, then recommend practical solutions.",
    },
  ],
  infoCards: [
    { icon: "🌾", title: "Crop Database", value: "300+", sub: "African crop varieties" },
    { icon: "🗺️", title: "Climate Zones", value: "All", sub: "Sahel to Cape" },
    { icon: "📦", title: "Market Access", value: "54 Nations", sub: "Direct-to-buyer channels" },
  ],
};

export default function FarmAI() {
  return <ModuleLayout config={config} />;
}
