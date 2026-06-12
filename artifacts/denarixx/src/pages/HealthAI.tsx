import { Heart, Stethoscope, Brain, Baby, Syringe, Hospital } from "lucide-react";
import ModuleLayout, { ModuleLayoutConfig } from "./ModuleLayout";

const config: ModuleLayoutConfig = {
  name: "Health AI",
  tagline: "AI healthcare guidance for every African community",
  icon: <Heart className="w-4 h-4" />,
  accentText: "text-rose-400",
  accentBg: "bg-rose-400/10",
  accentBorder: "border-rose-400/20",
  moduleContext: `You are Health AI, a healthcare information assistant for African communities.
Provide general health information and wellness guidance — NEVER diagnose or prescribe.
Always recommend seeing a licensed healthcare provider for medical concerns.
Help with: symptom information and when to seek care, preventive health and nutrition,
maternal and child health, common African infectious diseases (malaria, typhoid, cholera, TB, HIV/AIDS),
mental health awareness and local resources, finding affordable healthcare in Africa,
telemedicine options, vaccination guidance, medication general information, and community health.
Be empathetic, clear about your limitations as an AI, and encourage professional medical care.`,
  welcome: "💙 Welcome to **Health AI** — your health information and wellness guide.\n\n⚕️ *I provide health information only — not medical diagnosis. Always consult a licensed healthcare provider for medical concerns.*\n\nI can help with general wellness, understanding symptoms, finding care, and health resources across Africa.",
  suggestions: [
    "What are signs of malaria?",
    "Balanced diet tips for West Africa",
    "Find affordable healthcare in my area",
    "Mental health resources in Africa",
  ],
  quickActions: [
    {
      icon: <Stethoscope className="w-3.5 h-3.5" />,
      label: "Symptom Information",
      prompt: "I want to learn about some health symptoms. Ask me what symptoms I'm experiencing, and give me general health information about possible causes and when to seek medical care. Remind me this is not a diagnosis.",
    },
    {
      icon: <Hospital className="w-3.5 h-3.5" />,
      label: "Find Healthcare",
      prompt: "Help me find affordable healthcare options in my area of Africa. Ask me which country and city I'm in, and what type of care I'm looking for.",
    },
    {
      icon: <Brain className="w-3.5 h-3.5" />,
      label: "Mental Health Support",
      prompt: "I want to learn about mental health resources and support options available in Africa. Ask me my country and what kind of support I'm looking for.",
    },
    {
      icon: <Baby className="w-3.5 h-3.5" />,
      label: "Maternal & Child Health",
      prompt: "Give me guidance on maternal and child health best practices in Africa. Ask me whether I'm pregnant, a new mother, or caring for a young child, and provide tailored information.",
    },
    {
      icon: <Syringe className="w-3.5 h-3.5" />,
      label: "Vaccination Guide",
      prompt: "What vaccinations are recommended for adults and children in Sub-Saharan Africa? Ask me my country and age group for specific guidance.",
    },
    {
      icon: <Heart className="w-3.5 h-3.5" />,
      label: "Preventive Wellness",
      prompt: "Give me practical preventive health and nutrition tips for living well in Africa. Ask me my age, location, and any specific health concerns.",
    },
  ],
  infoCards: [
    { icon: "🏥", title: "Coverage", value: "54", sub: "African countries" },
    { icon: "🌡️", title: "Diseases Covered", value: "100+", sub: "African health conditions" },
    { icon: "⚕️", title: "Always Advised", value: "See a Doctor", sub: "For medical decisions" },
  ],
};

export default function HealthAI() {
  return <ModuleLayout config={config} />;
}
