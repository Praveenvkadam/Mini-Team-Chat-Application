// src/components/CreateChannel.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * CreateChannel.jsx
 *
 * - Shows a form: channel name, capacity, public/private.
 * - POSTs to /api/channels with JSON { name, isPrivate, capacity }.
 * - On success, shows a "channel view" header with channel name and members count.
 * - Provides Delete Channel button (DELETE /api/channels/:id).
 *
 * Notes:
 * - Assumes JWT in localStorage.token
 * - Tailwind for styling
 */

export default function CreateChannel() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [isPrivate, setIsPrivate] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [channel, setChannel] = useState(null); // created channel object
  const [deleting, setDeleting] = useState(false);

  // Create channel handler
  const handleCreate = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Channel name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          isPrivate: Boolean(isPrivate),
          capacity: Number(capacity) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Failed to create channel");
        setLoading(false);
        return;
      }

      // Expect backend to return created channel (with members array)
      setChannel(data);
      setLoading(false);
    } catch (err) {
      console.error("Create channel error:", err);
      setError("Network error creating channel");
      setLoading(false);
    }
  };

  // Delete channel handler
  const handleDelete = async () => {
    if (!channel) return;
    const confirm = window.confirm(
      `Delete channel "${channel.name}" permanently? This cannot be undone.`
    );
    if (!confirm) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/channels/${channel._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete channel");
        setDeleting(false);
        return;
      }

      // success: navigate back to home or reset
      setDeleting(false);
      navigate("/");
      // alternatively: setChannel(null) and refresh parent list if integrated
    } catch (err) {
      console.error("Delete channel error:", err);
      setDeleting(false);
      alert("Network error deleting channel");
    }
  };

  // Render: if channel exists show channel view, else show create form
  if (channel) {
    const membersCount = Array.isArray(channel.members)
      ? channel.members.length
      : // some backends return membersCount or similar
        channel.membersCount || 1;

    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{channel.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {membersCount} member{membersCount === 1 ? "" : "s"} joined
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/channel/${channel._id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Open Channel
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete Channel"}
              </button>
            </div>
          </div>

          {/* Show some channel metadata */}
          <div className="mt-6 text-gray-700">
            <div className="flex gap-4">
              <div>
                <span className="block text-xs text-gray-500">Visibility</span>
                <div className="mt-1 font-medium">{channel.isPrivate ? "Private" : "Public"}</div>
              </div>

              <div>
                <span className="block text-xs text-gray-500">Capacity</span>
                <div className="mt-1 font-medium">{channel.capacity ?? "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create form
  return (
    <div className="max-w-xl mx-auto">
      <form
        onSubmit={handleCreate}
        className="bg-white shadow rounded-2xl p-6 space-y-4"
        aria-label="Create channel form"
      >
        <h2 className="text-xl font-semibold text-gray-800">Create Channel</h2>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700">Channel name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. developers"
            className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Capacity (max members)</label>
          <input
            type="number"
            value={capacity}
            min={1}
            onChange={(e) => setCapacity(e.target.value)}
            className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="text-sm text-gray-700">Private channel (invite-only)</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-70"
          >
            {loading ? "Creating..." : "Create Channel"}
          </button>
        </div>
      </form>
    </div>
  );
}
