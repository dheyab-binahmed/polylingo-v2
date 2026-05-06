const Section = ({ title, action, children }) => (
  <div style={{
    background:"var(--bg-card)", border:"1.5px solid var(--border)", borderRadius:20,
    padding:"24px 26px", marginBottom:24,
    boxShadow:"0 2px 12px rgba(0,0,0,.04)",
  }}>
    <div style={{
      display:"flex", justifyContent:"space-between", alignItems:"center",
      marginBottom:20, paddingBottom:16, borderBottom:"1px solid var(--border)",
    }}>
      <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:"var(--text-base)" }}>{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

export default Section;
