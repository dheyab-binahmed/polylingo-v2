import { useState, useEffect, useCallback } from "react";
import {
  searchGroupUsers,
  inviteToGroup,
  getGroupMembers,
  removeGroupMember,
  toggleGroupAdmin,
  getGroupJoinRequests,
  approveGroupJoinRequest,
  rejectGroupJoinRequest,
} from "../../../../services/api";

const STATUS_COLOR = { online: "#10b981", away: "#f59e0b", offline: "#9ca3af" };

const MembersTab = ({ group, notify, onOpenDM, currentUserId }) => {
  const [members, setMembers] = useState(group.membersList || []);
  const [joinRequests, setJoinRequests] = useState([]);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteMode, setInviteMode] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null); // { id, name }
  const [loadingAction, setLoadingAction] = useState(null);

  const isAdmin = group.isAdmin || group.isOwner;

  const loadMembers = useCallback(async () => {
    try {
      const data = await getGroupMembers(group.id);
      if (data?.members) setMembers(data.members);
    } catch (_) {}
  }, [group.id]);

  const loadJoinRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await getGroupJoinRequests(group.id);
      if (data?.requests) setJoinRequests(data.requests);
    } catch (_) {}
  }, [group.id, isAdmin]);

  useEffect(() => {
    loadMembers();
    loadJoinRequests();
  }, [loadMembers, loadJoinRequests]);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );
  const onlineCount = members.filter((m) => m.status === "online").length;

  const handleInvite = async () => {
    const val = inviteInput.trim();
    if (!val) return;
    setInviting(true);
    try {
      const results = await searchGroupUsers(group.id, val);
      if (results?.users?.length > 0) {
        await inviteToGroup(group.id, results.users[0].id);
        notify(`${results.users[0].name} invited! 📨`, "success");
        await loadMembers();
      } else {
        notify("User not found", "warning");
      }
    } catch (e) {
      notify("Failed to invite user", "danger");
    } finally {
      setInviting(false);
      setInviteInput("");
      setInviteMode(false);
    }
  };

  const doRemove = async () => {
    if (!confirmRemove) return;
    setLoadingAction(`remove-${confirmRemove.id}`);
    try {
      await removeGroupMember(group.id, confirmRemove.id);
      setMembers((prev) => prev.filter((m) => m.id !== confirmRemove.id));
      notify(`${confirmRemove.name} removed from group.`, "info");
    } catch (e) {
      notify("Failed to remove member", "danger");
    } finally {
      setLoadingAction(null);
      setConfirmRemove(null);
    }
  };

  const handleToggleAdmin = async (member) => {
    setLoadingAction(`admin-${member.id}`);
    const newVal = !member.is_admin;
    try {
      await toggleGroupAdmin(group.id, member.id, newVal);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, is_admin: newVal } : m)),
      );
      notify(
        newVal
          ? `${member.name} promoted to admin 🛡️`
          : `${member.name} removed from admins`,
        "success",
      );
    } catch (e) {
      notify("Failed to update admin status", "danger");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApproveRequest = async (req) => {
    setLoadingAction(`approve-${req.user_id}`);
    try {
      await approveGroupJoinRequest(group.id, req.user_id);
      setJoinRequests((prev) => prev.filter((r) => r.user_id !== req.user_id));
      notify(`${req.name} approved! 🎉`, "success");
      await loadMembers();
    } catch (e) {
      notify("Failed to approve request", "danger");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRejectRequest = async (req) => {
    setLoadingAction(`reject-${req.user_id}`);
    try {
      await rejectGroupJoinRequest(group.id, req.user_id);
      setJoinRequests((prev) => prev.filter((r) => r.user_id !== req.user_id));
      notify(`${req.name}'s request rejected.`, "info");
    } catch (e) {
      notify("Failed to reject request", "danger");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMessageMember = (m) => {
    onOpenDM?.({
      id: m.id,
      name: m.name,
      initials: m.initials,
      color: group.color,
      online: m.status === "online",
      bio: "",
      languages: [],
      connected: true,
    });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Confirm removal dialog */}
      {confirmRemove && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 20,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: 16,
              padding: 24,
              maxWidth: 320,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 16px 40px rgba(0,0,0,.2)",
              margin: 20,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-base)", marginBottom: 8 }}>
              Remove Member?
            </div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>
              Remove <strong>{confirmRemove.name}</strong> from the group? They will need to rejoin.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn-ghost"
                style={{ padding: "8px 20px" }}
                onClick={() => setConfirmRemove(null)}
              >
                Cancel
              </button>
              <button
                onClick={doRemove}
                disabled={loadingAction === `remove-${confirmRemove.id}`}
                style={{
                  padding: "8px 20px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              >
                {loadingAction === `remove-${confirmRemove.id}` ? "⏳" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-base)" }}>
            Members ({members.length})
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            <span style={{ color: "#10b981", fontWeight: 600 }}>● {onlineCount} online</span>
            {members.length - onlineCount > 0 && (
              <span style={{ marginLeft: 8 }}>· {members.length - onlineCount} offline</span>
            )}
          </div>
        </div>
        {isAdmin && (
          <button
            className="btn-coral"
            style={{ padding: "7px 14px", fontSize: 13 }}
            onClick={() => setInviteMode((s) => !s)}
          >
            {inviteMode ? "✕ Cancel" : "➕ Invite"}
          </button>
        )}
      </div>

      {/* Invite form */}
      {inviteMode && isAdmin && (
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-subtle)",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-base)", marginBottom: 8 }}>
            Invite by username or email
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="fc"
              placeholder="e.g. maria@example.com"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
              autoFocus
            />
            <button
              className="btn-coral"
              onClick={handleInvite}
              disabled={!inviteInput.trim() || inviting}
              style={{ padding: "8px 14px", fontSize: 13 }}
            >
              {inviting ? "⏳" : "Send Invite"}
            </button>
          </div>
        </div>
      )}

      {/* Pending join requests (admin only) */}
      {isAdmin && joinRequests.length > 0 && (
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            background: "#fef9c3",
            flexShrink: 0,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 8 }}>
            🔔 Join Requests ({joinRequests.length})
          </div>
          {joinRequests.map((req) => (
            <div
              key={req.user_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "8px 0",
                borderBottom: "1px solid #fde68a",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  className="ava"
                  style={{ width: 32, height: 32, background: "#f59e0b", fontSize: 11 }}
                >
                  {req.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#78350f" }}>{req.name}</div>
                  <div style={{ fontSize: 11, color: "#92400e" }}>Wants to join</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn-coral"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  onClick={() => handleApproveRequest(req)}
                  disabled={!!loadingAction}
                >
                  {loadingAction === `approve-${req.user_id}` ? "⏳" : "Approve"}
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  onClick={() => handleRejectRequest(req)}
                  disabled={!!loadingAction}
                >
                  {loadingAction === `reject-${req.user_id}` ? "⏳" : "Reject"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <input
          className="fc"
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "7px 12px", fontSize: 13 }}
        />
      </div>

      {/* Members list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px 20px" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>👥</div>
            <div style={{ fontWeight: 600 }}>{search ? "No members match" : "No members yet"}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {search ? "Try a different name" : "Invite people to get started"}
            </div>
          </div>
        ) : (
          filtered.map((m) => {
            const isSelf = m.id === currentUserId;
            const isOwner = m.is_owner || m.id === group.owner_id;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    className="ava"
                    style={{ width: 38, height: 38, background: group.color, fontSize: 13 }}
                  >
                    {m.initials}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 10,
                      height: 10,
                      background: STATUS_COLOR[m.status] || "#9ca3af",
                      border: "2px solid var(--bg-card)",
                      borderRadius: "50%",
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-base)" }}>
                      {m.name}
                      {isSelf ? " (You)" : ""}
                    </span>
                    {isOwner && (
                      <span
                        style={{
                          fontSize: 10,
                          background: "#fef3c7",
                          color: "#92400e",
                          padding: "1px 7px",
                          borderRadius: 20,
                          fontWeight: 700,
                        }}
                      >
                        👑 Owner
                      </span>
                    )}
                    {!isOwner && m.is_admin && (
                      <span
                        style={{
                          fontSize: 10,
                          background: "#ede9fe",
                          color: "#5b21b6",
                          padding: "1px 7px",
                          borderRadius: 20,
                          fontWeight: 700,
                        }}
                      >
                        🛡️ Admin
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: STATUS_COLOR[m.status] || "var(--text-muted)",
                      textTransform: "capitalize",
                    }}
                  >
                    {m.status || "offline"}
                  </div>
                </div>

                {/* Actions */}
                {!isSelf && (
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <button
                      className="btn-ghost"
                      style={{ padding: "5px 9px", fontSize: 12 }}
                      onClick={() => handleMessageMember(m)}
                      title={`Message ${m.name}`}
                    >
                      💬
                    </button>
                    {/* Promote/demote admin — only group owner can do this */}
                    {group.isOwner && !isOwner && (
                      <button
                        className="btn-ghost"
                        style={{
                          padding: "5px 9px",
                          fontSize: 12,
                          borderColor: m.is_admin ? "#8b5cf6" : "var(--border)",
                          color: m.is_admin ? "#8b5cf6" : "var(--text-muted)",
                        }}
                        onClick={() => handleToggleAdmin(m)}
                        disabled={loadingAction === `admin-${m.id}`}
                        title={m.is_admin ? "Remove admin" : "Make admin"}
                      >
                        {loadingAction === `admin-${m.id}` ? "⏳" : m.is_admin ? "🛡️ Demote" : "🛡️ Promote"}
                      </button>
                    )}
                    {/* Remove member — admin/owner can remove non-owners */}
                    {isAdmin && !isOwner && (
                      <button
                        onClick={() => setConfirmRemove({ id: m.id, name: m.name })}
                        title="Remove from group"
                        style={{
                          background: "none",
                          border: "1.5px solid #fca5a5",
                          borderRadius: 8,
                          cursor: "pointer",
                          color: "#ef4444",
                          fontSize: 12,
                          padding: "5px 9px",
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
                {isSelf && (
                  <span
                    style={{
                      fontSize: 11,
                      background: "#eef2ff",
                      color: "#4338ca",
                      padding: "2px 9px",
                      borderRadius: 20,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    You
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MembersTab;
