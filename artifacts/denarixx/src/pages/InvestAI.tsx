import { TrendingUp, PieChart, Rocket, Globe, PiggyBank, BarChart2 } from "lucide-react";
import ModuleLayout, { ModuleLayoutConfig } from "./ModuleLayout";

const config: ModuleLayoutConfig = {
  name: "Invest AI",
  tagline: "Democratising investment across Africa",
  icon: <TrendingUp className="w-4 h-4" />,
  accentText: "text-green-400",
  accentBg: "bg-green-400/10",
  accentBorder: "border-green-400/20",
  moduleContext: `You are Invest AI, a financial information and investment education specialist for African markets.
Provide educational content about: African stock markets (NSE Nigeria, JSE South Africa, GSE Ghana, NSE Kenya, EGX Egypt),
forex and currency risk in African economies, startup investing and angel networks across Africa,
mobile money and fintech investment opportunities, real estate in African cities,
sovereign bonds and T-bills, ETFs available to African investors, pension and retirement planning,
savings strategies, cryptocurrency regulations in Africa, risk assessment for African markets, impact investing.
Always state responses are educational, not personalized financial advice.
Recommend consulting a licensed financial advisor before making investment decisions.`,
  welcome: "📈 Welcome to **Invest AI** — your African markets intelligence platform.\n\n💡 *Educational content only — not personalized financial advice. Consult a licensed financial advisor before investing.*\n\nI can explain African stock markets, investment strategies, savings options, and how to build wealth on the continent.",
  suggestions: [
    "Start investing on the Nigerian Stock Exchange",
    "Savings strategies in Kenyan Shillings",
    "African fintech investment opportunities",
    "Protect investments from currency depreciation",
  ],
  quickActions: [
    {
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      label: "Stock Market Primer",
      prompt: "Explain how to start investing in African stock markets. Ask me which country I'm in and my experience level, then walk me through the options step by step.",
    },
    {
      icon: <BarChart2 className="w-3.5 h-3.5" />,
      label: "Market Overview",
      prompt: "Give me an educational overview of the major African stock exchanges — NSE Nigeria, JSE South Africa, GSE Ghana, NSE Kenya, and EGX Egypt — including how they work and how to access them.",
    },
    {
      icon: <Rocket className="w-3.5 h-3.5" />,
      label: "Startup Investing",
      prompt: "Explain startup and angel investing opportunities in Africa. How do I find deals, evaluate African startups, and what ecosystems are most active?",
    },
    {
      icon: <Globe className="w-3.5 h-3.5" />,
      label: "Forex & Currency Risk",
      prompt: "Explain currency risk for African investors and how to protect investments from depreciation. Ask me which currencies I'm exposed to.",
    },
    {
      icon: <PieChart className="w-3.5 h-3.5" />,
      label: "Build a Portfolio",
      prompt: "Help me think through building a diversified African investment portfolio. Ask me my country, risk tolerance, and investment budget range.",
    },
    {
      icon: <PiggyBank className="w-3.5 h-3.5" />,
      label: "Savings Strategies",
      prompt: "What are the best savings and wealth-building strategies for someone in Africa? Ask me my country, income level, and financial goals.",
    },
  ],
  infoCards: [
    { icon: "📊", title: "Stock Exchanges", value: "7+", sub: "Major African markets" },
    { icon: "💱", title: "Currencies Tracked", value: "54", sub: "African forex pairs" },
    { icon: "🌱", title: "Investment Types", value: "10+", sub: "Stocks, bonds, startups" },
  ],
};

export default function InvestAI() {
  return <ModuleLayout config={config} />;
}
