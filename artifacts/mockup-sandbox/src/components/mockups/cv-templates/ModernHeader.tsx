export function ModernHeader() {
  return (
    <div style={{ width: 794, minHeight: 1123, fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#fff", margin: "0 auto" }}>
      {/* HEADER */}
      <div style={{ background: "#0f172a", padding: "32px 44px 24px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.5px" }}>Amara Okafor</h1>
            <div style={{ fontSize: 14, color: "#00E5FF", fontWeight: 500, marginBottom: 16 }}>Senior Product Manager</div>
          </div>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: "linear-gradient(135deg,#00E5FF,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800, color:"#fff", flexShrink:0 }}>AO</div>
        </div>
        {/* Contact bar */}
        <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
          {[["✉ ","amara@example.com"],["📱 ","+234 801 234 5678"],["📍 ","Lagos, Nigeria"],["🔗 ","linkedin.com/in/amara"]].map(([i,t])=>(
            <span key={t} style={{ fontSize:11, color:"#94a3b8" }}><span style={{color:"#00E5FF"}}>{i}</span>{t}</span>
          ))}
        </div>
      </div>
      {/* SKILLS BAR */}
      <div style={{ background:"#1e293b", padding:"10px 44px", display:"flex", gap:8, flexWrap:"wrap" }}>
        {["Product Strategy","Data Analysis","Agile / Scrum","SQL","Figma","User Research","A/B Testing","Python"].map(s=>(
          <span key={s} style={{ fontSize:10, color:"#e2e8f0", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:3, padding:"2px 8px" }}>{s}</span>
        ))}
      </div>
      {/* BODY */}
      <div style={{ padding:"28px 44px" }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:9.5, textTransform:"uppercase", letterSpacing:2.5, color:"#0f172a", fontWeight:800, borderBottom:"2px solid #0f172a", paddingBottom:4, marginBottom:10 }}>Professional Summary</div>
          <p style={{ fontSize:13, lineHeight:1.75, color:"#374151" }}>Results-driven Product Manager with 6+ years experience building digital products for African fintech markets. Led cross-functional teams to deliver 3 flagship products serving 2M+ users across 12 African countries. Expert at bridging technical complexity with user-centered design.</p>
        </div>
        <div style={{ fontSize:9.5, textTransform:"uppercase", letterSpacing:2.5, color:"#0f172a", fontWeight:800, borderBottom:"2px solid #0f172a", paddingBottom:4, marginBottom:12 }}>Work Experience</div>
        {[
          {company:"Flutterwave",role:"Senior Product Manager",location:"Lagos, Nigeria",period:"Jan 2021 – Present",pts:["Led payments product roadmap across 12 African markets, growing revenue by 40%","Managed a cross-functional team of 8 PMs, designers, and engineers","Launched API gateway used by 200k+ developers globally"]},
          {company:"Paystack",role:"Product Manager",location:"Lagos, Nigeria",period:"Mar 2019 – Dec 2020",pts:["Built merchant dashboard from 0 to 50k+ active businesses","Reduced onboarding time by 60% through UX research and rapid iteration","Drove 3× increase in daily active merchant logins"]},
        ].map(e=>(
          <div key={e.company} style={{ marginBottom:18, paddingLeft:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:3 }}>
              <div>
                <span style={{ fontSize:14, fontWeight:800, color:"#1e293b" }}>{e.company}</span>
                <span style={{ fontSize:12, color:"#64748b", marginLeft:8 }}>· {e.role}</span>
              </div>
              <span style={{ fontSize:11, color:"#94a3b8", whiteSpace:"nowrap", marginLeft:12 }}>{e.period}</span>
            </div>
            <div style={{ fontSize:10.5, color:"#94a3b8", marginBottom:5 }}>{e.location}</div>
            {e.pts.map(p=><div key={p} style={{ fontSize:12.5, color:"#4b5563", marginBottom:4, paddingLeft:16, position:"relative" }}><span style={{ position:"absolute", left:0, color:"#0f172a", fontWeight:700 }}>–</span>{p}</div>)}
          </div>
        ))}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, marginTop:8 }}>
          <div>
            <div style={{ fontSize:9.5, textTransform:"uppercase", letterSpacing:2.5, color:"#0f172a", fontWeight:800, borderBottom:"2px solid #0f172a", paddingBottom:4, marginBottom:10 }}>Education</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>BSc Computer Science</div>
            <div style={{ fontSize:11.5, color:"#64748b" }}>University of Lagos</div>
            <div style={{ fontSize:11, color:"#94a3b8" }}>2011 – 2015 · First Class Honours</div>
          </div>
          <div>
            <div style={{ fontSize:9.5, textTransform:"uppercase", letterSpacing:2.5, color:"#0f172a", fontWeight:800, borderBottom:"2px solid #0f172a", paddingBottom:4, marginBottom:10 }}>Achievements</div>
            {["Forbes Africa 30 Under 30 — Tech (2022)","Speaker, Africa Tech Summit (2023)","Product of the Year — Paystack (2020)"].map(a=>(
              <div key={a} style={{ fontSize:12, color:"#4b5563", marginBottom:5 }}>· {a}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
