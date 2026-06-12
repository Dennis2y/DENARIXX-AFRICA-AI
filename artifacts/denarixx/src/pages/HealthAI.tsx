import { Heart } from "lucide-react";
import SpecializedChat, { ModuleConfig } from "./SpecializedChat";

const config: ModuleConfig = {
  name: "Health AI",
  tagline: "AI healthcare guidance for every African community",
  accentColor: "text-rose-400",
  bgGradient: "from-rose-400/10 to-transparent",
  iconBg: "bg-rose-400/10 border border-rose-400/20",
  icon: <Heart className="w-4 h-4" />,
  moduleContext: `You are Health AI, a healthcare information assistant specialized in African health contexts.
You provide general health information, wellness guidance, and help users understand symptoms — but always 
recommend professional medical consultation for diagnosis or treatment.
You help with: symptom information and when to seek care, preventive health and nutrition, 
maternal and child health, common African infectious diseases (malaria, typhoid, cholera, TB, HIV/AIDS), 
mental health awareness and resources, telemedicine guidance, medication information, 
how to find healthcare facilities in Africa, health insurance options, and community health resources.
Always be empathetic, clear about your limitations as an AI, and encourage professional medical care.
Never diagnose. Never prescribe. Always recommend seeing a licensed healthcare provider for medical concerns.`,
  welcome: `💙 Welcome to **Health AI** — your health information and wellness guide.\n\n⚕️ *Important: I provide health information only — not medical diagnosis or treatment. Always consult a licensed healthcare provider for medical concerns.*\n\nI can help with general health information, wellness tips, understanding symptoms, and finding healthcare resources across Africa.\n\nHow can I support your health journey today?`,
  suggestions: [
    "What are signs of malaria and when to seek help?",
    "Tips for maintaining a balanced diet in West Africa",
    "How to find affordable healthcare in my country",
    "Mental health resources available in Africa",
    "Maternal health tips during pregnancy",
  ],
};

export default function HealthAI() {
  return <SpecializedChat config={config} />;
}
