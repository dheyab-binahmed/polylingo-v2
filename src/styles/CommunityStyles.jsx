const CommunityStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    /* ── Reset & root ── */
    .plg-root * { box-sizing: border-box; }
    .plg-root {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg-page);
      min-height: 100vh;
      color: var(--text-base);
    }

    /* ── Main container ── */
    .plg-main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 28px 24px;
    }

    /* ── Buttons ── */
    .btn-coral {
      background: #6366f1; color: #fff; border: none; border-radius: 10px;
      padding: 9px 18px; font-weight: 600; cursor: pointer;
      font-family: inherit; font-size: 14px;
      display: inline-flex; align-items: center; gap: 7px; transition: all .2s;
      white-space: nowrap;
    }
    .btn-coral:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,.25); }
    .btn-coral:disabled { opacity: .45; pointer-events: none; }

    .btn-ghost {
      background: transparent; color: var(--text-muted); border: 1.5px solid var(--border);
      border-radius: 10px; padding: 8px 16px; font-weight: 500; cursor: pointer;
      font-family: inherit; font-size: 14px;
      display: inline-flex; align-items: center; gap: 7px; transition: all .2s;
      white-space: nowrap;
    }
    .btn-ghost:hover { border-color: #6366f1; color: #6366f1; background: #eef2ff; }

    /* ── Cards ── */
    .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; transition: all .25s; }
    .card:hover { border-color: #d1d5db; box-shadow: 0 4px 24px rgba(0,0,0,.07); }

    /* ── Form controls ── */
    .fc {
      width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 10px;
      font-family: inherit; font-size: 14px; color: var(--text-base);
      background: var(--bg-input); transition: border-color .2s;
    }
    .fc:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }

    .fc-area {
      width: 100%; padding: 13px; border: 1.5px solid var(--border); border-radius: 12px;
      font-family: inherit; font-size: 15px; resize: none;
      background: var(--bg-subtle); color: var(--text-base); transition: all .2s;
    }
    .fc-area:focus { outline: none; border-color: #6366f1; background: var(--bg-input); box-shadow: 0 0 0 3px rgba(99,102,241,.08); }

    .chat-fc {
      flex: 1; padding: 9px 13px; border: 1.5px solid var(--border); border-radius: 10px;
      font-family: inherit; font-size: 14px; resize: none;
      background: var(--bg-input); color: var(--text-base);
    }
    .chat-fc:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }

    /* ── Post actions ── */
    .pact {
      background: none; border: none; color: #6B7280;
      display: flex; align-items: center; gap: 6px;
      cursor: pointer; padding: 6px 10px; border-radius: 8px;
      font-family: inherit; font-size: 14px; font-weight: 500; transition: all .2s;
    }
    .pact:hover { background: #eef2ff; color: #6366f1; }
    .pact.liked { color: #6366f1; }

    /* ── Group tab buttons ── */
    .gtab {
      padding: 10px 14px; border: none; background: transparent;
      font-family: inherit; font-size: 14px; font-weight: 500;
      color: #6B7280; cursor: pointer; border-bottom: 2px solid transparent;
      display: flex; align-items: center; gap: 6px; white-space: nowrap; transition: all .2s;
      flex-shrink: 0;
    }
    .gtab:hover { color: #6366f1; }
    .gtab.active { color: #6366f1; border-bottom-color: #6366f1; font-weight: 700; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }

    /* ── Animations ── */
    @keyframes slideInRight { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in-up { animation: fadeInUp .3s ease; }

    /* ── Tags / pills ── */
    .tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .tag-green  { background: #D1FAE5; color: #065F46; }
    .tag-blue   { background: #DBEAFE; color: #1E40AF; }
    .tag-orange { background: #e0e7ff; color: #4338ca; }
    .tag-purple { background: #EDE9FE; color: #4C1D95; }

    /* ── Avatar ── */
    .ava { border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; flex-shrink: 0; }

    /* ── Modals ── */
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.48);
      display: flex; align-items: center; justify-content: center;
      z-index: 800; padding: 16px; backdrop-filter: blur(4px);
    }

    /* ── Create Group Modal ── */
    .create-group-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.48);
      display: flex; align-items: center; justify-content: center;
      z-index: 800; padding: 16px; backdrop-filter: blur(4px);
      overflow-y: auto;
    }
    .create-group-box {
      background: var(--bg-card);
      border-radius: 20px;
      padding: 28px;
      width: 100%;
      max-width: 500px;
      max-height: calc(100dvh - 32px);
      overflow-y: auto;
      animation: fadeInUp .3s ease;
      position: relative;
    }

    /* ── Group interface modal ── */
    .gi-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 900; padding: 16px; backdrop-filter: blur(5px);
    }
    .gi-box {
      background: var(--bg-card); border-radius: 20px;
      width: 100%; max-width: 1060px;
      height: 88vh; max-height: 92vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: fadeInUp .3s ease;
    }

    /* ── Chat ── */
    .chat-msgs { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; }
    .chat-msgs::-webkit-scrollbar { width: 4px; }
    .chat-msgs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    /* ── Sidebar (members in chat) ── */
    .chat-sidebar {
      width: 196px; border-right: 1px solid var(--border);
      background: var(--bg-subtle); display: flex; flex-direction: column; flex-shrink: 0;
    }

    /* ── Hero ── */
    .community-hero {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #1e3a5f 100%);
      border-radius: 24px; padding: 52px 40px;
      text-align: center; color: #fff;
      position: relative; overflow: hidden; margin-bottom: 28px;
    }

    /* ── Section header ── */
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; margin-bottom: 18px; flex-wrap: wrap;
    }
    .section-title {
      font-size: 18px; font-weight: 800; color: var(--text-base);
    }

    /* ── Partner grid ── */
    .partner-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 16px;
    }

    /* ── Filter bar ── */
    .filter-bar {
      display: flex; gap: 10px; margin-bottom: 20px;
      flex-wrap: wrap; align-items: center;
    }
    .filter-search {
      position: relative; flex: 1 1 200px; min-width: 160px;
    }

    /* ════════════════════════════════════════════
       RESPONSIVE
    ════════════════════════════════════════════ */

    /* ── Tablet ≤ 768px ── */
    @media (max-width: 768px) {
      .plg-main { padding: 16px 14px; }

      .community-hero { padding: 32px 20px; border-radius: 16px; margin-bottom: 20px; }

      .gi-overlay { padding: 0; align-items: flex-end; }
      .gi-box {
        border-radius: 20px 20px 0 0;
        height: 95dvh; max-height: 95dvh;
        max-width: 100vw;
      }

      .create-group-overlay { padding: 0; align-items: flex-end; }
      .create-group-box {
        border-radius: 20px 20px 0 0;
        max-width: 100vw;
        max-height: 95dvh;
        padding: 20px 16px;
      }

      .gtab { padding: 10px 10px; font-size: 13px; gap: 4px; }

      .partner-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }

      .section-title { font-size: 16px; }
      .chat-msgs { padding: 12px; }
    }

    /* ── Mobile ≤ 480px ── */
    @media (max-width: 480px) {
      .plg-main { padding: 12px 10px; }

      .community-hero { padding: 24px 16px; border-radius: 14px; margin-bottom: 16px; }
      .community-hero p { font-size: 14px; }

      /* Tabs — icon only, label hidden */
      .gtab { padding: 10px 8px; font-size: 18px; }
      .gtab-label { display: none; }

      /* Member sidebar hidden — use Members tab instead */
      .chat-sidebar { display: none !important; }

      /* Tighter buttons */
      .btn-coral { padding: 8px 14px; font-size: 13px; }
      .btn-ghost { padding: 7px 12px; font-size: 13px; }

      /* Partner grid: 2 columns */
      .partner-grid { grid-template-columns: 1fr 1fr; gap: 10px; }

      /* Filter bar: stack search full width */
      .filter-search { flex: 1 1 100%; }

      /* Overlay: no padding */
      .overlay { padding: 8px; }
      .create-group-overlay { padding: 0; }
      .gi-overlay { padding: 0; }

      .gi-box { border-radius: 0; height: 100dvh; max-height: 100dvh; }
      .create-group-box { border-radius: 0; max-height: 100dvh; padding: 16px 12px; }

      .section-header { gap: 8px; }
      .section-title { font-size: 15px; }
    }

    /* ── Very small ≤ 360px ── */
    @media (max-width: 360px) {
      .plg-main { padding: 10px 8px; }
      .partner-grid { grid-template-columns: 1fr; }
    }
  `}</style>
);

export default CommunityStyles;
