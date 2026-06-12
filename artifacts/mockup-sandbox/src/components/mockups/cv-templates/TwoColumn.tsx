export function TwoColumn() {
  return (
    <div style={{ width: 794, minHeight: 1123, fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#fff", margin: "0 auto" }}>
      {/* FULL-WIDTH HEADER */}
      <div style={{ background: "#7c3aed", padding: "28px 40px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.5px" }}>Amara Okafor</h1>
            <div style={{ fontSize: 12.5, color: "#ddd6fe" }}>Senior Product Manager · Lagos, Nigeria</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 10.5, color: "#c4b5fd", lineHeight: 1.9 }}>
            <div>✉ amara@example.com</div>
            <div>📱 +234 801 234 5678</div>
            <div>🔗 linkedin.com/in/amara</div>
          </div>
        </div>
      </div>
      {/* SUMMARY BAR */}
      <div style={{ background: "#f5f3ff", borderBottom: "1px solid #ede9fe", padding: "12px 40px" }}>
        <p style={{ fontSize: 12, lineHeight: 1.65, color: "#4b5563", margin: 0 }}>Product Manager with 6+ years scaling African fintech products to 2M+ users. Expert in data-driven roadmapping, cross-functional leadership, and go-to-market strategy across 12 African markets.</p>
      </div>
      {/* TWO-COLUMN BODY */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 0 }}>
        {/* LEFT: Skills, Education, Achievements, Languages */}
        <div style={{ borderRight: "1px solid #f3f4f6", padding: "24px 24px 24px 40px", background: "#fafafa" }}>
          <TC2Section title="Skills" accent="#7c3aed">
            {["Product Strategy","Agile / Scrum","Data Analysis","SQL & Python","Figma","User Research","A/B Testing","OKR Setting","Go-to-Market","API Design"].map(s=>(
              <div key={s} style={{ fontSize:11, color:"#374151", paddingLeft:10, position:"relative", marginBottom:4 }}><span style={{ position:"absolute", left:0, color:"#7c3aed", fontWeight:700 }}>›</span>{s}</div>
            ))}
          </TC2Section>
          <TC2Section title="Education" accent="#7c3aed">
            <div style={{ fontSize:12, fontWeight:700, color:"#1e293b", marginBottom:2 }}>BSc Computer Science</div>
            <div style={{ fontSize:11, color:"#64748b" }}>University of Lagos</div>
            <div style={{ fontSize:10.5, color:"#94a3b8" }}>2011 – 2015 · First Class</div>
          </TC2Section>
          <TC2Section title="Achievements" accent="#7c3aed">
            {["Forbes Africa 30U30 — Tech '22","Africa Tech Summit Speaker '23","Product of the Year — Paystack '20"].map(a=>(
              <div key={a} style={{ fontSize:10.5, color:"#4b5563", marginBottom:5, paddingLeft:10, position:"relative" }}><span style={{ position:"absolute", left:0, color:"#7c3aed" }}>★</span>{a}</div>
            ))}
          </TC2Section>
          <TC2Section title="Languages" accent="#7c3aed">
            {[["English","Native"],["Yoruba","Fluent"],["French","Intermediate"]].map(([l,p])=>(
              <div key={l} style={{ fontSize:11, color:"#374151", marginBottom:4, display:"flex", justifyContent:"space-between" }}><span>{l}</span><span style={{ color:"#94a3b8", fontSize:10.5 }}>{p}</span></div>
            ))}
          </TC2Section>
        </div>
        {/* RIGHT: Experience */}
        <div style={{ padding: "24px 36px" }}>
          <TC2Section title="Work Experience" accent="#7c3aed">
            {[
              {company:"Flutterwave",role:"Senior Product Manager",period:"Jan 2021 – Present",pts:["Led payments product roadmap across 12 African markets, contributing to 40% annual revenue growth","Managed and mentored an 8-person cross-functional team of PMs, designers, and engineers","Launched the Flutterwave API Gateway, now serving over 200,000 developers globally"]},
              {company:"Paystack",role:"Product Manager",period:"Mar 2019 – Dec 2020",pts:["Scaled merchant dashboard from beta to 50,000+ active businesses through iterative UX design","Reduced merchant onboarding time by 60% via automated workflows and improved UX","Achieved 3× increase in daily active merchant logins through data-driven product decisions"]},
              {company:"Andela",role:"Associate Product Manager",period:"Jun 2017 – Feb 2019",pts:["Coordinated agile product sprints for B2B talent matching platform across East and West Africa","Managed stakeholder relationships across 6 African markets, bridging business and engineering"]},
            ].map(e=>(
              <div key={e.company} style={{ marginBottom:16, paddingBottom:14, borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:2 }}>
                  <div><span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>{e.company}</span><span style={{ fontSize:11, color:"#64748b", marginLeft:8 }}>· {e.role}</span></div>
                  <span style={{ fontSize:10.5, color:"#94a3b8", whiteSpace:"nowrap", marginLeft:8 }}>{e.period}</span>
                </div>
                {e.pts.map(p=><div key={p} style={{ fontSize:12, color:"#4b5563", paddingLeft:14, position:"relative", marginBottom:3 }}><span style={{ position:"absolute", left:0, color:"#7c3aed" }}>·</span>{p}</div>)}
              </div>
            ))}
          </TC2Section>
        </div>
      </div>
    </div>
  );
}

function TC2Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2.5, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}
