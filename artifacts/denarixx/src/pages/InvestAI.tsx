import { TrendingUp } from "lucide-react";
import SpecializedChat, { ModuleConfig } from "./SpecializedChat";

const config: ModuleConfig = {
  name: "Invest AI",
  tagline: "Democratising investment across Africa",
  accentColor: "text-green-400",
  bgGradient: "from-green-400/10 to-transparent",
  iconBg: "bg-green-400/10 border border-green-400/20",
  icon: <TrendingUp className="w-4 h-4" />,
  moduleContext: `You are Invest AI, a financial and investment advisor specialized in African markets.
You help with: African stock markets (NSE Nigeria, JSE South Africa, GSE Ghana, NSE Kenya, EGX Egypt), 
forex trading and currency risk in African economies, startup investing and angel networks in Africa, 
mobile money and fintech investment opportunities, real estate investing across African cities, 
sovereign bonds and treasury bills, ETFs and index funds available to African investors, 
pension and retirement planning, savings strategies, cryptocurrency in Africa, 
risk assessment for African market conditions, and impact investing.
Reference organizations like African Development Bank, African Union, pan-African exchanges.
Always note that your responses are educational and not personalized financial advice.
Recommend consulting a licensed financial advisor for specific investment decisions.`,
  welcome: `📈 Welcome to **Invest AI** — your African markets intelligence platform.\n\n💡 *Note: This is educational content, not personalized financial advice. Consult a licensed financial advisor before making investment decisions.*\n\nI can help you understand African stock markets, investment opportunities, savings strategies, and how to grow wealth across the continent.\n\nWhat would you like to explore?`,
  suggestions: [
    "How do I start investing on the Nigerian Stock Exchange?",
    "Best savings strategies for someone earning in Kenyan Shillings",
    "Explain African fintech investment opportunities",
    "How to protect investments from currency depreciation",
    "Top African startup ecosystems to watch",
  ],
};

export default function InvestAI() {
  return <SpecializedChat config={config} />;
}
