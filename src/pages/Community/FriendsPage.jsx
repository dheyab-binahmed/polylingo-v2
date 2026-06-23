import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  fetchFriends,
  fetchFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  searchUsers,
} from "../../services/api";

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"];
const pickColor = (id) => AVATAR_COLORS[(id?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = async () => {
    try {
      const [f, r] = await Promise.all([fetchFriends(), fetchFriendRequests()]);
      setFriends(Array.isArray(f) ? f : []);
      setRequests(r || { incoming: [], outgoing: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!searchEmail.trim()) return setSearchResults([]);
      try {
        const res = await searchUsers(searchEmail.trim());
        setSearchResults(res.users || []);
      } catch (e) {
        console.error(e);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchEmail]);

  const handleSend = async () => {
    const receiver_id = selectedUserId || searchEmail;
    if (!receiver_id) return;
    try {
      await sendFriendRequest({ receiver_id, message: "Hi! Let's practice together." });
      await loadAll();
      setSearchEmail("");
      setSearchResults([]);
      setSelectedUserId("");
      notify("Friend request sent!");
    } catch (e) {
      notify(e.message || "Failed to send request", "danger");
    }
  };

  const handleAccept = async (id) => {
    try {
      await acceptFriendRequest(id);
      await loadAll();
      notify("Friend request accepted!");
    } catch (e) {
      notify("Failed to accept request", "danger");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectFriendRequest(id);
      await loadAll();
      notify("Request rejected.");
    } catch (e) {
      notify("Failed to reject request", "danger");
    }
  };

  const handleMessage = (friend) => {
    navigate("/community", {
      state: {
        openDM: {
          id: friend.id,
          name: friend.name || friend.full_name || "Friend",
          initials: getInitials(friend.name || friend.full_name || ""),
          online: false,
          color: pickColor(friend.id),
          languages: friend.preferred_language ? [friend.preferred_language] : [],
          connected: true,
        },
      },
    });
  };

  const handleCall = (friend) => {
    navigate("/community", {
      state: {
        startCall: {
          id: friend.id,
          name: friend.name || friend.full_name || "Friend",
          callType: "video",
        },
      },
    });
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "90px 20px 40px", fontFamily: "inherit" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 80, right: 20, zIndex: 9999,
          background: toast.type === "danger" ? "#ef4444" : "#10b981",
          color: "#fff", padding: "10px 18px", borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: "0 6px 20px rgba(0,0,0,.15)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => navigate("/community")}
          style={{
            background: "none", border: "1.5px solid var(--border)", borderRadius: 10,
            padding: "7px 13px", cursor: "pointer", color: "var(--text-muted)",
            fontSize: 13, fontFamily: "inherit", fontWeight: 600,
          }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-base)" }}>
          Friends
        </h1>
      </div>

      {/* Search & Add */}
      <div style={{
        background: "var(--bg-card)", border: "1.5px solid var(--border)",
        borderRadius: 16, padding: "20px 22px", marginBottom: 24,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-base)", marginBottom: 12 }}>
          Add a Friend
        </div>
        <div style={{ position: "relative" }}>
          <input
            placeholder="Search by username, name, or email…"
            value={searchEmail}
            onChange={(e) => { setSearchEmail(e.target.value); setSelectedUserId(""); }}
            style={{
              width: "100%", padding: "10px 14px",
              border: "1.5px solid var(--border)", borderRadius: 10,
              fontSize: 14, fontFamily: "inherit", color: "var(--text-base)",
              background: "var(--bg-input)", outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          {searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "110%", left: 0, right: 0,
              background: "var(--bg-card)", border: "1.5px solid var(--border)",
              borderRadius: 10, zIndex: 50, overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            }}>
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: "10px 14px", cursor: "pointer", display: "flex",
                    alignItems: "center", gap: 10,
                    borderBottom: "1px solid var(--border)",
                    transition: "background .15s",
                  }}
                  onClick={() => { setSelectedUserId(u.id); setSearchEmail(u.username ? `@${u.username}` : (u.name || u.email)); setSearchResults([]); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: pickColor(u.id), color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {getInitials(u.name || u.email)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-base)" }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.username ? `@${u.username}` : u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!searchEmail.trim() && !selectedUserId}
          style={{
            marginTop: 10, background: "#6366f1", color: "#fff", border: "none",
            borderRadius: 10, padding: "9px 20px", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit", opacity: (!searchEmail.trim() && !selectedUserId) ? 0.5 : 1,
          }}
        >
          Send Request
        </button>
      </div>

      {/* Incoming Requests */}
      {requests.incoming.length > 0 && (
        <div style={{
          background: "var(--bg-card)", border: "1.5px solid var(--border)",
          borderRadius: 16, padding: "20px 22px", marginBottom: 24,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-base)", marginBottom: 14 }}>
            Incoming Requests ({requests.incoming.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {requests.incoming.map((r) => {
              const name = r.requester_name || r.requester_id;
              return (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", background: "var(--bg-subtle)",
                  borderRadius: 12, border: "1px solid var(--border)",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: pickColor(r.requester_id), color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>
                    {getInitials(name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-base)" }}>
                      {name}
                    </div>
                    {r.message && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        "{r.message}"
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleAccept(r.id)}
                      style={{
                        background: "#6366f1", color: "#fff", border: "none",
                        borderRadius: 8, padding: "6px 12px", fontWeight: 700,
                        fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(r.id)}
                      style={{
                        background: "none", color: "#ef4444",
                        border: "1.5px solid #fca5a5", borderRadius: 8,
                        padding: "6px 12px", fontWeight: 700,
                        fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outgoing Requests */}
      {requests.outgoing.filter((r) => r.status === "pending").length > 0 && (
        <div style={{
          background: "var(--bg-card)", border: "1.5px solid var(--border)",
          borderRadius: 16, padding: "20px 22px", marginBottom: 24,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-base)", marginBottom: 14 }}>
            Sent Requests ({requests.outgoing.filter((r) => r.status === "pending").length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requests.outgoing.filter((r) => r.status === "pending").map((r) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: "var(--bg-subtle)",
                borderRadius: 10, border: "1px solid var(--border)",
              }}>
                <div style={{ flex: 1, fontSize: 13, color: "var(--text-muted)" }}>
                  Request to <strong style={{ color: "var(--text-base)" }}>{r.receiver_name || r.receiver_id}</strong> — pending
                </div>
                <span style={{
                  fontSize: 11, background: "#fef3c7", color: "#92400e",
                  padding: "2px 9px", borderRadius: 20, fontWeight: 700,
                }}>
                  ⏳ Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div style={{
        background: "var(--bg-card)", border: "1.5px solid var(--border)",
        borderRadius: 16, padding: "20px 22px",
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-base)", marginBottom: 14 }}>
          Your Friends ({friends.length})
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px 0" }}>
            Loading…
          </div>
        ) : friends.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No friends yet</div>
            <div style={{ fontSize: 13 }}>Search for users above to add friends</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {friends.map((f) => {
              const name = f.name || f.full_name || f.email || "Friend";
              return (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", background: "var(--bg-subtle)",
                  borderRadius: 12, border: "1px solid var(--border)",
                  transition: "box-shadow .2s",
                }}>
                  {/* Avatar */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: pickColor(f.id), color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, fontWeight: 700,
                    }}>
                      {getInitials(name)}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-base)" }}>
                      {name}
                    </div>
                    {f.username && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                        @{f.username}
                      </div>
                    )}
                    {f.preferred_language && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                        🌐 {f.preferred_language}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleMessage(f)}
                      title="Message"
                      style={{
                        background: "#6366f1", color: "#fff", border: "none",
                        borderRadius: 8, padding: "7px 11px", cursor: "pointer",
                        fontSize: 14, fontFamily: "inherit",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      💬
                    </button>
                    <button
                      onClick={() => handleCall(f)}
                      title="Video Call"
                      style={{
                        background: "#10b981", color: "#fff", border: "none",
                        borderRadius: 8, padding: "7px 11px", cursor: "pointer",
                        fontSize: 14, fontFamily: "inherit",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      📹
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
