import { useState, useRef } from "react";

const ResourcesTab = ({ group, notify }) => {
  const [resources,   setResources]   = useState(group.resources || []);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);

  const handleUploadClick = () => {
    setUploadError("");
    fileRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`File too large. Max size is ${MAX_MB} MB.`);
      return;
    }
    setUploading(true);

    // BACKEND INTEGRATION: POST /api/community/groups/:id/resources
    // body: FormData { file, groupId: group.id }
    // response: { id, name, type, size, icon, url }
    // On success: add response item to resources list
    // On error:   setUploadError(response.message)

    // Placeholder — add to local state until backend is ready
    const ext  = file.name.split(".").pop().toUpperCase();
    const icon = ext === "PDF" ? "📄" : ["DOC", "DOCX"].includes(ext) ? "📝" : ["JPG","PNG","GIF","WEBP"].includes(ext) ? "🖼️" : ["MP3","WAV","OGG"].includes(ext) ? "🎵" : "📁";
    const newResource = {
      id:   Date.now(),
      name: file.name,
      type: ext,
      icon,
      size: file.size > 1024 * 1024
        ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`,
      url:  URL.createObjectURL(file), // temporary local URL — replace with backend URL
    };
    setTimeout(() => {
      setResources(r => [...r, newResource]);
      setUploading(false);
      notify(`"${file.name}" uploaded! 📤`, "success");
      e.target.value = "";
    }, 600);
  };

  const handleDownload = (resource) => {
    // BACKEND INTEGRATION: GET /api/community/groups/:id/resources/:resourceId/download
    // response: signed URL or blob
    if (resource.url) {
      const a = document.createElement("a");
      a.href = resource.url;
      a.download = resource.name;
      a.click();
    } else {
      notify("Download URL not available yet.", "info");
    }
  };

  const handleDelete = (resourceId) => {
    // BACKEND INTEGRATION: DELETE /api/community/groups/:id/resources/:resourceId
    setResources(r => r.filter(x => x.id !== resourceId));
    notify("Resource removed.", "info");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-base)" }}>Study Resources</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Shared files & learning materials ({resources.length})</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {uploading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Uploading…</span>}
          <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleFileChange} />
          <button className="btn-coral" style={{ padding: "7px 14px", fontSize: 13 }} onClick={handleUploadClick} disabled={uploading}>
            {uploading ? "⏳" : "📤"} Upload
          </button>
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div style={{ margin: "10px 20px 0", padding: "8px 12px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, fontSize: 13, color: "var(--danger)" }}>
          ⚠ {uploadError}
        </div>
      )}

      {/* ── Resource grid ── */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        {/* BACKEND INTEGRATION: GET /api/community/groups/:id/resources */}
        {resources.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 20px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
            <div style={{ fontWeight: 600 }}>No resources yet</div>
            <div style={{ fontSize: 13 }}>Upload study materials to share with the group</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
            {resources.map(r => (
              <div key={r.id} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{r.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: "var(--text-base)", wordBreak: "break-word" }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{r.type} · {r.size}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-ghost" style={{ flex: 1, padding: "5px 10px", fontSize: 12, justifyContent: "center" }} onClick={() => handleDownload(r)}>
                    ⬇️ Download
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    title="Remove"
                    style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "5px 8px" }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourcesTab;
