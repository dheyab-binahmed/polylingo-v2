// Generates a shareable CEFR certificate and opens it in a print window so the
// learner can "Save as PDF" (or print). No external library required.
const CEFR_DESC = {
  A1: "Beginner", A2: "Elementary", B1: "Intermediate",
  B2: "Upper Intermediate", C1: "Advanced", C2: "Proficient",
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function certificateHTML({ cefr, language, name, date }) {
  const d = (date instanceof Date ? date : new Date(date || Date.now()))
    .toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const desc = CEFR_DESC[cefr] || "";
  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>FluentPeak Certificate — ${esc(language)} ${esc(cefr)}</title>
<style>
  @page { size: 1123px 794px; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html,body { height: 100%; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #eef0fb;
         display: flex; align-items: center; justify-content: center; padding: 24px; }
  .cert { width: 1075px; height: 760px; background: #ffffff; position: relative;
          border: 2px solid #6366f1; border-radius: 14px; overflow: hidden;
          box-shadow: 0 20px 50px rgba(79,70,229,0.18); }
  .cert::before { content: ""; position: absolute; inset: 14px; border: 2px solid #c7cbf5; border-radius: 8px; }
  .inner { position: absolute; inset: 0; display: flex; flex-direction: column;
           align-items: center; justify-content: center; text-align: center; padding: 70px; }
  .brand { color: #4f46e5; font-size: 30px; font-weight: 700; letter-spacing: 1px; }
  .brand span { font-family: Arial, sans-serif; }
  .kicker { margin-top: 28px; text-transform: uppercase; letter-spacing: 4px;
            color: #6b7280; font-size: 15px; font-family: Arial, sans-serif; }
  .title { margin-top: 10px; font-size: 40px; color: #1f2430; font-weight: 700; }
  .name { margin-top: 30px; font-size: 38px; color: #4f46e5; font-style: italic;
          border-bottom: 2px solid #e5e7fb; padding: 0 40px 12px; }
  .line { margin-top: 26px; font-size: 19px; color: #374151; line-height: 1.6; }
  .badge { margin: 26px auto 0; width: 150px; height: 150px; border-radius: 50%;
           background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff;
           display: flex; flex-direction: column; align-items: center; justify-content: center;
           box-shadow: 0 10px 24px rgba(99,102,241,0.4); }
  .badge .lvl { font-size: 54px; font-weight: 800; font-family: Arial, sans-serif; line-height: 1; }
  .badge .desc { font-size: 13px; margin-top: 4px; font-family: Arial, sans-serif; letter-spacing: 1px; }
  .foot { position: absolute; bottom: 60px; left: 0; right: 0; display: flex;
          justify-content: space-between; padding: 0 110px; font-family: Arial, sans-serif; }
  .foot .blk { text-align: center; color: #374151; font-size: 14px; }
  .foot .val { border-top: 1.5px solid #9ca3af; padding-top: 8px; min-width: 220px; color:#111827; }
  .note { position: absolute; bottom: 28px; left: 0; right: 0; text-align: center;
          color: #9ca3af; font-size: 11px; font-family: Arial, sans-serif; }
  @media print { body { background: #fff; padding: 0; } .cert { box-shadow: none; } }
</style></head>
<body>
  <div class="cert"><div class="inner">
    <div class="brand">Poly<span>Lingo</span></div>
    <div class="kicker">Certificate of Achievement</div>
    <div class="title">${esc(language)} Proficiency</div>
    <div class="name">${esc(name)}</div>
    <div class="line">has completed the FluentPeak CEFR assessment and achieved</div>
    <div class="badge"><div class="lvl">${esc(cefr)}</div><div class="desc">${esc(desc).toUpperCase()}</div></div>
    <div class="foot">
      <div class="blk"><div class="val">${esc(d)}</div>Date</div>
      <div class="blk"><div class="val">FluentPeak</div>Issued by</div>
    </div>
    <div class="note">CEFR-aligned self-assessment estimate — not an official CEFR certification.</div>
  </div></div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };</script>
</body></html>`;
}

export function downloadCertificate(opts) {
  try {
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups to download your certificate."); return; }
    w.document.open();
    w.document.write(certificateHTML(opts));
    w.document.close();
  } catch (e) {
    console.error("[certificate] failed:", e);
  }
}
