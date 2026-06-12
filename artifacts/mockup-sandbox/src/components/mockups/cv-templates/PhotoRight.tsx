export function PhotoRight() {
  return (
    <div style={{ width: 794, minHeight: 1123, fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#fff", margin: "0 auto", padding: "44px 48px" }}>
      {/* HEADER with photo right */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:32, fontWeight:900, color:"#1e293b", margin:"0 0 6px", letterSpacing:"-1px" }}>Amara Okafor</h1>
          <div style={{ fontSize:15, color:"#3b82f6", fontWeight:600, marginBottom:14 }}>Senior Product Manager</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 20px" }}>
            {[["✉","amara@example.com"],["📱","+234 801 234 5678"],["📍","Lagos, Nigeria"],["🔗","linkedin.com/in/amara"]].map(([i,t])=>(
              <span key={t} style={{ fontSize:11.5, color:"#64748b", display:"flex", gap:4, alignItems:"center" }}><span style={{color:"#3b82f6"}}>{i}</span>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ width:100, height:100, borderRadius:"50%", background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:800, color:"#fff", flexShrink:0, marginLeft:28, border:"4px solid #e2e8f0" }}>AO</div>
      </div>
      {/* ACCENT LINE */}
      <div style={{ height:3, background:"linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899)", borderRadius:2, marginBottom:24 }} />
      {/* SUMMARY */}
      <Section title="Summary" accent="#3b82f6">
        <p style={{ fontSize:13, lineHeight:1.75, color:"#374151", margin:0 }}>Results-driven Product Manager with 6+ years experience building digital products for African fintech markets. Led cross-functional teams delivering 3 flagship products to 2M+ users across 12 countries.</p>
      </Section>
      {/* EXPERIENCE */}
      <Section title="Experience" accent="#3b82f6">
        {[
          {company:"Flutterwave",role:"Senior Product Manager",period:"Jan 2021 – Present",pts:["Led payments product roadmap, growing revenue 40%","Managed 8-person cross-functional team","Launched API gateway for 200k+ developers"]},
          {company:"Paystack",role:"Product Manager",period:"Mar 2019 – Dec 2020",pts:["Built merchant dashboard serving 50k+ businesses","Cut onboarding time by 60% via UX iteration","3× increase in daily active merchants"]},
          {company:"Andela",role:"Associate PM",period:"Jun 2017 – Feb 2019",pts:["Coordinated product sprints for B2B talent platform","Managed stakeholder communication across 6 African markets"]},
        ].map(e=>(
          <div key={e.company} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
              <span style={{ fontSize:13.5, fontWeight:700, color:"#1e293b" }}>{e.company} <span style={{ fontWeight:400, color:"#64748b", fontSize:12 }}>· {e.role}</span></span>
              <span style={{ fontSize:11, color:"#94a3b8", whiteSpace:"nowrap", marginLeft:10 }}>{e.period}</span>
            </div>
            {e.pts.map(p=><div key={p} style={{ fontSize:12, color:"#4b5563", paddingLeft:14, position:"relative", marginBottom:2 }}><span style={{ position:"absolute", left:0, color:"#3b82f6" }}>›</span>{p}</div>)}
          </div>
        ))}
      </Section>
      {/* BOTTOM TWO-COL */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:28, marginTop:4 }}>
        <div>
          <Section title="Education" accent="#3b82f6">
            <div style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>BSc Computer Science</div>
            <div style={{ fontSize:12, color:"#64748b" }}>University of Lagos</div>
            <div style={{ fontSize:11, color:"#94a3b8" }}>2011 – 2015 · First Class</div>
          </Section>
        </div>
        <div>
          <Section title="Skills" accent="#3b82f6">
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {["Product Strategy","Data Analysis","Agile","SQL","Figma","User Research","Python","A/B Testing"].map(s=>(
                <span key={s} style={{ fontSize:10.5, background:"#eff6ff", color:"#2563eb", border:"1px solid #bfdbfe", borderRadius:4, padding:"2px 7px" }}>{s}</span>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <span style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:2.5, color:accent }}>{title}</span>
        <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
      </div>
      {children}
    </div>
  );
}
