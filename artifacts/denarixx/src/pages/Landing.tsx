import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { 
  Globe, Cpu, Zap, Shield, Target, Users, TrendingUp, 
  MapPin, Heart, Menu, X, ArrowRight, Play, CheckCircle2,
  Sparkles, Briefcase, GraduationCap, Sprout, Building,
  Mail, User, ChevronDown, PartyPopper, Loader2, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJoinWaitlist, useGetWaitlistCount, useGetWaitlistReferrals } from "@workspace/api-client-react";

import heroCity from "@/assets/hero-city.png";
import professionals from "@/assets/professionals.png";

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};

// --- Components ---

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-lg border-b border-border" : "bg-transparent"}`}>
      <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/50">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight">DENARIXX<span className="text-primary">.AI</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#modules" className="hover:text-primary transition-colors">Modules</a>
          <a href="#users" className="hover:text-primary transition-colors">Ecosystem</a>
          <a href="#dena" className="hover:text-primary transition-colors">DENA AI</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" className="text-foreground" onClick={() => scrollTo("waitlist")}>Log In</Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => scrollTo("waitlist")}>Get Early Access</Button>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-20 left-0 w-full bg-background border-b border-border p-4 flex flex-col gap-4 shadow-2xl"
          >
            <a href="#modules" className="p-2 text-foreground font-medium" onClick={() => setMobileMenuOpen(false)}>Modules</a>
            <a href="#users" className="p-2 text-foreground font-medium" onClick={() => setMobileMenuOpen(false)}>Ecosystem</a>
            <a href="#dena" className="p-2 text-foreground font-medium" onClick={() => setMobileMenuOpen(false)}>DENA AI</a>
            <a href="#pricing" className="p-2 text-foreground font-medium" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <div className="h-px w-full bg-border my-2" />
            <Button variant="outline" className="w-full" onClick={() => { scrollTo("waitlist"); setMobileMenuOpen(false); }}>Log In</Button>
            <Button className="w-full bg-primary text-primary-foreground" onClick={() => { scrollTo("waitlist"); setMobileMenuOpen(false); }}>Get Early Access</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);
  const { data: countData } = useGetWaitlistCount();
  const waitlistCount = countData?.count ?? null;

  const title = "Africa's AI Operating System".split(" ");

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background */}
      <motion.div style={{ y: y1, opacity }} className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background/80 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background z-10" />
        <img src={heroCity} alt="Futuristic African City" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
      </motion.div>

      {/* Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] z-0 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[150px] z-0" />

      <div className="container relative z-10 mx-auto px-4 md:px-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
        >
          <Sparkles className="w-4 h-4" />
          <span>The Future is Here. Version 1.0 Live.</span>
        </motion.div>

        {waitlistCount !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center mb-8"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-card/70 backdrop-blur border border-border/60 shadow-lg">
              <div className="flex -space-x-2">
                {["bg-primary", "bg-secondary", "bg-accent"].map((color, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${color}/80 border-2 border-background flex items-center justify-center`}>
                    <Users className="w-3 h-3 text-background" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <motion.span
                  key={waitlistCount}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-primary font-black tabular-nums"
                >
                  {waitlistCount.toLocaleString()}
                </motion.span>
                <span className="text-muted-foreground font-medium">people already on the waitlist</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            </div>
          </motion.div>
        )}

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 max-w-5xl leading-tight">
          {title.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`inline-block mr-4 ${word === "AI" ? "text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary" : "text-foreground"}`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-lg md:text-2xl text-muted-foreground max-w-3xl mb-10"
        >
          A unified super-platform powering students, freelancers, professionals, and enterprises. 
          Built in Africa, for Africa, shaping the global digital frontier.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
        >
          <Button size="lg" onClick={() => scrollTo("waitlist")} className="h-14 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90 rounded-full w-full sm:w-auto group relative overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">
              Join the Waitlist <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => scrollTo("modules")} className="h-14 px-8 text-lg rounded-full w-full sm:w-auto bg-background/50 backdrop-blur-sm border-border hover:bg-muted">
            <Play className="w-5 h-5 mr-2" /> Explore Platform
          </Button>
        </motion.div>
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,transparent,black_50%,transparent)] z-0 pointer-events-none" />
    </section>
  );
};

const Stats = () => {
  const stats = [
    { value: "54", label: "African Countries" },
    { value: "10+", label: "AI Modules" },
    { value: "1M+", label: "Users Target" },
    { value: "10+", label: "Languages" },
  ];

  return (
    <section className="py-12 border-y border-border/50 bg-card/30 backdrop-blur-sm relative z-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <div className="text-4xl md:text-5xl font-black text-foreground mb-2 tracking-tighter">{stat.value}</div>
              <div className="text-sm md:text-base text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Modules = () => {
  const modules = [
    { icon: <GraduationCap />, name: "SkillSwap AI", desc: "Learn, trade skills, and upskill with AI-guided paths." },
    { icon: <Briefcase />, name: "Jobs AI", desc: "Smart matching for freelancers and full-time roles." },
    { icon: <Building />, name: "Business AI", desc: "Automate operations and scale your enterprise." },
    { icon: <Target />, name: "Marketplace", desc: "Connect buyers and sellers across the continent." },
    { icon: <Sprout />, name: "Farm AI", desc: "Crop predictions, weather, and yield optimization." },
    { icon: <Heart />, name: "Health AI", desc: "Accessible diagnostics and telemedicine." },
    { icon: <TrendingUp />, name: "Invest AI", desc: "Data-driven insights for African markets." },
    { icon: <Shield />, name: "Government AI", desc: "Streamlined public services and civic tech." },
    { icon: <Users />, name: "Community Network", desc: "The professional social graph for Africa." },
    { icon: <Cpu />, name: "DENA AI", desc: "The core intelligence powering it all." },
  ];

  return (
    <section id="modules" className="py-32 relative">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">One Platform. <br/><span className="text-primary">Infinite Possibilities.</span></h2>
          <p className="text-muted-foreground text-lg">10 integrated modules designed to solve real challenges and accelerate growth across every sector in Africa.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {modules.map((mod, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-colors group cursor-default relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                {mod.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-foreground">{mod.name}</h3>
              <p className="text-sm text-muted-foreground">{mod.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Ecosystem = () => {
  return (
    <section id="users" className="py-32 relative overflow-hidden bg-muted/30">
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Empowering Every <span className="text-primary">African Builder</span></h2>
            <p className="text-lg text-muted-foreground mb-8">
              DENARIXX isn't just software. It's a living ecosystem where students become founders, farmers access global markets, and professionals scale their impact.
            </p>

            <div className="space-y-6">
              {[
                { title: "For Students & Freelancers", desc: "AI mentors, global gig matching, and skill certification." },
                { title: "For Entrepreneurs & SMEs", desc: "Automated logistics, AI-driven marketing, and funding access." },
                { title: "For Farmers & Builders", desc: "Predictive analytics, resource management, and direct-to-market tools." }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 mt-1">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">{item.title}</h4>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="lg:w-1/2 w-full">
            <div className="relative rounded-2xl overflow-hidden border border-border">
              <div className="absolute inset-0 bg-primary/20 mix-blend-overlay z-10" />
              <img src={professionals} alt="African Professionals" className="w-full h-[500px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const DenaAI = () => {
  return (
    <section id="dena" className="py-32 relative">
      <div className="absolute inset-0 bg-primary/5 z-0" />
      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-8 border border-primary/50 relative">
            <div className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
            <Cpu className="w-12 h-12 text-primary relative z-10" />
          </div>
          <h2 className="text-4xl md:text-6xl font-black mb-6">Meet <span className="text-primary">DENA AI</span></h2>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12">
            The beating heart of the ecosystem. A context-aware, hyper-intelligent assistant that understands African languages, markets, and nuances.
          </p>
          <Button size="lg" onClick={() => scrollTo("waitlist")} className="bg-primary text-primary-foreground rounded-full px-8">Get Early Access</Button>
        </motion.div>
      </div>
    </section>
  );
};

const Pricing = () => {
  const plans = [
    {
      name: "Explorer",
      price: "Free",
      desc: "For students and individuals starting their journey.",
      features: ["Basic DENA AI access", "Community Network profile", "SkillSwap entry", "Standard jobs board"],
      cta: "Get Started"
    },
    {
      name: "Pro",
      price: "$9.99/mo",
      desc: "For freelancers and ambitious professionals.",
      features: ["Advanced DENA AI limits", "Priority job matching", "Pro portfolio badges", "Marketplace selling"],
      cta: "Upgrade to Pro",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "For organizations and large-scale operations.",
      features: ["Unlimited AI capabilities", "API & integrations", "Dedicated support", "Custom AI models"],
      cta: "Contact Sales"
    }
  ];

  return (
    <section id="pricing" className="py-32 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Scale with <span className="text-primary">DENARIXX</span></h2>
          <p className="text-muted-foreground text-lg">Plans designed for every stage of your growth.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-3xl border ${plan.popular ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="text-4xl font-black mb-4">{plan.price}</div>
              <p className="text-muted-foreground mb-8">{plan.desc}</p>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-sm">{feat}</span>
                  </li>
                ))}
              </ul>

              <Button onClick={() => scrollTo("waitlist")} className={`w-full ${plan.popular ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Gamification = () => {
  return (
    <section className="py-32 bg-card/50 border-t border-border">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-12">Level Up Your <span className="text-secondary">Impact</span></h2>
        <div className="flex flex-wrap justify-center gap-4">
          {['Explorer', 'Builder', 'Innovator', 'Visionary', 'Titan'].map((level, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.1 }}
              className="px-6 py-3 rounded-full bg-background border border-border shadow-lg flex items-center gap-2"
            >
              <div className={`w-3 h-3 rounded-full ${i === 4 ? 'bg-primary' : 'bg-muted-foreground'}`} />
              <span className="font-bold">{level}</span>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-muted-foreground max-w-2xl mx-auto">
          Earn XP, unlock badges, and gain influence as you contribute to the ecosystem. Your growth powers Africa's growth.
        </p>
      </div>
    </section>
  );
};

const AfricaCoverage = () => {
  return (
    <section className="py-32 relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20 pointer-events-none">
        {/* Abstract Africa Silhouette/Nodes using SVG */}
        <svg viewBox="0 0 800 800" className="w-[800px] h-[800px] text-primary" fill="currentColor">
           <path d="M 300 200 Q 400 100 500 200 T 700 400 Q 600 600 500 700 T 300 600 Q 200 500 200 400 T 300 200" opacity="0.1" />
           <circle cx="350" cy="300" r="10" />
           <circle cx="450" cy="250" r="8" />
           <circle cx="500" cy="400" r="12" />
           <circle cx="400" cy="500" r="15" />
           <circle cx="550" cy="550" r="8" />
           <circle cx="450" cy="650" r="10" />
           <line x1="350" y1="300" x2="450" y2="250" stroke="currentColor" strokeWidth="2" />
           <line x1="450" y1="250" x2="500" y2="400" stroke="currentColor" strokeWidth="2" />
           <line x1="500" y1="400" x2="400" y2="500" stroke="currentColor" strokeWidth="2" />
           <line x1="400" y1="500" x2="350" y2="300" stroke="currentColor" strokeWidth="2" />
           <line x1="500" y1="400" x2="550" y2="550" stroke="currentColor" strokeWidth="2" />
           <line x1="550" y1="550" x2="450" y2="650" stroke="currentColor" strokeWidth="2" />
           <line x1="450" y1="650" x2="400" y2="500" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <div className="container mx-auto px-4 relative z-10 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Connecting <span className="text-primary">54 Nations</span></h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
          DENARIXX is lighting up the continent. Our nodes are expanding from Accra to Nairobi, Lagos to Kigali, building the most powerful network of African talent and businesses in history.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
           {['Accra, GH', 'Lagos, NG', 'Nairobi, KE', 'Kigali, RW', 'Johannesburg, ZA'].map((city, i) => (
             <motion.div
               key={i}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: i * 0.1 }}
               className="px-6 py-4 bg-card/80 backdrop-blur border border-primary/20 rounded-2xl flex items-center gap-3"
             >
               <MapPin className="w-5 h-5 text-primary" />
               <span className="font-semibold">{city}</span>
             </motion.div>
           ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-primary" />
              <span className="font-bold text-2xl">DENARIXX<span className="text-primary">.AI</span></span>
            </div>
            <p className="text-muted-foreground max-w-sm mb-6">
              Africa's AI Operating System. Headquartered in Ghana, building for the continent.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => scrollTo("modules")} className="hover:text-primary transition-colors">Modules</button></li>
              <li><button onClick={() => scrollTo("dena")} className="hover:text-primary transition-colors">DENA AI</button></li>
              <li><button onClick={() => scrollTo("pricing")} className="hover:text-primary transition-colors">Pricing</button></li>
              <li><button onClick={() => scrollTo("waitlist")} className="hover:text-primary transition-colors">Waitlist</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => scrollTo("users")} className="hover:text-primary transition-colors">About</button></li>
              <li><button onClick={() => scrollTo("waitlist")} className="hover:text-primary transition-colors">Careers</button></li>
              <li><button onClick={() => scrollTo("waitlist")} className="hover:text-primary transition-colors">Privacy</button></li>
              <li><button onClick={() => scrollTo("waitlist")} className="hover:text-primary transition-colors">Terms</button></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/50 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} DENARIXX AFRICA AI. All rights reserved.</p>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Globe className="w-4 h-4" /> Built in Africa
          </div>
        </div>
      </div>
    </footer>
  );
};

const USER_TYPES = [
  "Student",
  "Freelancer",
  "Professional",
  "Entrepreneur",
  "Investor",
  "Farmer",
  "Recruiter",
  "Other",
];

const AFRICAN_COUNTRIES = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cameroon", "Central African Republic", "Chad", "Comoros",
  "Congo (DRC)", "Congo (Republic)", "Djibouti", "Egypt", "Equatorial Guinea",
  "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea",
  "Guinea-Bissau", "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya",
  "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco",
  "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda", "Sao Tome & Principe",
  "Senegal", "Seychelles", "Sierra Leone", "Somalia", "South Africa",
  "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia",
  "Zimbabwe", "Other",
];

const ReferralSuccessScreen = ({ myCode }: { myCode: string }) => {
  const [copied, setCopied] = useState(false);
  const { data: refData } = useGetWaitlistReferrals(myCode);
  const referralCount = refData?.referralCount ?? 0;
  const referralUrl = `${window.location.origin}${window.location.pathname}?ref=${myCode}`;
  const tweetText = `I just joined the DENARIXX AFRICA AI waitlist! 🚀 Africa's AI Operating System is coming — built for the continent, by the continent. Join me 👇`;

  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-card/80 backdrop-blur border border-accent/40 rounded-3xl p-10 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center mx-auto mb-6">
        <PartyPopper className="w-8 h-8 text-accent" />
      </div>
      <h3 className="text-2xl font-bold mb-2">You're on the list! 🎉</h3>
      <p className="text-muted-foreground mb-8">
        We'll reach out when early access opens. Meanwhile, invite friends to move up the queue.
      </p>

      {/* Referral Stats */}
      <div className="mb-8 p-5 rounded-2xl bg-primary/5 border border-primary/20">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Your Referral Progress</p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <motion.span
            key={referralCount}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-black text-primary tabular-nums"
          >
            {referralCount}
          </motion.span>
          <span className="text-muted-foreground text-sm text-left leading-tight">
            {referralCount === 1 ? "person" : "people"}<br/>invited so far
          </span>
        </div>
        <div className="flex items-center gap-2 bg-background/60 border border-border rounded-xl px-4 py-3">
          <span className="text-xs text-muted-foreground font-mono flex-1 truncate text-left">{referralUrl}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(referralUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="border-t border-border/40 pt-6">
        <p className="text-xs font-semibold text-foreground/60 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
          <Share2 className="w-3.5 h-3.5" /> Share Your Link
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(referralUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1DA1F2]/10 border border-[#1DA1F2]/30 text-[#1DA1F2] font-semibold text-sm hover:bg-[#1DA1F2]/20 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0077B5]/10 border border-[#0077B5]/30 text-[#0077B5] font-semibold text-sm hover:bg-[#0077B5]/20 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Share on LinkedIn
          </a>
        </div>
      </div>
    </motion.div>
  );
};

const WaitlistCTA = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [userType, setUserType] = useState("");
  const [country, setCountry] = useState("");
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const referredBy = new URLSearchParams(window.location.search).get("ref") ?? undefined;

  const { mutate, isPending } = useJoinWaitlist({
    mutation: {
      onSuccess: (data) => {
        setMyReferralCode(data.referralCode);
        setErrorMsg("");
      },
      onError: (err: unknown) => {
        const e = err as { response?: { data?: { error?: string } } };
        setErrorMsg(e?.response?.data?.error ?? "Something went wrong. Please try again.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    mutate({ data: { email, name: name || undefined, userType: userType || undefined, country: country || undefined, referredBy } });
  };

  return (
    <section id="waitlist" className="py-32 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold mb-8">
            <Sparkles className="w-4 h-4" />
            Limited Early Access
          </div>

          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            The Future is <span className="text-primary">Calling.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Be among the first to experience Africa's AI Operating System. Join thousands already on the waitlist.
          </p>

          <AnimatePresence mode="wait">
            {myReferralCode ? (
              <ReferralSuccessScreen myCode={myReferralCode} />
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                onSubmit={handleSubmit}
                className="bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-8 md:p-10 space-y-5 text-left"
              >
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80" htmlFor="waitlist-name">
                    Your name <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="waitlist-name"
                      data-testid="input-waitlist-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kofi Mensah"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-background/60 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80" htmlFor="waitlist-email">
                    Email address <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="waitlist-email"
                      data-testid="input-waitlist-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-background/60 border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                </div>

                {/* Two-column row: role + country */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* User type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80" htmlFor="waitlist-usertype">
                      I am a <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <select
                        id="waitlist-usertype"
                        data-testid="select-waitlist-usertype"
                        value={userType}
                        onChange={(e) => setUserType(e.target.value)}
                        className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl bg-background/60 border border-border text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                      >
                        <option value="">Select role...</option>
                        {USER_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/80" htmlFor="waitlist-country">
                      Country <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <select
                        id="waitlist-country"
                        data-testid="select-waitlist-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full appearance-none pl-11 pr-10 py-3 rounded-xl bg-background/60 border border-border text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                      >
                        <option value="">Select country...</option>
                        {AFRICAN_COUNTRIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {errorMsg && (
                  <p data-testid="text-waitlist-error" className="text-sm text-destructive font-medium">
                    {errorMsg}
                  </p>
                )}

                <Button
                  type="submit"
                  data-testid="button-waitlist-submit"
                  disabled={isPending}
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-bold rounded-xl transition-all"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Joining...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Join the Waitlist
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  No spam, ever. Unsubscribe anytime.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans">
      <Navbar />
      <Hero />
      <Stats />
      <Modules />
      <Ecosystem />
      <DenaAI />
      <Pricing />
      <Gamification />
      <AfricaCoverage />
      <WaitlistCTA />
      <Footer />
    </div>
  );
}
