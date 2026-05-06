const Hero = ({ onCreateGroup, onFindPartners }) => (
  <div style={{
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #1e3a5f 100%)",
    borderRadius: 24, padding: "52px 40px", textAlign: "center", color: "#fff",
    position: "relative", overflow: "hidden", marginBottom: 28,
  }}>
    <div style={{ position:"absolute", top:-80, right:-80, width:320, height:320, background:"rgba(99,102,241,0.25)", borderRadius:"50%", filter:"blur(60px)", pointerEvents:"none" }} />
    <div style={{ position:"absolute", bottom:-80, left:-50, width:260, height:260, background:"rgba(16,185,129,0.15)", borderRadius:"50%", filter:"blur(60px)", pointerEvents:"none" }} />

    <div style={{ position:"relative", zIndex:1 }}>
      <span style={{
        display:"inline-flex", alignItems:"center", gap:6,
        background:"rgba(165,180,252,0.15)", color:"#a5b4fc",
        padding:"5px 16px", borderRadius:20, fontSize:13, fontWeight:600,
        marginBottom:18, border:"1px solid rgba(165,180,252,0.25)",
      }}>
        🌍 PolyLingo Community
      </span>
      <h1 style={{
        fontSize:"clamp(2rem,5vw,2.8rem)", fontWeight:900,
        margin:"0 0 14px", lineHeight:1.1, letterSpacing:"-1px",
        background:"linear-gradient(135deg,#fff 0%,#a5b4fc 100%)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
      }}>
        Connect &amp; Grow<br />
        <span style={{ WebkitTextFillColor:"#818cf8" }}>Together</span>
      </h1>
      <p style={{ fontSize:16, color:"rgba(255,255,255,0.72)", maxWidth:480, margin:"0 auto 28px", lineHeight:1.7 }}>
        Join thousands of language learners. Share insights, find partners, and accelerate your learning journey.
      </p>
      <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
        <button className="btn-coral" onClick={onCreateGroup} style={{ padding:"11px 24px", fontSize:15 }}>
          ＋ Create Group
        </button>
        <button onClick={onFindPartners} style={{
          background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.25)",
          color:"#fff", padding:"11px 24px", fontSize:15, borderRadius:10,
          cursor:"pointer", fontFamily:"inherit", fontWeight:600, transition:"all .2s",
          backdropFilter:"blur(4px)",
        }}
        onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.18)"}
        onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.1)"}
        >🤝 Find Partners</button>
      </div>
    </div>
  </div>
);

export default Hero;
