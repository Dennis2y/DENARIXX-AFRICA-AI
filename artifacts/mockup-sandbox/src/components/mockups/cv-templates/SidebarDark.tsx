export function SidebarDark() {
  return (
    <div style={{ width: 794, minHeight: 1123, display: "flex", fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#fff", margin: "0 auto" }}>
      {/* LEFT SIDEBAR */}
      <div style={{ width: 260, background: "#1a1a2e", padding: "36px 24px", color: "#fff", flexShrink: 0 }}>
        <div style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg, #00E5FF, #7c3aed)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>AO</div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", textAlign: "center", lineHeight: 1.2 }}>Amara Okafor</h1>
        <div style={{ fontSize: 11, color: "#00E5FF", textAlign: "center", marginBottom: 20, fontWeight: 500 }}>Senior Product Manager</div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.15)", marginBottom: 16 }} />
        {/* Contact */}
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#00E5FF", marginBottom: 8, fontWeight: 700 }}>Contact</div>
        {[["✉", "amara@example.com"], ["📱", "+234 801 234 5678"], ["📍", "Lagos, Nigeria"], ["in", "linkedin.com/in/amara"]].map(([icon, text]) => (
          <div key={text} style={{ fontSize: 10.5, color: "#cbd5e1", marginBottom: 6, display: "flex", gap: 6, alignItems: "flex-start" }}>
            <span style={{ width: 14, flexShrink: 0 }}>{icon}</span><span style={{ wordBreak: "break-all" }}>{text}</span>
          </div>
        ))}
        <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "14px 0" }} />
        {/* Skills */}
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#00E5FF", marginBottom: 8, fontWeight: 700 }}>Skills</div>
        {["Product Strategy","Data Analysis","Agile / Scrum","SQL & Python","Figma & Prototyping","User Research","A/B Testing","Stakeholder Mgmt"].map(s => (
          <div key={s} style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 4 }}>• {s}</div>
        ))}
        <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "14px 0" }} />
        {/* Education */}
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#00E5FF", marginBottom: 8, fontWeight: 700 }}>Education</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", marginBottom: 2 }}>BSc Computer Science</div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 1 }}>University of Lagos</div>
        <div style={{ fontSize: 10, color: "#64748b" }}>2011 – 2015</div>
      </div>
      {/* RIGHT MAIN */}
      <div style={{ flex: 1, padding: "36px 32px" }}>
        {/* Summary */}
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#00E5FF", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 10, fontWeight: 700 }}>Professional Summary</div>
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "#334155", marginBottom: 20 }}>Results-driven Product Manager with 6+ years experience building digital products for African fintech markets. Led cross-functional teams to deliver 3 flagship products serving 2M+ users across 12 African countries.</p>
        {/* Experience */}
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#00E5FF", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 12, fontWeight: 700 }}>Work Experience</div>
        {[
          { company: "Flutterwave", role: "Senior Product Manager", period: "Jan 2021 – Present", bullets: ["Led payments product roadmap across 12 African markets, growing revenue by 40%","Managed a team of 8 PMs, designers, and engineers in an agile environment","Launched API gateway used by 200k+ developers"] },
          { company: "Paystack", role: "Product Manager", period: "Mar 2019 – Dec 2020", bullets: ["Built merchant dashboard from 0 to 50k+ active businesses","Reduced onboarding time by 60% via UX research and iteration","Drove 3x increase in daily active merchants"] },
        ].map(exp => (
          <div key={exp.company} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
              <div><span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{exp.company}</span> <span style={{ fontSize: 11, color: "#64748b" }}>— {exp.role}</span></div>
              <span style={{ fontSize: 10.5, color: "#94a3b8", whiteSpace: "nowrap", marginLeft: 8 }}>{exp.period}</span>
            </div>
            {exp.bullets.map(b => <div key={b} style={{ fontSize: 12, color: "#475569", marginBottom: 3, paddingLeft: 14, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "#00E5FF" }}>•</span>{b}</div>)}
          </div>
        ))}
        {/* Achievements */}
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#00E5FF", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 10, fontWeight: 700 }}>Achievements</div>
        {["Forbes Africa 30 Under 30 — Technology (2022)","Speaker at Africa Tech Summit, Kigali (2023)","Product of the Year — Paystack Dashboard (2020)"].map(a => (
          <div key={a} style={{ fontSize: 12, color: "#475569", marginBottom: 5, paddingLeft: 14, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "#00E5FF" }}>•</span>{a}</div>
        ))}
      </div>
    </div>
  );
}
