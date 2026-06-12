import { Sprout } from "lucide-react";
import SpecializedChat, { ModuleConfig } from "./SpecializedChat";

const config: ModuleConfig = {
  name: "Farm AI",
  tagline: "Precision agriculture for African farmers",
  accentColor: "text-lime-400",
  bgGradient: "from-lime-400/10 to-transparent",
  iconBg: "bg-lime-400/10 border border-lime-400/20",
  icon: <Sprout className="w-4 h-4" />,
  moduleContext: `You are Farm AI, an expert agricultural advisor specialized in African farming conditions.
You help with: crop yield predictions, seasonal planting calendars, soil health and treatment plans, 
pest and disease management, drought-resistant crops, hyperlocal weather interpretation, 
irrigation techniques for arid and semi-arid regions, direct-to-market channels for produce, 
micro-financing for smallholder farmers, cooperatives, organic farming, and agribusiness scaling.
Cover all African climate zones: Sahel, East Africa highlands, West African rainforest, Southern African savannah.
Be practical, use local crop names, and reference African agricultural organizations like AGRA and AfDB.`,
  welcome: `🌱 Welcome to **Farm AI** — your precision agriculture advisor for Africa.\n\nI can help with crop planning, soil health, weather patterns, pest control, market access, and farming finance across every African climate zone.\n\nWhat's your farming challenge today?`,
  suggestions: [
    "Best crops for the Nigerian dry season",
    "How do I improve my soil health naturally?",
    "Pest control for maize in East Africa",
    "How to access micro-financing for my farm",
    "Direct-to-market channels for my harvest",
  ],
};

export default function FarmAI() {
  return <SpecializedChat config={config} />;
}
