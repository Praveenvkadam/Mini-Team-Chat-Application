// src/components/ChannelView.jsx
import React, { useEffect, useRef, useState } from "react";

export default function ChannelView({ channel, onRemoved }) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";
  const token = localStorage.getItem("token");

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [membersCount, setMembersCount] = useState(channel.members ? channel.members.length : 0);
  const [isDeleting, setIsDeleting] = useState(false);

  const listRef = useRef(null);

  // fetch latest messages (initial)
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/messages/${channel._id}?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      // server returns newest-first usually; ensure oldest->newest for display
      const msgs = Array.isArray(data) ? data.reverse() : (data.messages || []).reverse();
      setMessages(msgs);
    } catch (err) {
      console.error("fetchMessages error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // sync members count from channel object if provided
    if (channel.members) setMembersCount(channel.members.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel._id]);

  // simple send message (via REST). Replace with socket emit if using sockets.
  const sendMessage = async () => {
    const text = (messageText || "").trim();
    if (!text) return;
    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channelId: channel._id, text }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Send failed");
        return;
      }
      const saved = await res.json();
      setMessages((prev) => [...prev, saved]);
      setMessageText("");
      // scroll down
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 50);
    } catch (err) {
      console.error("sendMessage error:", err);
    }
  };

  // delete channel (creator only)
  const deleteChannel = async () => {
    const confirm = window.confirm(`Delete channel "${channel.name}"? This is permanent.`);
    if (!confirm) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_URL}/api/channels/${channel._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Delete failed");
        setIsDeleting(false);
        return;
      }
      // notify parent
      onRemoved(channel._id);
    } catch (err) {
      console.error("deleteChannel error:", err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold">{channel.name}</h2>
          <div className="text-sm text-gray-600">{membersCount} member{membersCount !== 1 ? "s" : ""}</div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMessages}
            className="px-3 py-1 rounded-md border"
            title="Refresh messages"
          >
            Refresh
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 rounded-md bg-gray-100"
            title="Reload page"
          >
            Reload
          </button>
          <button
            onClick={deleteChannel}
            disabled={isDeleting}
            className="px-3 py-1 rounded-md bg-red-50 text-red-600 border"
            title="Delete channel"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Message list */}
      <div ref={listRef} className="flex-1 overflow-auto p-2 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">No messages yet</div>
        ) : (
          messages.map((m) => (
            <div key={m._id || m.createdAt} className="p-3 rounded-lg bg-gray-100">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{m.sender?.username || m.sender?.name || "User"}</div>
                <div className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-2 text-sm whitespace-pre-wrap">{m.text}</div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-3 border rounded-lg outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
          />
          <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
