import { useEffect, useState } from "react";
import { fetchMyAchievements } from "../services/api";
import { useAuth } from "../context/AuthContext";

// Polls the user's earned achievements and shows a toast for any that are new
// since the last time we checked (snapshot kept in localStorage). The backend
// awards achievements silently via check_and_award; this surfaces them.
export default function AchievementToaster() {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!user) return;
    const snapKey = `polylingo_ach_seen_${user.id || "guest"}`;
    let stopped = false;

    async function check() {
      const res = await fetchMyAchievements();
      const earned = res?.achievements || [];
      let seen = [];
      try { seen = JSON.parse(localStorage.getItem(snapKey)) || []; } catch (_) { seen = []; }
      const seenSet = new Set(seen);
      const fresh = earned.filter((a) => !seenSet.has(a.id));
      if (!stopped && fresh.length && seen.length >= 0) {
        // Only toast when we already had a snapshot (avoids a flood on first login).
        if (localStorage.getItem(snapKey) !== null) {
          setToasts((t) => [...t, ...fresh.map((a) => ({ ...a, _k: a.id + Date.now() }))]);
          fresh.forEach((a, i) => setTimeout(() => dismiss(a.id + Date.now()), 6000 + i * 400));
        }
      }
      try { localStorage.setItem(snapKey, JSON.stringify(earned.map((a) => a.id))); } catch (_) {}
    }

    const dismiss = (k) => setToasts((t) => t.filter((x) => x._k !== k));
    check();
    const iv = setInterval(check, 60000); // re-check each minute while mounted
    return () => { stopped = true; clearInterval(iv); };
  }, [user]);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 9999, display: "flex", flexDirection: "column", gap: "0.6rem", maxWidth: 340 }}>
      {toasts.map((a) => (
        <div key={a._k}
          onClick={() => setToasts((t) => t.filter((x) => x._k !== a._k))}
          style={{
            display: "flex", alignItems: "center", gap: "0.85rem", cursor: "pointer",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
            borderRadius: 14, padding: "0.85rem 1rem", boxShadow: "0 10px 30px rgba(99,102,241,0.45)",
            animation: "fadeInUp 0.35s ease",
          }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="fas fa-trophy" style={{ fontSize: "1.1rem" }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Achievement unlocked!</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.95 }}>{a.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
