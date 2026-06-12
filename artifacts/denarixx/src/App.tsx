import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
// @ts-expect-error — @clerk/themes@1.x ships shadcn but its d.ts omits it
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Admin from "@/pages/Admin";
import Leaderboard from "@/pages/Leaderboard";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import SkillSwap from "@/pages/SkillSwap";
import DenaPage from "@/pages/Dena";
import CvBuilder from "@/pages/CvBuilder";
import Jobs from "@/pages/Jobs";
import InterviewCoach from "@/pages/InterviewCoach";
import Community from "@/pages/Community";
import Messages from "@/pages/Messages";
import BusinessAI from "@/pages/BusinessAI";
import Marketplace from "@/pages/Marketplace";
import FarmAI from "@/pages/FarmAI";
import HealthAI from "@/pages/HealthAI";
import InvestAI from "@/pages/InvestAI";
import GovAI from "@/pages/GovAI";
import DenaChat from "@/components/DenaChat";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/denarixx-logo.png`,
  },
  variables: {
    colorPrimary: "#00E5FF",
    colorForeground: "#E2E8F0",
    colorMutedForeground: "#94A3B8",
    colorDanger: "#F87171",
    colorBackground: "#0B1020",
    colorInput: "#1A2035",
    colorInputForeground: "#E2E8F0",
    colorNeutral: "#1E293B",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0F172A] border border-[#1E293B] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_0_40px_rgba(0,229,255,0.08)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#E2E8F0] font-bold",
    headerSubtitle: "text-[#94A3B8]",
    socialButtonsBlockButtonText: "text-[#E2E8F0]",
    formFieldLabel: "text-[#94A3B8]",
    footerActionLink: "text-[#00E5FF] hover:text-[#00E5FF]/80",
    footerActionText: "text-[#94A3B8]",
    dividerText: "text-[#94A3B8]",
    identityPreviewEditButton: "text-[#00E5FF]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-[#E2E8F0]",
    logoBox: "mb-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border-[#1E293B] bg-[#1A2035] hover:bg-[#1E2840] text-[#E2E8F0]",
    formButtonPrimary: "bg-[#00E5FF] text-[#0B1020] hover:bg-[#00E5FF]/90 font-semibold",
    formFieldInput: "bg-[#1A2035] border-[#1E293B] text-[#E2E8F0]",
    footerAction: "bg-transparent",
    dividerLine: "bg-[#1E293B]",
    alert: "bg-[#1A2035] border-[#1E293B]",
    otpCodeFieldInput: "bg-[#1A2035] border-[#1E293B] text-[#E2E8F0]",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/home" component={Landing} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/skillswap" component={SkillSwap} />
      <Route path="/dena" component={DenaPage} />
      <Route path="/cv-builder" component={CvBuilder} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/interview-coach" component={InterviewCoach} />
      <Route path="/community" component={Community} />
      <Route path="/messages" component={Messages} />
      <Route path="/business" component={BusinessAI} />
      <Route path="/business-ai" component={BusinessAI} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/farm" component={FarmAI} />
      <Route path="/farm-ai" component={FarmAI} />
      <Route path="/health" component={HealthAI} />
      <Route path="/health-ai" component={HealthAI} />
      <Route path="/invest" component={InvestAI} />
      <Route path="/invest-ai" component={InvestAI} />
      <Route path="/government" component={GovAI} />
      <Route path="/gov-ai" component={GovAI} />
      <Route path="/admin" component={Admin} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your DENARIXX account",
          },
        },
        signUp: {
          start: {
            title: "Join DENARIXX",
            subtitle: "Africa's AI Operating System",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <DenaChat />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
