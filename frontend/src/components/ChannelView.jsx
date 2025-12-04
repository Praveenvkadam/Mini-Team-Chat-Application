import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";

let socketInstance = null;

export default function ChannelView({ channel, onRemoved }) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState(channel.members || []);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);

  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const getUserId = (u) => {
    if (!u) return null;
    return u._id || u.id || u.userId || null;
  };

  const ensureSocket = () => {
    if (socketInstance) return socketInstance;
    socketInstance = io(API_URL, {
      auth: currentUser
        ? { user: { _id: getUserId(currentUser), username: currentUser.username } }
        : {},
      transports: ["websocket"],
    });
    return socketInstance;
  };

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

  useEffect(() => {
    if (!currentUser) return;
    const socket = ensureSocket();

    socket.emit("join:channel", { channelId: channel._id });

    const handleTyping = ({ userId, username, channelId, isTyping }) => {
      if (channelId !== channel._id) return;
      const currentId = getUserId(currentUser);
      if (currentId && userId === String(currentId)) return;
      setTypingUsers((prev) => {
        if (isTyping) {
          const exists = prev.some((u) => u.userId === userId);
          if (exists) return prev;
          return [...prev, { userId, username }];
        } else {
          return prev.filter((u) => u.userId !== userId);
        }
      });
    };

    socket.on("typing", handleTyping);

    return () => {
      socket.emit("leave:channel", { channelId: channel._id });
      socket.off("typing", handleTyping);
    };
  }, [channel._id, currentUser]);

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

      const socket = socketInstance;
      if (socket && isTypingRef.current) {
        socket.emit("typing", { channelId: channel._id, isTyping: false });
        isTypingRef.current = false;
      }

      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 50);
    } catch (err) {
      console.error("sendMessage error:", err);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageText(value);

    const socket = socketInstance;
    if (!socket || !currentUser) return;

    if (value.trim() && !isTypingRef.current) {
      socket.emit("typing", { channelId: channel._id, isTyping: true });
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        socket.emit("typing", { channelId: channel._id, isTyping: false });
        isTypingRef.current = false;
      }
    }, 2000);
  };

  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async (messageId) => {
    const text = (editText || "").trim();
    if (!text) return;
    try {
      setIsSavingEdit(true);
      const res = await fetch(`${API_URL}/api/messages/${messageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        console.error("edit message failed");
        return;
      }
      const updated = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? updated : m))
      );
      setEditingId(null);
      setEditText("");
    } catch (err) {
      console.error("saveEdit error:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deleteMessageItem = async (messageId) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      setDeletingMessageId(messageId);
      const res = await fetch(`${API_URL}/api/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("delete message failed");
        return;
      }

      setMessages((prev) => prev.filter((m) => m._id !== messageId));

      if (editingId === messageId) {
        setEditingId(null);
        setEditText("");
      }
    } catch (err) {
      console.error("deleteMessageItem error:", err);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const deleteChannel = async () => {
    if (!window.confirm("Delete channel permanently?")) return;

    try {
      setIsDeletingChannel(true);
      const res = await fetch(`${API_URL}/api/channels/${channel._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Delete failed");
        setIsDeletingChannel(false);
        return;
      }

      onRemoved(channel._id);
    } catch (err) {
      console.error("deleteChannel error:", err);
      setIsDeletingChannel(false);
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
            disabled={isDeletingChannel}
          >
            {isDeletingChannel ? "Deleting..." : "Delete Channel"}
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

        {messages.map((m) => {
          const senderId =
            typeof m.sender === "string"
              ? m.sender
              : getUserId(m.sender);
          const currentId = getUserId(currentUser);
          const isOwn = currentId && senderId && String(currentId) === String(senderId);
          const displayName =
            m.sender?.username || currentUser?.username || "User";

          return (
            <div
              key={m._id || m.createdAt}
              className="p-3 rounded-lg bg-gray-100"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">
                  {isOwn ? "You" : displayName}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                  {editingId !== m._id && isOwn && (
                    <>
                      <button
                        className="px-2 py-0.5 border rounded"
                        onClick={() => startEdit(m)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-2 py-0.5 border rounded text-red-600"
                        onClick={() => deleteMessageItem(m._id)}
                        disabled={deletingMessageId === m._id}
                      >
                        {deletingMessageId === m._id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingId === m._id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm leading-relaxed resize-none min-h-[56px] max-h-32 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      className="px-3 py-1 border rounded text-sm"
                      onClick={cancelEdit}
                      disabled={isSavingEdit}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                      onClick={() => saveEdit(m._id)}
                      disabled={isSavingEdit || !editText.trim()}
                    >
                      {isSavingEdit ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm whitespace-pre-wrap">
                  {m.text}
                </div>
              )}
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div className="p-3 rounded-lg bg-gray-100 inline-flex items-center gap-2 text-sm text-gray-500 w-fit">
            <span>
              {typingUsers.map((u) => u.username || "Someone").join(", ")}{" "}
              typing
            </span>
            <span className="flex gap-1 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.1s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" />
            </span>
          </div>
        )}
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
            onChange={handleInputChange}
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
