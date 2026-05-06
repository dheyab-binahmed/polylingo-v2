import { useState } from "react";

// ── BACKEND INTEGRATION ──────────────────────────────────────────────────────
// List   : GET    /api/community/groups/:id/events
// Create : POST   /api/community/groups/:id/events  { title, date, time, description, type }
// Join   : POST   /api/community/events/:id/join    { userId }
// Leave  : DELETE /api/community/events/:id/join    { userId }
// Delete : DELETE /api/community/events/:id
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: "video",       label: "📹 Video Call",       desc: "Group video session"         },
  { value: "practice",    label: "✍️ Practice Session",  desc: "Writing or grammar drill"    },
  { value: "conversation",label: "💬 Conversation Club", desc: "Free conversation practice"  },
  { value: "study",       label: "📚 Study Session",     desc: "Reading or vocabulary"       },
];

const EventsTab = ({ group, notify, onStartCall }) => {
  const [events,     setEvents]     = useState(group.events || []);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form,       setForm]       = useState({ title: "", date: "", time: "", description: "", type: "video" });

  const setField = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const formValid = form.title.trim() && form.date && form.time;

  const handleCreate = e => {
    e.preventDefault();
    if (!formValid) return;
    setSubmitting(true);
    // BACKEND INTEGRATION: POST /api/community/groups/:id/events  { ...form }
    const newEvent = {
      id: Date.now(),
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      description: form.description.trim(),
      type: form.type,
      participants: 1,
      joined: true,
    };
    setTimeout(() => {
      setEvents(ev => [...ev, newEvent]);
      setForm({ title: "", date: "", time: "", description: "", type: "video" });
      setShowForm(false);
      setSubmitting(false);
      notify(`Event "${newEvent.title}" created! 📅`, "success");
    }, 400);
  };

  const toggleJoin = eventId => {
    // BACKEND INTEGRATION: POST /api/community/events/:id/join  (DELETE to leave)
    const ev = events.find(e => e.id === eventId);
    setEvents(evs => evs.map(e =>
      e.id === eventId
        ? { ...e, joined: !e.joined, participants: e.joined ? e.participants - 1 : e.participants + 1 }
        : e
    ));
    notify(ev?.joined ? "Left event." : "Joined event! 🎉", ev?.joined ? "info" : "success");
  };

  const deleteEvent = eventId => {
    // BACKEND INTEGRATION: DELETE /api/community/events/:id
    setEvents(evs => evs.filter(e => e.id !== eventId));
    notify("Event removed.", "info");
  };

  const startEventCall = ev => {
    // Navigates to video room for this event
    // BACKEND INTEGRATION: POST /api/community/events/:id/start  → create call room
    notify(`Opening video room for "${ev.title}"… 📹`, "info");
    onStartCall?.();
  };

  // Human-friendly date
  const fmtDate = d => {
    if (!d) return "";
    try {
      return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    } catch { return d; }
  };

  const isToday = d => {
    if (!d) return false;
    const today = new Date(); const ev = new Date(d + "T00:00:00");
    return today.toDateString() === ev.toDateString();
  };

  const isPast = d => {
    if (!d) return false;
    return new Date(d + "T00:00:00") < new Date(new Date().toDateString());
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-base)" }}>Events ({events.length})</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Practice sessions & meetings</div>
        </div>
        <button className="btn-coral" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => setShowForm(s => !s)}>
          {showForm ? "✕ Cancel" : "➕ Create Event"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-base)", marginBottom: 12 }}>New Event</div>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="fc" placeholder="Event title *" value={form.title} onChange={setField("title")} required style={{ padding: "8px 12px", fontSize: 13 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input className="fc" type="date" value={form.date} onChange={setField("date")} required style={{ flex: 1, padding: "8px 12px", fontSize: 13 }} />
              <input className="fc" type="time" value={form.time} onChange={setField("time")} required style={{ flex: 1, padding: "8px 12px", fontSize: 13 }} />
            </div>
            {/* Event type selector */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Type</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {EVENT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setForm(p => ({ ...p, type: t.value }))}
                    style={{ padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1.5px solid", borderColor: form.type === t.value ? "#6366f1" : "var(--border)", background: form.type === t.value ? "#6366f1" : "var(--bg-card)", color: form.type === t.value ? "#fff" : "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea className="fc" placeholder="Description (optional)" value={form.description} onChange={setField("description")} rows={2} style={{ resize: "vertical", padding: "8px 12px", fontSize: 13 }} />
            <button type="submit" className="btn-coral" disabled={!formValid || submitting} style={{ width: "100%", justifyContent: "center", padding: "9px 0" }}>
              {submitting ? "Creating…" : "📅 Create Event"}
            </button>
          </form>
        </div>
      )}

      {/* Events list */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        {/* BACKEND INTEGRATION: GET /api/community/groups/:id/events */}
        {events.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
            <div style={{ fontWeight: 600 }}>No events yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Create a session to practice together</div>
          </div>
        ) : events.map(ev => {
          const today = isToday(ev.date);
          const past  = isPast(ev.date);
          const type  = EVENT_TYPES.find(t => t.value === ev.type) || EVENT_TYPES[0];
          return (
            <div key={ev.id} style={{ background: "var(--bg-subtle)", borderLeft: `4px solid ${past ? "#9ca3af" : group.color}`, borderRadius: "0 12px 12px 0", padding: 16, marginBottom: 12, opacity: past ? 0.65 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  {/* Date + Today badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>📅 {fmtDate(ev.date)} · 🕐 {ev.time}</span>
                    {today && <span style={{ background: "#22c55e", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>TODAY</span>}
                    {past  && <span style={{ background: "#6b7280", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>PAST</span>}
                  </div>
                  {/* Type pill */}
                  <div style={{ display: "inline-block", background: group.color + "22", color: group.color, fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, marginBottom: 6 }}>{type.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-base)", marginBottom: 3 }}>{ev.title}</div>
                  {ev.description && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{ev.description}</div>}
                </div>
                <button onClick={() => deleteEvent(ev.id)} title="Remove event"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "2px 4px", flexShrink: 0 }}>🗑</button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>👥 {ev.participants} joined</span>
                <div style={{ display: "flex", gap: 7 }}>
                  {/* Start call — only for video-type events or today's events */}
                  {(ev.type === "video" || today) && !past && (
                    <button className="btn-ghost" style={{ padding: "6px 13px", fontSize: 12, borderColor: "#22c55e", color: "#22c55e" }} onClick={() => startEventCall(ev)}>
                      📹 Start Call
                    </button>
                  )}
                  {/* Join / Leave */}
                  <button
                    className={ev.joined ? "btn-ghost" : "btn-coral"}
                    style={{ padding: "6px 14px", fontSize: 12 }}
                    onClick={() => toggleJoin(ev.id)}
                    disabled={past}
                  >
                    {ev.joined ? "✓ Joined · Leave" : "+ Join"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventsTab;
