// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ChannelView from "../components/ChannelView"; // new component
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [joinChannelId, setJoinChannelId] = useState("");
  const [selectedChannel, setSelectedChannel] = useState(null); // <-- selected channel object

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";
  const token = localStorage.getItem("token");

  // load joined channels
  const fetchChannels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/channels/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setChannels(data.channels || []);
      // if none selected, optionally auto-select first:
      if (!selectedChannel && data.channels && data.channels.length > 0) {
        setSelectedChannel(data.channels[0]);
      }
    } catch (err) {
      console.error("Fetch channels error:", err);
    }
  };

  useEffect(() => {
    fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join a channel and select it
  const joinChannel = async () => {
    if (!joinChannelId.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/channels/${joinChannelId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Join failed");
        return;
      }
      setChannels((prev) => (prev.some((c) => c._id === data._id) ? prev : [...prev, data]));
      setJoinChannelId("");
      setSelectedChannel(data); // select immediately
    } catch (err) {
      console.error("Join channel error:", err);
    }
  };

  // when user clicks sidebar entry
  const handleSelectChannel = (ch) => {
    setSelectedChannel(ch);
  };

  // called by ChannelView when channel was deleted or user leaves
  const handleChannelRemoved = (channelId) => {
    setChannels((prev) => prev.filter((c) => c._id !== channelId));
    setSelectedChannel(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600">
      <Navbar />

      <div className="flex pt-8 px-4 sm:px-6 lg:px-8">
        {/* SIDEBAR */}
        <aside className="w-72 bg-white/20 backdrop-blur-md text-white rounded-2xl shadow-lg p-6 mr-6 h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Joined Channels</h2>

          {channels.length === 0 ? (
            <p className="opacity-80">No channels joined yet.</p>
          ) : (
            <ul className="space-y-2">
              {channels.map((ch) => (
                <li
                  key={ch._id}
                  onClick={() => handleSelectChannel(ch)}
                  className={`p-3 cursor-pointer rounded-lg border transition ${
                    selectedChannel && selectedChannel._id === ch._id
                      ? "bg-white/30 border-white/40"
                      : "bg-white/10 hover:bg-white/20 border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{ch.name}</div>
                      <p className="text-xs opacity-70">ID: {ch._id}</p>
                    </div>
                    <div>
                      {/* simple badge */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white text-blue-700">
                        {ch.members ? ch.members.length : "—"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* MAIN PANEL */}
        <main className="flex-1 bg-white shadow-xl rounded-2xl p-6 min-h-[70vh]">
          {!selectedChannel ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">No channel selected</h1>
              <p className="text-gray-600 mb-4">Select a channel from the left or join one using its ID.</p>

              <div className="w-full max-w-md">
                <input
                  type="text"
                  placeholder="Channel ID..."
                  value={joinChannelId}
                  onChange={(e) => setJoinChannelId(e.target.value)}
                  className="w-full p-3 rounded-lg border mb-3"
                />
                <button
                  onClick={joinChannel}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg"
                >
                  Join Channel
                </button>
              </div>
            </div>
          ) : (
            <ChannelView
              key={selectedChannel._id}
              channel={selectedChannel}
              onRemoved={handleChannelRemoved}
            />
          )}
        </main>
      </div>
    </div>
  );
}
