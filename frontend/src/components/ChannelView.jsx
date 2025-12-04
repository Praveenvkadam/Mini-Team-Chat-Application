import { useEffect, useState, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

export default function ChannelView({ channelId }) {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChannel, setLoadingChannel] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [popup, setPopup] = useState(false);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchChannel = useCallback(async () => {
    if (!channelId) return;
    setLoadingChannel(true);

    const res = await fetch(`${API_URL}/api/channels/${channelId}`, {
      headers: authHeaders,
    });

    const data = await res.json();
    setChannel(data);

    if (!data.isMember) {
      setPopup(true);
    } else {
      setPopup(false);
      fetchMessages();
    }

    setLoadingChannel(false);
  }, [channelId]);

  const fetchMessages = async () => {
    if (!channelId) return;
    setLoadingMessages(true);

    const res = await fetch(`${API_URL}/api/messages/${channelId}`, {
      headers: authHeaders,
    });

    if (res.status === 403) {
      setPopup(true);
      setLoadingMessages(false);
      return;
    }

    const data = await res.json();
    setMessages(data.reverse());
    setLoadingMessages(false);
  };

  const handleJoin = async () => {
    setJoinLoading(true);

    const res = await fetch(`${API_URL}/api/channels/${channelId}/join`, {
      method: "POST",
      headers: authHeaders,
    });

    const data = await res.json();
    setJoinLoading(false);

    if (res.status === 200) {
      setChannel(data);
      setPopup(false);
      fetchMessages();
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);

    const res = await fetch(`${API_URL}/api/messages`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ channelId, text }),
    });

    if (res.status === 403) {
      setPopup(true);
      setSending(false);
      return;
    }

    const msg = await res.json();
    setMessages((prev) => [...prev, msg]);
    setText("");
    setSending(false);
  };

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  if (!channelId) return <div>Select a channel</div>;
  if (loadingChannel) return <div>Loading channel...</div>;
  if (!channel) return <div>Channel not found</div>;

  return (
    <div className="relative h-full flex flex-col bg-white rounded-xl shadow">
      <div className="px-4 py-3 border-b flex justify-between">
        <div>
          <h2 className="font-bold">{channel.name}</h2>
          <p className="text-xs text-gray-500">
            {channel.members?.length || 0} members
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loadingMessages ? (
          <div>Loading messages...</div>
        ) : (
          messages.map((m) => (
            <div key={m._id} className="bg-gray-100 rounded-lg p-2">
              <div className="text-xs font-semibold">
                {m.sender?.username || "User"}
              </div>
              <div>{m.text}</div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
        <input
          disabled={!channel.isMember}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            channel.isMember ? "Type message..." : "Join to send messages"
          }
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          disabled={!channel.isMember || sending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-60"
        >
          Send
        </button>
      </form>

      {popup && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-80 text-center space-y-4">
            <div className="font-bold text-lg">Join {channel.name}</div>
            <div className="text-sm text-gray-600">
              Join to see messages and chat with members.
            </div>
            <button
              onClick={handleJoin}
              disabled={joinLoading}
              className="bg-blue-600 w-full text-white py-2 rounded-lg disabled:opacity-60"
            >
              {joinLoading ? "Joining..." : "Join Channel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
