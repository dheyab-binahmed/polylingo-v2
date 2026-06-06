import { useState, useCallback, useEffect } from "react";
import CommunityStyles from "../styles/CommunityStyles";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchCommunityPosts,
  createPost as apiCreatePost,
  togglePostLike as apiTogglePostLike,
  postComment as apiPostComment,
  sharePost as apiSharePost,
  reportPost as apiReportPost,
  deletePost as apiDeletePost,
  fetchPartners as apiFetchPartners,
  connectPartner as apiConnectPartner,
  disconnectPartner as apiDisconnectPartner,
  acceptPartner as apiAcceptPartner,
  rejectPartner as apiRejectPartner,
  fetchGroups as apiFetchGroups,
  createGroup as apiCreateGroup,
  joinGroup as apiJoinGroup,
  leaveGroup as apiLeaveGroup,
} from "../services/api";
import { off, on, onDmMessage } from "../services/socket";
import MessageToast from "../components/common/MessageToast";
import ErrorBoundary from "../components/common/ErrorBoundary";
import ToastContainer from "../components/components/ui/ToastContainer";
import Section from "../components/components/ui/Section";
import Hero from "../components/components/Hero";
import StateGrid from "../components/components/StateGrid";
import PostForm from "../components/components/feed/PostForm";
import PostCard from "../components/components/feed/PostCard";
import PartnerCard from "../components/components/partners/PartnerCard";
import DMModal from "../components/components/partners/DMModal";
import GroupRow from "../components/components/groups/GroupRow";
import CreateGroupModel from "../components/components/groups/CreateGroupModel";
import GroupInterface from "../components/components/groups/GroupInterface";

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND INTEGRATION — replace with API calls:
//   Posts:    GET /api/community/posts?page=1&limit=10
//   Groups:   GET /api/community/groups?userId=
//   Partners: GET /api/community/partners?userId=&page=1
// ─────────────────────────────────────────────────────────────────────────────

const PARTNER_LANGS = [
  "All",
  "Spanish",
  "English",
  "French",
  "Japanese",
  "Arabic",
  "Chinese",
];
const LEVEL_FILTERS = ["All Levels", "Beginner", "Intermediate", "Advanced"];
const GROUPS_PAGE_SZ = 5; // groups shown per page
const asText = (value) => String(value ?? "").toLowerCase();
const asList = (value) => (Array.isArray(value) ? value : []);

export default function CommunityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [partners, setPartners] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [dmPartner, setDmPartner] = useState(null);
  const [pendingIncomingCall, setPendingIncomingCall] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [messageToasts, setMessageToasts] = useState([]);

  // Feed filters
  const [feedSearch, setFeedSearch] = useState("");
  const [feedLoading, setFeedLoading] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  // Partner filters
  const [partnerFilter, setPartnerFilter] = useState("All");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [loadingMorePartners, setLoadingMorePartners] = useState(false);
  const [partnersPage, setPartnersPage] = useState(1);
  const [hasMorePartners, setHasMorePartners] = useState(true);

  // Group filters
  const [groupSearch, setGroupSearch] = useState("");
  const [groupLevel, setGroupLevel] = useState("All Levels");
  const [groupsShown, setGroupsShown] = useState(GROUPS_PAGE_SZ);

  // ── Toast ─────────────────────────────────────────────────────────────
  const notify = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Handle incoming call from global listener ──────────────────────────
  useEffect(() => {
    // Check for pending call in navigation state
    if (location.state?.pendingCall) {
      setPendingIncomingCall(location.state.pendingCall);
    }

    // Open DM when navigated from FriendsPage with openDM state
    if (location.state?.openDM) {
      setDmPartner(location.state.openDM);
      setActiveGroup(null);
    }

    // Open DM and trigger call when navigated from FriendsPage with startCall state
    if (location.state?.startCall) {
      const sc = location.state.startCall;
      const name = sc.name || "";
      setDmPartner({
        id: sc.id,
        name,
        initials: name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??",
        online: true,
        color: "#8b5cf6",
        languages: [],
        connected: true,
        autoCall: true,
        autoCallType: sc.callType || "video",
      });
      setActiveGroup(null);
    }

    // Also check sessionStorage as fallback
    const stored = sessionStorage.getItem("pendingIncomingCall");
    if (stored && !pendingIncomingCall) {
      try {
        const callData = JSON.parse(stored);
        setPendingIncomingCall(callData);
      } catch (_) {
        // ignore
      }
    }
  }, [location.state]);

  // Load initial community data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const p = await fetchCommunityPosts({ page: 1, limit: 20 });
        const g = await apiFetchGroups();
        const par = await apiFetchPartners();
        if (!mounted) return;
        setPosts((p && p.posts) || []);
        setGroups((g && g.groups) || []);
        setPartners((par && par.partners) || []);
      } catch (err) {
        console.error("Failed to load community data", err);
        notify("Failed to load community data", "danger");
      }
    };
    load();
    return () => (mounted = false);
  }, [notify]);

  // ── Auto-open DM when incoming call arrives ────────────────────────────
  useEffect(() => {
    if (!pendingIncomingCall) return;

    // Try to find caller in partners list
    let caller = partners.find(
      (p) => String(p.id) === String(pendingIncomingCall.from),
    );

    if (caller) {
      setDmPartner(caller);
      setActiveGroup(null);
      setPendingIncomingCall(null);
      sessionStorage.removeItem("pendingIncomingCall");
      return;
    }

    // Caller not in partners list — create a minimal partner object from call data
    if (pendingIncomingCall.callerName) {
      const minimalPartner = {
        id: pendingIncomingCall.from,
        name: pendingIncomingCall.callerName,
        initials:
          pendingIncomingCall.callerName?.slice(0, 2)?.toUpperCase() || "??",
        online: true,
        color: "#8b5cf6",
        languages: [],
        connected: true,
      };
      setDmPartner(minimalPartner);
      setActiveGroup(null);
      setPendingIncomingCall(null);
      sessionStorage.removeItem("pendingIncomingCall");
    }
  }, [pendingIncomingCall, partners]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await apiFetchPartners();
        setPartners((data && data.partners) || []);
      } catch (_) {
        // keep last known list if polling fails
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Listen for presence updates (online/offline status of partners) ────
  useEffect(() => {
    const handlePresence = (data) => {
      setPartners((prev) =>
        prev.map((p) =>
          String(p.id) === String(data.user_id)
            ? { ...p, online: data.status === "online" }
            : p,
        ),
      );
    };

    on("presence:update", handlePresence);
    return () => off("presence:update", handlePresence);
  }, []);

  // ── Listen for authenticated event to refresh partners list ────
  useEffect(() => {
    const handleAuthenticated = async () => {
      try {
        const data = await apiFetchPartners();
        setPartners((data && data.partners) || []);
      } catch (_) {
        // ignore
      }
    };

    on("authenticated", handleAuthenticated);
    return () => off("authenticated", handleAuthenticated);
  }, []);

  useEffect(() => {
    const unsubscribe =
      onDmMessage((msg) => {
        const sender = partners.find(
          (partner) => String(partner.id) === String(msg.from),
        );
        if (!sender) return;

        const chatIsOpen =
          dmPartner &&
          (String(dmPartner.id) === String(msg.from) ||
            String(dmPartner.id) === String(msg.to));
        const tabHidden = typeof document !== "undefined" && document.hidden;

        if (chatIsOpen && !tabHidden) return;

        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          tabHidden
        ) {
          new Notification(`New message from ${sender.name}`, {
            body: msg.text,
            icon: "/favicon.ico",
          });
        }

        setMessageToasts((prev) => [
          ...prev,
          { senderName: sender.name, text: msg.text },
        ]);
        setTimeout(() => {
          setMessageToasts((prev) => prev.filter((_, index) => index !== 0));
        }, 5000);
      }) || (() => {});

    return unsubscribe;
  }, [dmPartner, partners]);

  // ── Scroll to section ─────────────────────────────────────────────────
  const scrollTo = useCallback((section) => {
    const ids = {
      feed: "feed-section",
      partners: "partners-section",
      groups: "groups-section",
    };
    document
      .getElementById(ids[section])
      ?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ── DM opener (used by GroupInterface → ChatTab / MembersTab) ─────────
  const openDM = useCallback((partnerInfo) => {
    setDmPartner(partnerInfo);
    setActiveGroup(null); // close group modal when DM opens
  }, []);

  // ── My connections (friends) ──────────────────────────────────────────
  // BACKEND INTEGRATION: GET /api/community/partners/connections
  const myConnections = partners.filter((p) => p.connected);

  // ─────────────────────────────────────────────────────────────────────
  // POST HANDLERS
  // ─────────────────────────────────────────────────────────────────────
  const handlePost = ({
    content,
    language,
    tags,
    pollOptions,
    photoPreview,
  }) => {
    (async () => {
      // optimistic UI
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        author: "You",
        content,
        language,
        created_at: new Date().toISOString(),
        ownedByCurrentUser: true,
        likes: 0,
        liked: false,
        comments: 0,
        shares: 0,
      };
      setPosts((p) => [optimistic, ...p]);
      try {
        const res = await apiCreatePost({ content, language });
        setPosts((prev) =>
          prev.map((it) => (it.id === tempId ? { ...it, id: res.id } : it)),
        );
        notify("Post published! 🎉", "success");
      } catch (err) {
        setPosts((p) => p.filter((it) => it.id !== tempId));
        notify("Failed to publish post", "danger");
      }
    })();
  };

  const handleDelete = (id) => {
    (async () => {
      try {
        await apiDeletePost(id);
        setPosts((p) => p.filter((post) => post.id !== id));
        notify("Post deleted.", "info");
      } catch (err) {
        notify("Failed to delete post", "danger");
      }
    })();
  };

  const handleLike = (id) => {
    (async () => {
      // optimistic
      setPosts((p) =>
        p.map((post) =>
          post.id === id
            ? {
                ...post,
                liked: !post.liked,
                likes: (post.likes || 0) + (post.liked ? -1 : 1),
              }
            : post,
        ),
      );
      try {
        await apiTogglePostLike(id);
      } catch (err) {
        // revert on error
        setPosts((p) =>
          p.map((post) =>
            post.id === id
              ? {
                  ...post,
                  liked: !post.liked,
                  likes: (post.likes || 0) + (post.liked ? -1 : 1),
                }
              : post,
          ),
        );
        notify("Failed to like post", "danger");
      }
    })();
  };

  const handleShare = (id) => {
    (async () => {
      setPosts((p) =>
        p.map((post) =>
          post.id === id ? { ...post, shares: (post.shares || 0) + 1 } : post,
        ),
      );
      try {
        await apiSharePost(id);
      } catch (err) {
        notify("Failed to share post", "danger");
      }
    })();
  };

  const handleComment = (id) => {
    setPosts((p) =>
      p.map((post) =>
        post.id === id ? { ...post, comments: (post.comments || 0) + 1 } : post,
      ),
    );
  };

  const handleReport = (id) => {
    (async () => {
      try {
        await apiReportPost(id, "reported from UI");
        notify("Post reported. We'll review it shortly.", "warning");
      } catch (err) {
        notify("Failed to report post", "danger");
      }
    })();
  };

  const handleRefreshFeed = () => {
    setFeedLoading(true);
    setPostsPage(1);
    setHasMorePosts(true);
    (async () => {
      try {
        const data = await fetchCommunityPosts({ page: 1, limit: 20 });
        setPosts((data && data.posts) || []);
        notify("Feed refreshed!", "success");
      } catch (err) {
        notify("Failed to refresh feed", "danger");
      } finally {
        setFeedLoading(false);
      }
    })();
  };

  const handleLoadMorePosts = () => {
    if (loadingMorePosts || !hasMorePosts) return;
    setLoadingMorePosts(true);
    const nextPage = postsPage + 1;
    (async () => {
      try {
        const data = await fetchCommunityPosts({ page: nextPage, limit: 20 });
        const more = (data && data.posts) || [];
        setPosts((prev) => [...prev, ...more]);
        setPostsPage(nextPage);
        if (!more.length) setHasMorePosts(false);
      } catch (err) {
        notify("Failed to load more posts", "danger");
      } finally {
        setLoadingMorePosts(false);
      }
    })();
  };

  // ─────────────────────────────────────────────────────────────────────
  // PARTNER HANDLERS
  // ─────────────────────────────────────────────────────────────────────
  const handleConnect = (id) => {
    (async () => {
      const p = partners.find((x) => x.id === id);
      setPartners((ps) =>
        ps.map((pt) =>
          pt.id === id
            ? {
                ...pt,
                connected: false,
                status: "pending",
                request_direction: "outgoing",
              }
            : pt,
        ),
      );
      try {
        const res = await apiConnectPartner(id);
        setPartners((ps) =>
          ps.map((pt) =>
            pt.id === id
              ? {
                  ...pt,
                  connected: !!res?.connected,
                  status: res?.status || "pending",
                  request_direction: res?.request_direction || "outgoing",
                }
              : pt,
          ),
        );
        notify(`Connection request sent to ${p?.name}!`, "success");
      } catch (err) {
        setPartners((ps) =>
          ps.map((pt) =>
            pt.id === id
              ? {
                  ...pt,
                  connected: false,
                  status: null,
                  request_direction: null,
                }
              : pt,
          ),
        );
        notify("Failed to connect", "danger");
      }
    })();
  };

  const handleDisconnect = (id) => {
    (async () => {
      const p = partners.find((x) => x.id === id);
      setPartners((ps) =>
        ps.map((pt) =>
          pt.id === id
            ? {
                ...pt,
                connected: false,
                status: null,
                request_direction: null,
              }
            : pt,
        ),
      );
      if (dmPartner?.id === id) setDmPartner(null);
      try {
        await apiDisconnectPartner(id);
        notify(`Disconnected from ${p?.name}.`, "info");
      } catch (err) {
        notify("Failed to disconnect", "danger");
      }
    })();
  };

  const handleAcceptPartner = (id) => {
    (async () => {
      try {
        await apiAcceptPartner(id);
        setPartners((ps) =>
          ps.map((pt) =>
            pt.id === id
              ? {
                  ...pt,
                  connected: true,
                  status: "accepted",
                  request_direction: null,
                }
              : pt,
          ),
        );
        notify("Partner request accepted!", "success");
      } catch (err) {
        notify("Failed to accept request", "danger");
      }
    })();
  };

  const handleRejectPartner = (id) => {
    (async () => {
      try {
        await apiRejectPartner(id);
        setPartners((ps) =>
          ps.map((pt) =>
            pt.id === id
              ? {
                  ...pt,
                  connected: false,
                  status: null,
                  request_direction: null,
                }
              : pt,
          ),
        );
        notify("Partner request rejected.", "info");
      } catch (err) {
        notify("Failed to reject request", "danger");
      }
    })();
  };

  const handleMessage = (id) => {
    // open DM modal; DMModal will fetch history via API
    const p = partners.find((x) => x.id === id);
    if (p) setDmPartner(p);
  };

  const handleCall = (id) => {
    // BACKEND INTEGRATION: POST /api/community/dm/:id/call → { roomToken }
    const p = partners.find((x) => x.id === id);
    notify(`Starting call with ${p?.name}… 📞`, "info");
  };

  const handleRefreshPartners = () => {
    setPartnerLoading(true);
    setPartnersPage(1);
    setHasMorePartners(true);
    (async () => {
      try {
        const data = await apiFetchPartners();
        setPartners((data && data.partners) || []);
        notify("Partners refreshed!", "success");
      } catch (err) {
        notify("Failed to refresh partners", "danger");
      } finally {
        setPartnerLoading(false);
      }
    })();
  };

  const handleLoadMorePartners = () => {
    if (loadingMorePartners || !hasMorePartners) return;
    setLoadingMorePartners(true);
    const nextPage = partnersPage + 1;
    (async () => {
      try {
        const data = await apiFetchPartners({ page: nextPage });
        const more = (data && data.partners) || [];
        setPartners((prev) => [...prev, ...more]);
        setPartnersPage(nextPage);
        if (!more.length) setHasMorePartners(false);
      } catch (err) {
        notify("Failed to load more partners", "danger");
      } finally {
        setLoadingMorePartners(false);
      }
    })();
  };

  // ─────────────────────────────────────────────────────────────────────
  // GROUP HANDLERS
  // ─────────────────────────────────────────────────────────────────────
  const handleCreateGroup = (form) => {
    const colors = ["#6366f1", "#10b981", "#8b5cf6", "#3b82f6", "#f59e0b"];
    (async () => {
      const tempId = `tempg-${Date.now()}`;
      const optimistic = {
        id: tempId,
        name: form.name,
        description: form.description,
        owner_id: "me",
        members: 1,
        joined: true,
        isOwner: true,
      };
      setGroups((p) => [optimistic, ...p]);
      try {
        const res = await apiCreateGroup(form);
        setGroups((prev) =>
          prev.map((it) => (it.id === tempId ? { ...it, id: res.id } : it)),
        );
        notify(`"${form.name}" created! 🎉`, "success");
      } catch (err) {
        setGroups((p) => p.filter((g) => g.id !== tempId));
        notify("Failed to create group", "danger");
      }
    })();
  };

  const handleDeleteGroup = (id) => {
    (async () => {
      try {
        // TODO: implement delete group API if needed (not implemented server-side)
        setGroups((g) => g.filter((gr) => gr.id !== id));
        notify("Group deleted.", "info");
      } catch (err) {
        notify("Failed to delete group", "danger");
      }
    })();
  };

  const handleJoinGroup = (id) => {
    (async () => {
      try {
        const res = await apiJoinGroup(id);
        const groupName = groups.find((g) => g.id === id)?.name;
        if (res?.status === "pending") {
          setGroups((g) =>
            g.map((gr) =>
              gr.id === id ? { ...gr, pendingRequest: true } : gr,
            ),
          );
          notify(`Join request sent to "${groupName}". Waiting for admin approval. ⏳`, "info");
        } else {
          setGroups((g) =>
            g.map((gr) =>
              gr.id === id
                ? { ...gr, joined: true, pendingRequest: false, members: (gr.members || 0) + 1 }
                : gr,
            ),
          );
          notify(`Joined "${groupName}"! 🎉`, "success");
        }
      } catch (err) {
        notify("Failed to join group", "danger");
      }
    })();
  };

  const handleLeaveGroup = (id) => {
    (async () => {
      setGroups((g) =>
        g.map((gr) =>
          gr.id === id
            ? {
                ...gr,
                joined: false,
                members: Math.max(0, (gr.members || 1) - 1),
              }
            : gr,
        ),
      );
      try {
        await apiLeaveGroup(id);
        notify(`Left "${groups.find((g) => g.id === id)?.name}".`, "info");
      } catch (err) {
        notify("Failed to leave group", "danger");
      }
    })();
  };

  const openGroup = (id) =>
    setActiveGroup(groups.find((g) => g.id === id) || null);

  // ── Filtered data ─────────────────────────────────────────────────────
  const filteredPosts = posts.filter(
    (p) => {
      const query = asText(feedSearch.trim());
      if (!query) return true;
      return (
        asText(p.content).includes(query) ||
        asText(p.author || p.author_name || p.user_name).includes(query) ||
        asList(p.tags).some((t) => asText(t).includes(query))
      );
    },
  );

  const filteredPartners = partners.filter((p) => {
    if (p.status === "pending" && p.request_direction === "incoming") {
      return false;
    }
    const query = asText(partnerSearch.trim());
    const matchLang =
      partnerFilter === "All" ||
      asList(p.languages).some((l) =>
        asText(l).includes(asText(partnerFilter)),
      );
    const matchSearch =
      !query ||
      asText(p.name || p.full_name || p.email).includes(query) ||
      asText(p.country).includes(query);
    return matchLang && matchSearch;
  });

  const filteredGroups = groups.filter((g) => {
    const query = asText(groupSearch.trim());
    const matchSearch =
      !query ||
      asText(g.name).includes(query) ||
      asText(g.description).includes(query) ||
      asText(g.language).includes(query);
    const matchLevel =
      groupLevel === "All Levels" || asText(g.level) === asText(groupLevel);
    return matchSearch && matchLevel;
  });
  const visibleGroups = filteredGroups.slice(0, groupsShown);
  const hasMoreGroups = filteredGroups.length > groupsShown;
  const incomingPartnerRequests = partners.filter(
    (p) => p.status === "pending" && p.request_direction === "incoming",
  );

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="plg-root">
      <CommunityStyles />
      <ToastContainer toasts={toasts} />
      <MessageToast
        messages={messageToasts}
        onClose={(index) =>
          setMessageToasts((prev) =>
            prev.filter((_, currentIndex) => currentIndex !== index),
          )
        }
      />

      <main className="plg-main">
        <Hero
          onCreateGroup={() => setShowCreateGroup(true)}
          onFindPartners={() => scrollTo("partners")}
        />
        <div
          style={{ display: "flex", gap: 10, marginTop: 12, marginBottom: 8 }}
        >
          <button
            onClick={() => navigate("/community/friends")}
            className="btn btn-outline"
          >
            Manage Friends
          </button>
        </div>

        <StateGrid
          postCount={posts.length}
          groupCount={groups.length}
          onScrollTo={scrollTo}
        />

        {/* ── My Connections ── */}
        {myConnections.length > 0 && (
          <Section title={`My Connections (${myConnections.length})`}>
            {/* BACKEND INTEGRATION: GET /api/community/partners/connections */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {myConnections.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--bg-subtle)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 14,
                    padding: "10px 14px",
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      className="ava"
                      style={{
                        width: 38,
                        height: 38,
                        background: p.color,
                        fontSize: 13,
                      }}
                    >
                      {p.initials}
                    </div>
                    {p.online && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          width: 10,
                          height: 10,
                          background: "#10b981",
                          border: "2px solid var(--bg-subtle)",
                          borderRadius: "50%",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "var(--text-base)",
                        maxWidth: 110,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: p.online ? "#10b981" : "var(--text-muted)",
                      }}
                    >
                      {p.online ? "● Online" : "○ Offline"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button
                      className="btn-coral"
                      style={{ padding: "5px 10px", fontSize: 12 }}
                      onClick={() => handleMessage(p.id)}
                      title="Message"
                    >
                      💬
                    </button>
                    <button
                      className="btn-ghost"
                      style={{
                        padding: "5px 9px",
                        fontSize: 12,
                        borderColor: "#10b981",
                        color: "#10b981",
                      }}
                      onClick={() => handleCall(p.id)}
                      title="Video call"
                    >
                      📹
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: "5px 9px", fontSize: 12 }}
                      onClick={() => handleDisconnect(p.id)}
                      title="Disconnect"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Community Feed ── */}
        <div id="feed-section">
          <Section
            title="Community Feed"
            action={
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 9,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Search posts…"
                    value={feedSearch}
                    onChange={(e) => setFeedSearch(e.target.value)}
                    style={{
                      padding: "6px 10px 6px 26px",
                      border: "1.5px solid var(--border)",
                      borderRadius: 9,
                      fontSize: 13,
                      fontFamily: "inherit",
                      color: "var(--text-base)",
                      background: "var(--bg-input)",
                      outline: "none",
                      width: 160,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = "var(--border)")
                    }
                  />
                </div>
                <button
                  className="btn-ghost"
                  onClick={handleRefreshFeed}
                  disabled={feedLoading}
                >
                  {feedLoading ? "⏳" : "🔄"}
                </button>
              </div>
            }
          >
            <PostForm onPost={handlePost} />
            {filteredPosts.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "var(--text-muted)",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 600 }}>
                  No posts match "{feedSearch}"
                </div>
              </div>
            ) : (
              filteredPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onLike={handleLike}
                  onShare={handleShare}
                  onComment={handleComment}
                  onDelete={handleDelete}
                  onReport={handleReport}
                />
              ))
            )}
            {!feedSearch && (
              <div style={{ textAlign: "center", marginTop: 14 }}>
                {hasMorePosts ? (
                  <button
                    className="btn-ghost"
                    onClick={handleLoadMorePosts}
                    disabled={loadingMorePosts}
                  >
                    {loadingMorePosts ? "⏳ Loading…" : "⬇ Load More Posts"}
                  </button>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    ✅ You've seen all posts
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ── Find Partners ── */}
        <div id="partners-section">
          <Section
            title="Find Language Partners"
            action={
              <button
                className="btn-ghost"
                onClick={handleRefreshPartners}
                disabled={partnerLoading}
              >
                {partnerLoading ? "⏳" : "🔄"} Refresh
              </button>
            }
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 20,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  position: "relative",
                  flex: "1 1 200px",
                  minWidth: 180,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    fontSize: 13,
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search by name or country…"
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 32px",
                    border: "1.5px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 14,
                    fontFamily: "inherit",
                    color: "var(--text-base)",
                    background: "var(--bg-input)",
                    outline: "none",
                    transition: "border-color .2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PARTNER_LANGS.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setPartnerFilter(lang)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 99,
                      fontSize: 13,
                      fontWeight: 600,
                      border: "1.5px solid",
                      borderColor:
                        partnerFilter === lang ? "#6366f1" : "var(--border)",
                      background:
                        partnerFilter === lang ? "#6366f1" : "var(--bg-card)",
                      color:
                        partnerFilter === lang ? "#fff" : "var(--text-muted)",
                      cursor: "pointer",
                      transition: "all .18s",
                      fontFamily: "inherit",
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            {incomingPartnerRequests.length > 0 && (
              <div
                style={{
                  marginBottom: 18,
                  padding: 14,
                  border: "1.5px solid var(--border)",
                  borderRadius: 12,
                  background: "var(--bg-subtle)",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--text-base)",
                    marginBottom: 10,
                  }}
                >
                  Incoming Partner Requests ({incomingPartnerRequests.length})
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {incomingPartnerRequests.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        background: "var(--bg-card)",
                        border: "1.5px solid var(--border)",
                        borderRadius: 10,
                        padding: "10px 12px",
                      }}
                    >
                      <div>
                        <div
                          style={{ fontWeight: 700, color: "var(--text-base)" }}
                        >
                          {p.name}
                        </div>
                        <div
                          style={{ fontSize: 12, color: "var(--text-muted)" }}
                        >
                          {p.country || "Unknown location"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn-coral"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          onClick={() => handleAcceptPartner(p.id)}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          onClick={() => handleRejectPartner(p.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* BACKEND INTEGRATION: GET /api/community/partners?lang=&search=&page= */}
            {filteredPartners.length > 0 ? (
              <div className="partner-grid">
                {filteredPartners.map((p) =>
                  p.status === "pending" &&
                  p.request_direction === "outgoing" ? (
                    <div
                      key={p.id}
                      style={{
                        background: "var(--bg-card)",
                        border: "1.5px solid var(--border)",
                        borderRadius: 16,
                        padding: "20px 22px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{ fontWeight: 700, color: "var(--text-base)" }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Request sent. Waiting for approval.
                      </div>
                      <button
                        className="btn-ghost"
                        style={{ justifyContent: "center", marginTop: "auto" }}
                        disabled
                      >
                        Pending
                      </button>
                    </div>
                  ) : (
                    <PartnerCard
                      key={p.id}
                      partner={p}
                      onConnect={handleConnect}
                      onDisconnect={handleDisconnect}
                      onMessage={handleMessage}
                      onCall={handleCall}
                    />
                  ),
                )}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "2.5rem 1rem",
                  background: "var(--bg-subtle)",
                  borderRadius: 14,
                  border: "1.5px dashed var(--border)",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--text-base)",
                    marginBottom: 4,
                  }}
                >
                  No partners found
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Try adjusting your search or filter
                </div>
              </div>
            )}
            {filteredPartners.length > 0 && (
              <div style={{ textAlign: "center", marginTop: 18 }}>
                {hasMorePartners ? (
                  <button
                    className="btn-ghost"
                    onClick={handleLoadMorePartners}
                    disabled={loadingMorePartners}
                  >
                    {loadingMorePartners
                      ? "⏳ Loading…"
                      : "👥 Show More Partners"}
                  </button>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    ✅ You've seen all partners
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ── Study Groups ── */}
        <div id="groups-section">
          <Section
            title="Join Study Groups"
            action={
              <button
                className="btn-coral"
                onClick={() => setShowCreateGroup(true)}
              >
                ＋ Create Group
              </button>
            }
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 16,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  position: "relative",
                  flex: "1 1 180px",
                  minWidth: 160,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    fontSize: 13,
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search groups…"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 32px",
                    border: "1.5px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 13,
                    fontFamily: "inherit",
                    color: "var(--text-base)",
                    background: "var(--bg-input)",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LEVEL_FILTERS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setGroupLevel(lvl);
                      setGroupsShown(GROUPS_PAGE_SZ);
                    }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1.5px solid",
                      borderColor:
                        groupLevel === lvl ? "#6366f1" : "var(--border)",
                      background:
                        groupLevel === lvl ? "#6366f1" : "var(--bg-card)",
                      color: groupLevel === lvl ? "#fff" : "var(--text-muted)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* BACKEND INTEGRATION: GET /api/community/groups?search=&level=&page= */}
            {visibleGroups.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem 1rem",
                  background: "var(--bg-subtle)",
                  borderRadius: 14,
                  border: "1.5px dashed var(--border)",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
                <div style={{ fontWeight: 600, color: "var(--text-base)" }}>
                  No groups found
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginTop: 4,
                  }}
                >
                  Try a different search or create your own
                </div>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {visibleGroups.map((g) => (
                  <GroupRow
                    key={g.id}
                    group={g}
                    onOpen={openGroup}
                    onJoin={handleJoinGroup}
                    onLeave={handleLeaveGroup}
                  />
                ))}
              </div>
            )}

            {/* Show more / less */}
            <div
              style={{
                textAlign: "center",
                marginTop: 16,
                display: "flex",
                gap: 10,
                justifyContent: "center",
              }}
            >
              {hasMoreGroups && (
                <button
                  className="btn-ghost"
                  onClick={() => setGroupsShown((s) => s + GROUPS_PAGE_SZ)}
                >
                  ⬇ Show More ({filteredGroups.length - groupsShown} remaining)
                </button>
              )}
              {groupsShown > GROUPS_PAGE_SZ && (
                <button
                  className="btn-ghost"
                  onClick={() => setGroupsShown(GROUPS_PAGE_SZ)}
                >
                  ⬆ Show Less
                </button>
              )}
            </div>
          </Section>
        </div>
      </main>

      {/* FAB */}
      <button
        className="btn-coral"
        onClick={() => setShowCreateGroup(true)}
        style={{
          position: "fixed",
          bottom: 26,
          right: 26,
          width: 54,
          height: 54,
          borderRadius: "50%",
          padding: 0,
          fontSize: 22,
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(99,102,241,.4)",
          zIndex: 400,
        }}
      >
        ＋
      </button>

      {/* Modals */}
      <ErrorBoundary>
        {showCreateGroup && (
          <CreateGroupModel
            onClose={() => setShowCreateGroup(false)}
            onCreate={handleCreateGroup}
          />
        )}
      </ErrorBoundary>
      <ErrorBoundary>
        {activeGroup && (
          <GroupInterface
            group={activeGroup}
            onClose={() => setActiveGroup(null)}
            notify={notify}
            onOpenDM={openDM}
            onLeaveGroup={handleLeaveGroup}
            onDeleteGroup={handleDeleteGroup}
            currentUserId={user?.id}
          />
        )}
      </ErrorBoundary>
      <ErrorBoundary>
        {dmPartner && (
          <DMModal
            partner={dmPartner}
            onClose={() => setDmPartner(null)}
            pendingIncomingCall={pendingIncomingCall}
            autoCall={dmPartner.autoCall || false}
            autoCallType={dmPartner.autoCallType || "video"}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}
