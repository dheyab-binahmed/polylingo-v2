import { useState, useRef } from "react";

const LANGUAGES = ["Multiple", "Spanish", "English", "French", "German", "Japanese", "Korean", "Chinese", "Arabic", "Portuguese", "Russian", "Italian"];

const PostForm = ({ onPost }) => {
  const [content,      setContent]      = useState("");
  const [language,     setLanguage]     = useState("Multiple");
  const [photoMode,    setPhotoMode]    = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile,    setPhotoFile]    = useState(null);
  const [tagMode,      setTagMode]      = useState(false);
  const [tagInput,     setTagInput]     = useState("");
  const [tags,         setTags]         = useState([]);
  const [pollMode,     setPollMode]     = useState(false);
  const [pollOptions,  setPollOptions]  = useState(["", ""]);
  const [submitting,   setSubmitting]   = useState(false);
  const fileRef = useRef(null);

  const valid = content.trim().length >= 10;

  const handlePhotoClick = () => {
    if (photoMode) { setPhotoPreview(null); setPhotoFile(null); setPhotoMode(false); return; }
    fileRef.current?.click();
  };
  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoFile(file);
    setPhotoMode(true);
    setPollMode(false);
    // BACKEND INTEGRATION: store file — send as FormData with post submission
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (t && !tags.includes(t) && tags.length < 5) setTags(ts => [...ts, t]);
    setTagInput("");
  };
  const removeTag = t => setTags(ts => ts.filter(x => x !== t));

  const setPollOption    = (i, val) => setPollOptions(opts => opts.map((o, idx) => idx === i ? val : o));
  const addPollOption    = () => { if (pollOptions.length < 4) setPollOptions(o => [...o, ""]); };
  const removePollOption = i  => { if (pollOptions.length > 2) setPollOptions(o => o.filter((_, idx) => idx !== i)); };

  const handlePost = () => {
    if (!valid) return;
    setSubmitting(true);
    // BACKEND INTEGRATION: POST /api/community/posts
    // body FormData: { content, language, tags, image?: photoFile, pollOptions? }
    const activePollOptions = pollMode ? pollOptions.filter(o => o.trim()) : [];
    onPost({
      content:      content.trim(),
      language,
      tags,
      pollOptions:  activePollOptions,
      photoPreview, // local blob URL for immediate display
      photoFile,    // actual File object for backend upload
    });
    // Reset
    setContent(""); setLanguage("Multiple");
    setPhotoMode(false); setPhotoPreview(null); setPhotoFile(null);
    setTagMode(false);   setTagInput(""); setTags([]);
    setPollMode(false);  setPollOptions(["", ""]);
    setSubmitting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div style={{ background: "var(--bg-subtle)", border: "1.5px dashed #c7d2fe", borderRadius: 16, padding: 20, marginBottom: 20 }}>

      {/* Author row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div className="ava" style={{ width: 38, height: 38, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: 13 }}>ME</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-base)" }}>Share with the community</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Min. 10 characters</div>
        </div>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          style={{ padding: "5px 10px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg-card)", color: "var(--text-base)", fontSize: 12, fontFamily: "inherit", cursor: "pointer", outline: "none" }}
        >
          {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Text area */}
      <textarea
        className="fc-area" rows={4}
        placeholder="Share your language learning journey, ask questions, or celebrate achievements... ✨"
        value={content}
        onChange={e => setContent(e.target.value)}
      />

      {/* Active tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
          {tags.map(t => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#eef2ff", color: "#4338ca", padding: "2px 9px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              #{t}
              <button onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Photo preview */}
      {photoPreview && (
        <div style={{ marginTop: 10, position: "relative", display: "inline-block" }}>
          <img src={photoPreview} alt="preview" style={{ maxHeight: 180, maxWidth: "100%", borderRadius: 10, display: "block", border: "1.5px solid var(--border)" }} />
          <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); setPhotoMode(false); if (fileRef.current) fileRef.current.value = ""; }}
            style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,.55)", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      )}

      {/* Tag input */}
      {tagMode && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
          <input
            className="fc"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
            placeholder="Type a tag and press Enter (max 5)"
            style={{ flex: 1, padding: "6px 10px", fontSize: 13 }}
            autoFocus
          />
          <button className="btn-coral" style={{ padding: "6px 12px", fontSize: 13 }} onClick={addTag} disabled={!tagInput.trim()}>Add</button>
          <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => setTagMode(false)}>Done</button>
        </div>
      )}

      {/* Poll builder */}
      {pollMode && (
        <div style={{ marginTop: 12, background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-base)", marginBottom: 10 }}>📊 Poll Options</div>
          {pollOptions.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
              <input className="fc" placeholder={`Option ${i + 1}`} value={opt} onChange={e => setPollOption(i, e.target.value)} style={{ flex: 1, padding: "6px 10px", fontSize: 13 }} />
              {pollOptions.length > 2 && (
                <button onClick={() => removePollOption(i)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15 }}>×</button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            {pollOptions.length < 4 && <button className="btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={addPollOption}>+ Add option</button>}
            <button className="btn-ghost" style={{ padding: "5px 11px", fontSize: 12 }} onClick={() => { setPollMode(false); setPollOptions(["", ""]); }}>Remove poll</button>
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
          <button className={photoMode ? "btn-coral" : "btn-ghost"} style={{ padding: "5px 11px", fontSize: 13 }} onClick={handlePhotoClick} title="Attach a photo">📷 Photo</button>
          <button className={tagMode ? "btn-coral" : "btn-ghost"} style={{ padding: "5px 11px", fontSize: 13 }} onClick={() => { setTagMode(t => !t); setPollMode(false); }} title="Add tags">🏷️ Tag</button>
          <button className={pollMode ? "btn-coral" : "btn-ghost"} style={{ padding: "5px 11px", fontSize: 13 }} onClick={() => { setPollMode(t => !t); setTagMode(false); setPhotoMode(false); setPhotoPreview(null); setPhotoFile(null); }} title="Add a poll">📊 Poll</button>
        </div>
        <button className="btn-coral" onClick={handlePost} disabled={!valid || submitting}>
          {submitting ? "Posting…" : "✈️ Post"}
        </button>
      </div>
    </div>
  );
};

export default PostForm;
