export function Compact() {
  return (
    <div style={{ width: 794, minHeight: 1123, fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#fff", margin: "0 auto" }}>
      {/* HEADER — very compact */}
      <div style={{ background:"#1d4ed8", padding:"18px 36px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:"#fff", margin:"0 0 2px", letterSpacing:"-0.5px" }}>Amara Okafor</h1>
          <div style={{ fontSize:11, color:"#bfdbfe" }}>Senior Product Manager</div>
        </div>
        <div style={{ textAlign:"right", fontSize:10, color:"#bfdbfe", lineHeight:1.9 }}>
          <div>amara@example.com</div>
          <div>+234 801 234 5678</div>
          <div>Lagos, Nigeria</div>
          <div>linkedin.com/in/amara</div>
        </div>
      </div>
      {/* BODY */}
      <div style={{ padding:"16px 36px" }}>
        {/* Skills grid */}
        <CompactSection title="Core Skills" color="#1d4ed8">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"3px 8px" }}>
            {["Product Strategy","Data Analysis","Agile / Scrum","SQL & Python","Figma","User Research","A/B Testing","Stakeholder Mgmt","Roadmapping","OKR Setting","API Design","Go-to-Market"].map(s=>(
              <div key={s} style={{ fontSize:10.5, color:"#374151", background:"#eff6ff", border:"1px solid #dbeafe", borderRadius:3, padding:"2px 6px", textAlign:"center" }}>{s}</div>
            ))}
          </div>
        </CompactSection>
        {/* Summary */}
        <CompactSection title="Summary" color="#1d4ed8">
          <p style={{ fontSize:11.5, lineHeight:1.65, color:"#374151", margin:0 }}>Product Manager with 6+ years scaling African fintech products. Led teams delivering 3 flagship products to 2M+ users. Expert at data-driven product decisions and cross-functional leadership across 12 African markets.</p>
        </CompactSection>
        {/* Experience */}
        <CompactSection title="Experience" color="#1d4ed8">
          {[
            {company:"Flutterwave",role:"Senior PM",period:"Jan 2021 – Present",pts:["Payments roadmap across 12 markets — +40% revenue","API gateway: 200k+ developer users","Led 8-person cross-functional team"]},
            {company:"Paystack",role:"Product Manager",period:"Mar 2019 – Dec 2020",pts:["Merchant dashboard: 0 → 50k+ active businesses","Onboarding time ↓60% via UX research","3× daily active merchant growth"]},
            {company:"Andela",role:"Associate PM",period:"Jun 2017 – Feb 2019",pts:["B2B talent platform sprints","Stakeholder management across 6 markets"]},
          ].map(e=>(
            <div key={e.company} style={{ marginBottom:10, paddingBottom:10, borderBottom:"1px solid #f1f5f9" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>{e.company} <span style={{ fontWeight:400, color:"#64748b", fontSize:10.5 }}>— {e.role}</span></span>
                <span style={{ fontSize:10, color:"#94a3b8", whiteSpace:"nowrap", marginLeft:6 }}>{e.period}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"2px 12px" }}>
                {e.pts.map(p=><div key={p} style={{ fontSize:10.5, color:"#4b5563", paddingLeft:10, position:"relative" }}><span style={{ position:"absolute", left:0, color:"#1d4ed8" }}>•</span>{p}</div>)}
              </div>
            </div>
          ))}
        </CompactSection>
        {/* Education & Achievements */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <CompactSection title="Education" color="#1d4ed8">
            <div style={{ fontSize:11.5, fontWeight:700, color:"#1e293b" }}>BSc Computer Science</div>
            <div style={{ fontSize:10.5, color:"#64748b" }}>University of Lagos · 2015 · First Class</div>
          </CompactSection>
          <CompactSection title="Achievements" color="#1d4ed8">
            {["Forbes Africa 30U30 — Tech (2022)","Africa Tech Summit Speaker (2023)","Product of the Year — Paystack (2020)"].map(a=>(
              <div key={a} style={{ fontSize:10.5, color:"#4b5563", marginBottom:3 }}>• {a}</div>
            ))}
          </CompactSection>
        </div>
        {/* Languages */}
        <CompactSection title="Languages" color="#1d4ed8">
          <div style={{ display:"flex", gap:12 }}>
            {[["English","Native"],["Yoruba","Fluent"],["French","Intermediate"]].map(([l,p])=>(
              <span key={l} style={{ fontSize:10.5, color:"#374151" }}>{l} <span style={{ color:"#94a3b8" }}>({p})</span></span>
            ))}
          </div>
        </CompactSection>
      </div>
    </div>
  );
}

function CompactSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:2.5, color, fontWeight:800, borderBottom:`1.5px solid ${color}`, paddingBottom:3, marginBottom:7, display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ display:"inline-block", width:6, height:6, background:color, borderRadius:1 }} />{title}
      </div>
      {children}
    </div>
  );
}
