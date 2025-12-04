import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ChannelView from "../components/ChannelView";
import { socket } from "../socket";

const MenuIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UsersIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M17 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RefreshIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M21 12a9 9 0 10-3.1 6.6L21 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Home() {
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [members, setMembers] = useState([]);
  const [joinChannelInput, setJoinChannelInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const buildHeaders = useCallback(() => {
    const h = { Accept: "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const handleAuthError = useCallback(async (res) => {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      setToken(null);
      navigate("/login");
      return true;
    }
    return false;
  }, [navigate]);

  const short = (id) => (id ? id.toString().slice(0, 8) + (id.toString().length > 8 ? "…" : "") : "");

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/channels`, { headers: buildHeaders() });
      if (await handleAuthError(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(async () => ({ message: await res.text() }));
        setChannels([]);
        setSelectedChannel(null);
        setMembers([]);
        setError(body.error || body.message || "Failed to load channels");
        return;
      }
      const data = await res.json();
      setChannels(data.channels || []);
      setSelectedChannel((prev) => prev || (data.channels && data.channels[0]) || null);
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [API_URL, buildHeaders, handleAuthError]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const fetchMembers = useCallback(async (id) => {
    if (!id) {
      setMembers([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/channels/${id}/members`, { headers: buildHeaders() });
      if (await handleAuthError(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(async () => ({ message: await res.text() }));
        setMembers([]);
        setError(body.error || body.message || "Failed to load members");
        return;
      }
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      setError("Network error");
    }
  }, [API_URL, buildHeaders, handleAuthError]);

  useEffect(() => {
    if (selectedChannel && selectedChannel._id) fetchMembers(selectedChannel._id);
    else setMembers([]);
  }, [selectedChannel, fetchMembers]);

  useEffect(() => {
    function presence({ userId, isOnline, lastSeen }) {
      setMembers((prev) =>
        prev.map((m) =>
          String(m._id) === String(userId)
            ? { ...m, isOnline, lastSeen: lastSeen || m.lastSeen }
            : m
        )
      );
    }
    socket.on("presence:update", presence);
    return () => socket.off("presence:update", presence);
  }, []);

  const filteredChannels = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return q ? channels.filter((c) => (c.name || "").toLowerCase().includes(q)) : channels;
  }, [channels, query]);

  const joinChannel = useCallback(async () => {
    const raw = joinChannelInput.trim();
    if (!raw) return;
    try {
      const res = await fetch(`${API_URL}/api/channels/${encodeURIComponent(raw)}/join`, {
        method: "POST",
        headers: buildHeaders(),
      });
      if (await handleAuthError(res)) return;
      if (!res.ok) {
        const body = await res.json().catch(async () => ({ message: await res.text() }));
        alert(body.error || body.message || "Join failed");
        return;
      }
      const data = await res.json();
      setChannels((prev) => (prev.some((c) => c._id === data._id) ? prev : [...prev, data]));
      setSelectedChannel(data);
      setJoinChannelInput("");
      setMobileLeftOpen(false);
    } catch {
      setError("Network error");
    }
  }, [API_URL, buildHeaders, joinChannelInput, handleAuthError]);

  const handleChannelRemoved = useCallback((id) => {
    setChannels((prev) => prev.filter((c) => c._id !== id));
    setSelectedChannel((prev) => (prev && prev._id === id ? null : prev));
    setMembers([]);
  }, []);

  const renderMemberCard = (m) => {
    const name = m.name || m.username || m.email || "User";
    const initial = name[0]?.toUpperCase() || "U";
    const online = Boolean(m.isOnline);

    return (
      <div key={m._id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
        {m.profileUrl ? (
          <img src={m.profileUrl} alt={name} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-semibold">
            {initial}
          </div>
        )}

        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700">{name}</div>
          {m.email && <div className="text-xs text-gray-500">{m.email}</div>}
        </div>

        <span className={`w-3 h-3 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 to-violet-600 mt-16">
      <Navbar />

      <button onClick={() => setMobileLeftOpen((v) => !v)} className="md:hidden fixed left-3 top-20 z-50 p-2 rounded-lg bg-white text-gray-800 shadow">
        <MenuIcon />
      </button>

      <button onClick={() => setMobileRightOpen((v) => !v)} className="md:hidden fixed right-3 top-20 z-50 p-2 rounded-lg bg-white text-gray-800 shadow">
        <UsersIcon />
      </button>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start gap-6">
          <aside className="hidden md:block md:w-72 lg:w-80">
            <div className="bg-white rounded-lg p-4 h-[calc(100vh-96px)] overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-900 font-semibold">Channels</h3>
                <button onClick={fetchChannels} className="text-sm bg-gray-200 px-2 py-1 rounded flex items-center gap-2 text-gray-800">
                  <RefreshIcon /> Refresh
                </button>
              </div>

              <div className="mb-4">
                <label className="relative block">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <SearchIcon />
                  </span>
                  <input
                    placeholder="Search by channel name"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 pr-3 py-2 w-full rounded bg-gray-100 text-gray-800"
                  />
                </label>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-200 h-14 rounded" />
                  ))}
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="text-gray-700">No channels yet</div>
              ) : (
                <ul className="space-y-3">
                  {filteredChannels.map((ch) => {
                    const active = selectedChannel && selectedChannel._id === ch._id;
                    return (
                      <li
                        key={ch._id}
                        onClick={() => setSelectedChannel(ch)}
                        className={`p-3 rounded-lg cursor-pointer ${active ? "bg-blue-200" : "bg-gray-100 hover:bg-gray-200"}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-gray-900 font-medium truncate">{ch.name}</div>
                            <div className="text-xs text-gray-600 truncate">ID: {short(ch._id)}</div>
                          </div>
                          <div className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full ml-3">
                            {Array.isArray(ch.members) ? ch.members.length : "—"}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-4 pt-3 border-t border-gray-300">
                <div className="flex gap-2">
                  <input
                    value={joinChannelInput}
                    onChange={(e) => setJoinChannelInput(e.target.value)}
                    placeholder="Channel name or ID"
                    className="flex-1 p-2 border rounded bg-gray-100 text-gray-800"
                  />
                  <button onClick={joinChannel} className="px-3 py-2 rounded bg-emerald-500 text-white">
                    Join
                  </button>
                </div>
              </div>

              {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-lg p-4 h-[calc(100vh-96px)] flex flex-col">
              {selectedChannel ? (
                <ChannelView channel={selectedChannel} onRemoved={handleChannelRemoved} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <h2 className="text-2xl font-bold text-gray-800">Select a channel</h2>
                  <p className="text-gray-600">Or join one</p>
                </div>
              )}
            </div>
          </main>

          <aside className="hidden md:block md:w-72 lg:w-80">
            <div className="bg-white/95 rounded-lg p-4 h-[calc(100vh-96px)] overflow-auto">
              {selectedChannel ? (
                <>
                  <h4 className="text-gray-800 font-semibold">{selectedChannel.name}</h4>
                  <p className="text-sm text-gray-600">{members.length} members</p>

                  <div className="mt-4 space-y-3">
                    {members && members.length ? members.map(renderMemberCard) : <div className="text-sm text-gray-600">No members</div>}
                  </div>

                  <div className="mt-4">
                    <button onClick={fetchChannels} className="w-full py-2 bg-gray-100 rounded">
                      Refresh
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600">Select a channel to see details</div>
              )}
            </div>
          </aside>

          {mobileRightOpen && (
            <div className="md:hidden fixed inset-0 z-40">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileRightOpen(false)} />
              <div className="absolute right-3 top-20 w-[86%] max-w-xs bg-white rounded-lg p-4 shadow-lg h-[calc(100vh-140px)] overflow-auto">
                <h4 className="text-gray-800 font-semibold">{selectedChannel?.name}</h4>
                <p className="text-sm text-gray-600">{members.length} members</p>
                <div className="mt-4 space-y-3">{members.map(renderMemberCard)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
