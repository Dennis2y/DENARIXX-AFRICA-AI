export function SidebarTeal() {
  return (
    <div style={{ width: 794, minHeight: 1123, display: "flex", fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", background: "#fff", margin: "0 auto" }}>
      {/* LEFT SIDEBAR */}
      <div style={{ width: 255, background: "#0f4c3a", padding: "36px 22px", color: "#fff", flexShrink: 0 }}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#10b981", border: "4px solid rgba(255,255,255,0.3)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff" }}>AO</div>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: "#fff", margin: "0 0 3px", textAlign: "center" }}>Amara Okafor</h1>
        <div style={{ fontSize: 11, color: "#6ee7b7", textAlign: "center", marginBottom: 18 }}>Senior Product Manager</div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", marginBottom: 14 }} />
        <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 2.5, color: "#6ee7b7", marginBottom: 7, fontWeight: 700 }}>Contact</div>
        {[["✉", "amara@example.com"],["📱","+234 801 234 5678"],["📍","Lagos, Nigeria"],["in","linkedin.com/in/amara"]].map(([i,t])=>(
          <div key={t} style={{ fontSize: 10, color: "#d1fae5", marginBottom: 5, display:"flex", gap:6 }}><span>{i}</span><span style={{wordBreak:"break-all"}}>{t}</span></div>
        ))}
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "12px 0" }} />
        <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 2.5, color: "#6ee7b7", marginBottom: 7, fontWeight: 700 }}>Skills</div>
        {["Product Strategy","Data Analysis","Agile / Scrum","SQL","Figma","User Research","A/B Testing","Python","Stakeholder Mgmt"].map(s=>(
          <div key={s} style={{ display:"inline-block", background:"rgba(16,185,129,0.25)", border:"1px solid rgba(110,231,183,0.3)", borderRadius:3, fontSize:9.5, color:"#d1fae5", padding:"2px 7px", margin:"2px 2px 2px 0" }}>{s}</div>
        ))}
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "12px 0" }} />
        <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 2.5, color: "#6ee7b7", marginBottom: 7, fontWeight: 700 }}>Education</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", marginBottom: 2 }}>BSc Computer Science</div>
        <div style={{ fontSize: 10, color: "#a7f3d0" }}>University of Lagos · 2015</div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", margin: "12px 0" }} />
        <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 2.5, color: "#6ee7b7", marginBottom: 7, fontWeight: 700 }}>Languages</div>
        {[["English","Native"],["Yoruba","Fluent"],["French","Intermediate"]].map(([l,p])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#d1fae5", marginBottom:4 }}><span>{l}</span><span style={{color:"#6ee7b7"}}>{p}</span></div>
        ))}
      </div>
      {/* RIGHT MAIN */}
      <div style={{ flex: 1, padding: "36px 30px" }}>
        <div style={{ fontSize: 9.5, textTransform:"uppercase", letterSpacing:2, color:"#0f4c3a", fontWeight:700, borderBottom:"2px solid #10b981", paddingBottom:4, marginBottom:10 }}>Summary</div>
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "#374151", marginBottom: 20 }}>Results-driven Product Manager with 6+ years experience building digital products for African fintech markets. Led cross-functional teams to deliver 3 flagship products serving 2M+ users across 12 African countries.</p>
        <div style={{ fontSize: 9.5, textTransform:"uppercase", letterSpacing:2, color:"#0f4c3a", fontWeight:700, borderBottom:"2px solid #10b981", paddingBottom:4, marginBottom:12 }}>Experience</div>
        {[
          {company:"Flutterwave",role:"Senior Product Manager",period:"2021 – Present",pts:["Led payments roadmap across 12 African markets, growing revenue 40%","Managed 8-person PM team in agile environment","Launched API gateway used by 200k+ developers"]},
          {company:"Paystack",role:"Product Manager",period:"2019 – 2021",pts:["Built merchant dashboard from 0 to 50k+ active businesses","Reduced onboarding time by 60%","Drove 3× increase in daily active merchants"]},
        ].map(e=>(
          <div key={e.company} style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
              <div><strong style={{ fontSize:13, color:"#111827" }}>{e.company}</strong> <span style={{ fontSize:11, color:"#6b7280" }}>· {e.role}</span></div>
              <span style={{ fontSize:10.5, color:"#9ca3af", whiteSpace:"nowrap", marginLeft:8 }}>{e.period}</span>
            </div>
            {e.pts.map(p=><div key={p} style={{ fontSize:12, color:"#4b5563", paddingLeft:12, marginBottom:3, position:"relative" }}><span style={{ position:"absolute", left:0, color:"#10b981", fontWeight:700 }}>›</span>{p}</div>)}
          </div>
        ))}
        <div style={{ fontSize: 9.5, textTransform:"uppercase", letterSpacing:2, color:"#0f4c3a", fontWeight:700, borderBottom:"2px solid #10b981", paddingBottom:4, marginBottom:10 }}>Certifications</div>
        {["Google Project Management Certificate (2023)","AWS Certified Cloud Practitioner (2022)","Pragmatic Product Management (2021)"].map(c=>(
          <div key={c} style={{ fontSize:12, color:"#4b5563", paddingLeft:12, marginBottom:5, position:"relative" }}><span style={{ position:"absolute", left:0, color:"#10b981", fontWeight:700 }}>›</span>{c}</div>
        ))}
      </div>
    </div>
  );
}
