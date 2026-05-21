import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  fetchFriends,
  fetchFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  searchUsers,
} from "../../services/api";

export default function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!searchEmail) return setSearchResults([]);
      try {
        const res = await searchUsers(searchEmail);
        setSearchResults(res.users || []);
      } catch (e) {
        console.error(e);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchEmail]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const f = await fetchFriends();
      const r = await fetchFriendRequests();
      if (!mounted) return;
      setFriends(f || []);
      setRequests(r || { incoming: [], outgoing: [] });
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSend = async () => {
    const receiver_id = selectedUserId || searchEmail;
    if (!receiver_id) return;
    try {
      await sendFriendRequest({
        receiver_id,
        message: "Hi! Let's practice together.",
      });
      const r = await fetchFriendRequests();
      setRequests(r);
      setSearchEmail("");
      setSearchResults([]);
      setSelectedUserId("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAccept = async (id) => {
    try {
      await acceptFriendRequest(id);
      const f = await fetchFriends();
      const r = await fetchFriendRequests();
      setFriends(f);
      setRequests(r);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="container" style={{ paddingTop: "80px" }}>
      <h1>Friends</h1>
      <div style={{ marginBottom: "1rem" }}>
        <input
          placeholder="Search users by name or email"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
        />
        <div style={{ position: "relative" }}>
          {searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                background: "#fff",
                border: "1px solid #ddd",
                zIndex: 20,
                width: 360,
              }}
            >
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  style={{ padding: 8, cursor: "pointer" }}
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setSearchEmail(u.name);
                    setSearchResults([]);
                  }}
                >
                  {u.name} · {u.email}
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={handleSend}>Send Request</button>
      </div>

      <h2>Incoming Requests</h2>
      {requests.incoming.length === 0 && <p>No incoming requests</p>}
      {requests.incoming.map((r) => (
        <div
          key={r.id}
          style={{ display: "flex", gap: "1rem", alignItems: "center" }}
        >
          <div>{r.requester_id}</div>
          <div>{r.message}</div>
          <button onClick={() => handleAccept(r.id)}>Accept</button>
        </div>
      ))}

      <h2>Your Friends</h2>
      {friends.length === 0 && <p>No friends yet</p>}
      {friends.map((f) => (
        <div key={f.id} style={{ padding: "0.5rem 0" }}>
          {f.name} · {f.preferred_language}
        </div>
      ))}
    </div>
  );
}
