import React, { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";

export default function ChannelView({ channel, onRemoved }) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";
  const token = localStorage.getItem("token");

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState(channel.members || []);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const listRef = useRef(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/messages/${channel._id}?limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        setMessages([]);
        return;
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.messages || [];
      setMessages(arr.reverse());
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 50);
    } catch (err) {
      console.error("fetchMessages error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/channels/${channel._id}/members`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error("fetchMembers error:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchMembers();
  }, [channel._id]);

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

      if (!res.ok) return;

      const saved = await res.json();
      setMessages((prev) => [...prev, saved]);
      setMessageText("");
      setShowEmoji(false);

      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 50);
    } catch (err) {
      console.error("sendMessage error:", err);
    }
  };

  const deleteChannel = async () => {
    if (!window.confirm("Delete channel permanently?")) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`${API_URL}/api/channels/${channel._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Delete failed");
        setIsDeleting(false);
        return;
      }

      onRemoved(channel._id);
    } catch (err) {
      console.error("deleteChannel error:", err);
      setIsDeleting(false);
    }
  };

  const onlineCount = members.filter((m) => m.isOnline).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-2xl font-semibold">{channel.name}</h3>
          <div className="text-sm text-gray-500">
            {onlineCount} online • {members.length} total
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMessages}
            className="px-3 py-1 border rounded text-sm"
          >
            Refresh
          </button>
          <button
            onClick={deleteChannel}
            className="px-3 py-1 bg-red-50 text-red-600 rounded border text-sm"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Channel"}
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-auto p-2 space-y-3 bg-white/60 rounded-lg border"
      >
        {loading && (
          <div className="text-center text-gray-500">Loading...</div>
        )}
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-500">No messages yet</div>
        )}

        {messages.map((m) => (
          <div
            key={m._id || m.createdAt}
            className="p-3 rounded-lg bg-gray-100"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">
                {m.sender?.username || "User"}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(m.createdAt).toLocaleTimeString()}
              </div>
            </div>
            <div className="mt-2 text-sm whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-gray-200 pt-3 relative">
        {showEmoji && (
          <div className="absolute bottom-16 left-0 z-50">
            <EmojiPicker
              onEmojiClick={(emojiObj) =>
                setMessageText((prev) => (prev || "") + emojiObj.emoji)
              }
              theme="light"
              width={320}
              height={420}
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="px-2 py-2 text-xl border rounded-lg bg-white hover:bg-gray-100"
          >
            😀
          </button>

          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            rows={2}
            className="flex-1 border rounded-lg px-3 py-2 text-sm leading-relaxed resize-none min-h-[56px] max-h-32 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
          />

          <button
            onClick={sendMessage}
            disabled={!messageText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
