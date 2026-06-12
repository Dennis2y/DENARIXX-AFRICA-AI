export function Minimal() {
  return (
    <div style={{ width: 794, minHeight: 1123, fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#fff", margin: "0 auto", padding: "60px 64px" }}>
      {/* GIANT NAME */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 38, fontWeight: 900, color: "#111827", letterSpacing: "-1.5px", lineHeight: 1.1 }}>Amara Okafor</div>
      </div>
      <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 300, marginBottom: 20, letterSpacing: "0.5px" }}>Senior Product Manager</div>
      {/* Contact inline */}
      <div style={{ fontSize: 11, color: "#9ca3af", display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
        {["amara@example.com","+234 801 234 5678","Lagos, Nigeria","linkedin.com/in/amara"].map(t=><span key={t}>{t}</span>)}
      </div>
      <div style={{ height: 1, background: "#111827", marginBottom: 32 }} />
      {/* SUMMARY */}
      <div style={{ display:"flex", gap:48, marginBottom:32 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:3, color:"#111827", width:120, flexShrink:0, paddingTop:2 }}>Profile</div>
        <p style={{ fontSize:13, lineHeight:1.85, color:"#4b5563", margin:0, flex:1 }}>Results-driven Product Manager with 6+ years experience building digital products for African fintech markets. Led cross-functional teams to deliver 3 flagship products serving 2M+ users. Expert at translating complexity into elegant, user-centered solutions.</p>
      </div>
      <div style={{ height:1, background:"#e5e7eb", marginBottom:28 }} />
      {/* EXPERIENCE */}
      <div style={{ display:"flex", gap:48, marginBottom:28 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:3, color:"#111827", width:120, flexShrink:0, paddingTop:2 }}>Experience</div>
        <div style={{ flex:1 }}>
          {[
            {company:"Flutterwave",role:"Senior Product Manager",period:"2021 – Present",pts:["Led payments roadmap across 12 markets, +40% revenue","Managed 8-person cross-functional team","Launched API gateway for 200k+ developers"]},
            {company:"Paystack",role:"Product Manager",period:"2019 – 2021",pts:["Scaled merchant dashboard to 50k+ businesses","Reduced onboarding time by 60%","3× daily active merchant growth"]},
            {company:"Andela",role:"Associate PM",period:"2017 – 2019",pts:["B2B talent platform product sprints","Pan-African stakeholder management"]},
          ].map(e=>(
            <div key={e.company} style={{ marginBottom:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <div><span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>{e.company}</span><span style={{ fontSize:12, color:"#9ca3af", marginLeft:8 }}>{e.role}</span></div>
                <span style={{ fontSize:11, color:"#d1d5db" }}>{e.period}</span>
              </div>
              {e.pts.map(p=><div key={p} style={{ fontSize:12, color:"#6b7280", marginBottom:3, paddingLeft:12, position:"relative" }}><span style={{ position:"absolute", left:0, color:"#d1d5db" }}>—</span>{p}</div>)}
            </div>
          ))}
        </div>
      </div>
      <div style={{ height:1, background:"#e5e7eb", marginBottom:28 }} />
      {/* SKILLS */}
      <div style={{ display:"flex", gap:48, marginBottom:28 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:3, color:"#111827", width:120, flexShrink:0, paddingTop:2 }}>Skills</div>
        <div style={{ flex:1, display:"flex", flexWrap:"wrap", gap:"6px 16px" }}>
          {["Product Strategy","Data Analysis","Agile / Scrum","SQL","Python","Figma","User Research","A/B Testing","OKRs","Go-to-Market"].map(s=>(
            <span key={s} style={{ fontSize:12, color:"#6b7280" }}>{s}</span>
          ))}
        </div>
      </div>
      <div style={{ height:1, background:"#e5e7eb", marginBottom:28 }} />
      {/* EDUCATION */}
      <div style={{ display:"flex", gap:48 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:3, color:"#111827", width:120, flexShrink:0, paddingTop:2 }}>Education</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#111827" }}>BSc Computer Science</div>
          <div style={{ fontSize:12, color:"#9ca3af" }}>University of Lagos · 2015 · First Class Honours</div>
        </div>
      </div>
    </div>
  );
}
