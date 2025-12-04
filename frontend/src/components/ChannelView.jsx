// src/components/ChannelView.jsx
import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

export default function ChannelView({ channel, onRemoved }) {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const channelId = channel?._id;

  const [channelData, setChannelData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChannel, setLoadingChannel] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [showJoinPopup, setShowJoinPopup] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchChannel = useCallback(async () => {
    if (!channelId) return;
    setLoadingChannel(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/channels/${channelId}`, {
        headers,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        data = { message: text };
      }

      if (!res.ok) {
        setChannelData(null);
        setError(
          data.error || data.message || `Failed to load channel (${res.status})`
        );
        setLoadingChannel(false);
        return;
      }

      setChannelData(data);

      if (!data.isMember) {
        setShowJoinPopup(true);
        setMessages([]);
      } else {
        setShowJoinPopup(false);
      }
    } catch (err) {
      console.error("fetchChannel error", err);
      setError("Network error loading channel");
    } finally {
      setLoadingChannel(false);
    }
  }, [channelId, token]);

  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    if (!channelData?.isMember) return;
    setLoadingMessages(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/messages/${channelId}`, {
        headers,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        data = { message: text };
      }

      if (res.status === 403) {
        setShowJoinPopup(true);
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      if (!res.ok) {
        setError(
          data.error || data.message || `Failed to load messages (${res.status})`
        );
        setLoadingMessages(false);
        return;
      }

      const msgs = Array.isArray(data) ? [...data].reverse() : [];
      setMessages(msgs);
    } catch (err) {
      console.error("fetchMessages error", err);
      setError("Network error loading messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [channelId, token, channelData?.isMember]);

  useEffect(() => {
    setChannelData(null);
    setMessages([]);
    setText("");
    setShowJoinPopup(false);
    if (channelId) fetchChannel();
  }, [channelId, fetchChannel]);

  useEffect(() => {
    if (channelData?.isMember) fetchMessages();
  }, [channelData?.isMember, fetchMessages]);

  const handleJoin = async () => {
    if (!channelId) return;
    setJoinLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/channels/${channelId}/join`, {
        method: "POST",
        headers,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        data = { message: text };
      }

      if (!res.ok) {
        setError(data.error || data.message || "Failed to join channel");
        setJoinLoading(false);
        return;
      }

      setChannelData({ ...data, isMember: true });
      setShowJoinPopup(false);
      setJoinLoading(false);
      fetchMessages();
    } catch (err) {
      console.error("joinChannel error", err);
      setError("Network error joining channel");
      setJoinLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !channelId) return;
    if (!channelData?.isMember) {
      setShowJoinPopup(true);
      return;
    }
    setSending(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ channelId, text }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        data = { message: text };
      }

      if (res.status === 403) {
        setShowJoinPopup(true);
        setSending(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || data.message || "Failed to send message");
        setSending(false);
        return;
      }

      setMessages((prev) => [...prev, data]);
      setText("");
    } catch (err) {
      console.error("sendMessage error", err);
      setError("Network error sending message");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!channelId) return;
    const ok = window.confirm(
      `Delete channel "${channelData?.name || channel?.name}" permanently?`
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/api/channels/${channelId}`, {
        method: "DELETE",
        headers,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        data = { message: text };
      }

      if (!res.ok) {
        alert(data.error || data.message || "Failed to delete channel");
        return;
      }

      if (onRemoved) onRemoved(channelId);
    } catch (err) {
      console.error("deleteChannel error", err);
      alert("Network error deleting channel");
    }
  };

  if (!channelId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-gray-800">Select a channel</h2>
        <p className="text-gray-600">Or join one by name or ID</p>
      </div>
    );
  }

  if (loadingChannel) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600">
        Loading channel...
      </div>
    );
  }

  if (!channelData) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-600">
        {error || "Failed to load channel"}
      </div>
    );
  }

  const isMember = !!channelData.isMember;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            {channelData.name}
          </h2>
          <p className="text-xs text-gray-500">
            {Array.isArray(channelData.members)
              ? channelData.members.length
              : 0}{" "}
            members
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchMessages}
            className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleDeleteChannel}
            className="px-3 py-1 text-sm rounded bg-red-50 text-red-600 border border-red-200"
          >
            Delete Channel
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {loadingMessages ? (
          <div className="text-gray-500 text-sm">Loading messages...</div>
        ) : !isMember ? (
          <div className="text-gray-500 text-sm">
            Join this channel to see messages.
          </div>
        ) : messages.length === 0 ? (
          <div className="text-gray-400 text-sm">No messages yet.</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender && String(m.sender._id) === String(userId);
            return (
              <div
                key={m._id}
                className={`px-3 py-2 rounded-lg max-w-xl ${
                  mine ? "ml-auto bg-blue-100" : "bg-gray-100"
                }`}
              >
                <div className="text-xs font-semibold text-gray-600 mb-0.5">
                  {mine ? "You" : m.sender?.username || "User"}
                </div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">
                  {m.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="pt-3 border-t flex items-center gap-2"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!isMember}
          placeholder={
            isMember ? "Type a message..." : "Join this channel to send messages"
          }
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={!isMember || sending}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>

      {showJoinPopup && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-semibold mb-2">
              Join “{channelData.name}”
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You are not a member of this channel. Join to see messages and
              start chatting.
            </p>
            {error && (
              <div className="text-xs text-red-600 mb-3">{error}</div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowJoinPopup(false)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinLoading}
                className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-60"
              >
                {joinLoading ? "Joining..." : "Join Channel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
