export function ClassicSerif() {
  return (
    <div style={{ width: 794, minHeight: 1123, fontFamily: "Georgia, 'Times New Roman', serif", background: "#fff", margin: "0 auto", padding: "52px 60px" }}>
      {/* CENTERED HEADER */}
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <h1 style={{ fontSize:28, fontWeight:700, color:"#1a1a1a", margin:"0 0 6px", letterSpacing:"1.5px" }}>AMARA OKAFOR</h1>
        <div style={{ fontSize:13, color:"#4b5563", letterSpacing:"0.5px", marginBottom:10 }}>Senior Product Manager</div>
        <div style={{ fontSize:11.5, color:"#6b7280", display:"flex", justifyContent:"center", gap:"0 20px", flexWrap:"wrap" }}>
          {["amara@example.com","  •  ","+234 801 234 5678","  •  ","Lagos, Nigeria","  •  ","linkedin.com/in/amara"].map((t,i)=><span key={i}>{t}</span>)}
        </div>
      </div>
      <div style={{ height:2, background:"#1a1a1a", marginBottom:20 }} />
      {/* SUMMARY */}
      <SectionC title="PROFESSIONAL SUMMARY">
        <p style={{ fontSize:12.5, lineHeight:1.85, color:"#374151", textAlign:"justify", margin:0 }}>Results-driven Product Manager with over six years of experience building digital products for African fintech markets. Demonstrated success in leading cross-functional teams to deliver flagship products serving more than two million users across twelve African countries. Recognized for translating complex technical requirements into compelling user experiences.</p>
      </SectionC>
      {/* EXPERIENCE */}
      <SectionC title="PROFESSIONAL EXPERIENCE">
        {[
          {company:"Flutterwave",role:"Senior Product Manager",location:"Lagos, Nigeria",period:"January 2021 – Present",pts:["Led the design and execution of the payments product roadmap across 12 African markets, contributing to a 40% increase in annual revenue.","Managed and mentored a team of 8 Product Managers, designers, and engineers within an Agile delivery framework.","Launched the Flutterwave API gateway, now serving over 200,000 developers globally."]},
          {company:"Paystack",role:"Product Manager",location:"Lagos, Nigeria",period:"March 2019 – December 2020",pts:["Scaled the merchant dashboard from beta to 50,000+ active businesses through user research and iterative design.","Achieved a 60% reduction in merchant onboarding time via targeted UX improvements and automated workflows.","Delivered a 3× increase in daily active merchant sessions through data-driven product decisions."]},
        ].map(e=>(
          <div key={e.company} style={{ marginBottom:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:2 }}>
              <span style={{ fontSize:13.5, fontWeight:700, color:"#1a1a1a" }}>{e.company}</span>
              <span style={{ fontSize:11, color:"#6b7280", fontStyle:"italic" }}>{e.period}</span>
            </div>
            <div style={{ fontSize:12.5, fontStyle:"italic", color:"#374151", marginBottom:6 }}>{e.role} · {e.location}</div>
            {e.pts.map(p=><div key={p} style={{ fontSize:12, color:"#374151", lineHeight:1.7, paddingLeft:18, position:"relative", marginBottom:4 }}><span style={{ position:"absolute", left:4, top:0 }}>·</span>{p}</div>)}
          </div>
        ))}
      </SectionC>
      {/* EDUCATION */}
      <SectionC title="EDUCATION">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:3 }}>
          <span style={{ fontSize:13.5, fontWeight:700, color:"#1a1a1a" }}>University of Lagos</span>
          <span style={{ fontSize:11, color:"#6b7280", fontStyle:"italic" }}>September 2011 – June 2015</span>
        </div>
        <div style={{ fontSize:12.5, fontStyle:"italic", color:"#374151" }}>Bachelor of Science in Computer Science · First Class Honours</div>
      </SectionC>
      {/* SKILLS */}
      <SectionC title="CORE COMPETENCIES">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 0" }}>
          {["Product Strategy & Roadmapping","Agile / Scrum Methodologies","Data Analysis & SQL","Stakeholder Management","User Research & Usability Testing","Figma & Prototyping","A/B Testing & Experimentation","Python (Intermediate)"].map(s=>(
            <div key={s} style={{ fontSize:12, color:"#374151", paddingLeft:14, position:"relative" }}><span style={{ position:"absolute", left:0 }}>–</span>{s}</div>
          ))}
        </div>
      </SectionC>
    </div>
  );
}

function SectionC({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:"2px", color:"#1a1a1a", textTransform:"uppercase", borderBottom:"1.5px solid #1a1a1a", paddingBottom:3, marginBottom:10, fontFamily:"'Helvetica Neue', Arial, sans-serif" }}>{title}</div>
      {children}
    </div>
  );
}
