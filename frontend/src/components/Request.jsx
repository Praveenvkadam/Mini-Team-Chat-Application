import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { socket, ensureSocketConnected } from "../socket";

export default function RequestPage() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [channelKey, setChannelKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [token, setToken] = useState(() => localStorage.getItem("token") || "");

  // load user + token
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      setUser(parsed || null);
    } catch (e) {
      console.error("Failed to parse user", e);
      setUser(null);
    }
    const t = localStorage.getItem("token") || "";
    setToken(t);
  }, []);

  const userIdStr =
    user ? String(user._id || user.id || user.userId || "") : "";

  // ensure socket connection
  useEffect(() => {
    if (!token) return;
    ensureSocketConnected();
  }, [token]);

  // load initial requests
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const k = params.get("channelKey") || "";
    const reqId = params.get("requestId") || "";
    if (k) setChannelKey(k);

    if (!token) return;

    const loadAll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/private-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.requests) ? data.requests : [];
        setRequests(list);
        if (!selectedRequest && list.length) {
          setSelectedRequest(list[0]);
        }
      } catch (e) {
        console.error("loadAll requests error", e);
      }
    };

    const loadById = async (id) => {
      try {
        const res = await fetch(`${API_URL}/api/private-requests/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setSelectedRequest(data);
        setRequests((prev) => {
          const exists = prev.some((r) => String(r._id) === String(data._id));
          if (exists) {
            return prev.map((r) =>
              String(r._id) === String(data._id) ? data : r
            );
          }
          return [data, ...prev];
        });
      } catch (e) {
        console.error("loadById error", e);
      }
    };

    loadAll();

    if (reqId) {
      loadById(reqId);
    }
  }, [location.search, API_URL, token]); // not depending on selectedRequest

  // REAL-TIME socket updates
  useEffect(() => {
    if (!socket || !userIdStr) return;

    const isMine = (req) => {
      if (!req) return false;
      const requesterId = req.requester?._id
        ? String(req.requester._id)
        : req.requesterId
        ? String(req.requesterId)
        : "";
      const creatorId = req.creator?._id
        ? String(req.creator._id)
        : req.creatorId
        ? String(req.creatorId)
        : "";
      return userIdStr === requesterId || userIdStr === creatorId;
    };

    const handleUpdated = (req) => {
      if (!req || !req._id) return;
      if (!isMine(req)) return;

      setRequests((prev) => {
        // if resolved, remove from list
        if (req.status && req.status !== "pending") {
          return prev.filter((r) => String(r._id) !== String(req._id));
        }
        const exists = prev.some((r) => String(r._id) === String(req._id));
        if (!exists) return [req, ...prev];
        return prev.map((r) =>
          String(r._id) === String(req._id) ? req : r
        );
      });

      setSelectedRequest((prev) => {
        if (!prev) return prev;
        if (String(prev._id) !== String(req._id)) return prev;
        // if resolved, close details
        if (req.status && req.status !== "pending") return null;
        return req;
      });
    };

    const handleCreated = (req) => {
      if (!req || !req._id) return;
      if (!isMine(req)) return;

      setRequests((prev) => {
        const exists = prev.some((r) => String(r._id) === String(req._id));
        if (exists) return prev;
        return [req, ...prev];
      });

      setSelectedRequest((prev) => prev || req);
    };

    socket.on("private-request:updated", handleUpdated);
    socket.on("private-request:created", handleCreated);

    return () => {
      socket.off("private-request:updated", handleUpdated);
      socket.off("private-request:created", handleCreated);
    };
  }, [userIdStr]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmed = channelKey.trim();
    if (!trimmed) {
      setError("Channel ID or name is required.");
      return;
    }

    if (!token) {
      setError("You must be logged in to send a request.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/private-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channelKey: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Failed to send request.");
        setSubmitting(false);
        return;
      }

      setRequests((prev) => {
        const exists = prev.some((r) => String(r._id) === String(data._id));
        if (exists) {
          return prev.map((r) =>
            String(r._id) === String(data._id) ? data : r
          );
        }
        return [data, ...prev];
      });
      setSelectedRequest(data);
      setSubmitting(false);
    } catch (err) {
      console.error("Request submit error:", err);
      setError("Network error while sending request.");
      setSubmitting(false);
    }
  };

  const creatorIdStr =
    selectedRequest && selectedRequest.creator
      ? String(
          selectedRequest.creator._id || selectedRequest.creator.id || ""
        )
      : selectedRequest && selectedRequest.creatorId
      ? String(selectedRequest.creatorId)
      : "";

  const requesterIdStr =
    selectedRequest && selectedRequest.requester
      ? String(
          selectedRequest.requester._id || selectedRequest.requester.id || ""
        )
      : selectedRequest && selectedRequest.requesterId
      ? String(selectedRequest.requesterId)
      : "";

  const isCreator = userIdStr && creatorIdStr && userIdStr === creatorIdStr;
  const isRequester =
    userIdStr && requesterIdStr && userIdStr === requesterIdStr;

  const handleAction = async (action) => {
    if (!selectedRequest || !token) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/private-requests/${selectedRequest._id}/${action}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Action failed.");
        setActionLoading(false);
        return;
      }

      // update local state
      setRequests((prev) => {
        if (data.status && data.status !== "pending") {
          // remove resolved
          return prev.filter((r) => String(r._id) !== String(data._id));
        }
        return prev.map((r) =>
          String(r._id) === String(data._id) ? data : r
        );
      });

      // if resolved, close details; else keep
      if (data.status && data.status !== "pending") {
        setSelectedRequest(null);
      } else {
        setSelectedRequest(data);
      }

      setActionLoading(false);
    } catch (err) {
      console.error("Action error:", err);
      setError("Network error while updating request.");
      setActionLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    if (status === "approved") {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-600/20 text-green-300">
          Approved
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-600/20 text-red-300">
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300">
        Pending
      </span>
    );
  };

  // Only pending requests in "Your Requests" list
  const pendingRequests = requests.filter(
    (r) => (r.status || "pending") === "pending"
  );

  return (
    <div className="min-h-screen bg-slate-950 pt-20 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">
              Private Channel Request
            </h1>
            <button
              onClick={() => navigate("/home")}
              className="text-xs px-3 py-1 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              Back
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-700/60 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-200">
                Channel ID or Channel Name
              </label>
              <input
                type="text"
                value={channelKey}
                onChange={(e) => setChannelKey(e.target.value)}
                placeholder="Enter channel ID or name"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-slate-400">
                You can send a request for any private channel. Existing
                requests are listed below.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/home")}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70"
              >
                {submitting ? "Sending..." : "Submit Request"}
              </button>
            </div>
          </form>
        </div>

        {selectedRequest && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-slate-300">
                  Channel:{" "}
                  <span className="font-semibold text-white">
                    {selectedRequest.channel?.name || "Unknown"}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Requester:{" "}
                  <span className="text-slate-200">
                    {selectedRequest.requester?.username || "User"}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Creator:{" "}
                  <span className="text-slate-200">
                    {selectedRequest.creator?.username || "Creator"}
                  </span>
                </div>
              </div>
              {renderStatusBadge(selectedRequest.status || "pending")}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="text-sm text-slate-200">
                {isRequester && (
                  <>
                    You requested to join{" "}
                    <span className="font-semibold">
                      {selectedRequest.channel?.name}
                    </span>
                    . The channel creator can approve or reject this request.
                  </>
                )}
                {isCreator && !isRequester && (
                  <>
                    <span className="font-semibold">
                      {selectedRequest.requester?.username || "A user"}
                    </span>{" "}
                    requested to join your private channel{" "}
                    <span className="font-semibold">
                      {selectedRequest.channel?.name}
                    </span>
                    .
                  </>
                )}
                {!isCreator && !isRequester && (
                  <>You are not authorized to view this request.</>
                )}
              </div>

              {(isRequester || isCreator) && (
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <div className="flex flex-col gap-2">
                    {isCreator && selectedRequest.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleAction("approve")}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-70"
                        >
                          {actionLoading ? "Saving..." : "Approve"}
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleAction("reject")}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-70"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {isRequester && selectedRequest.status === "pending" && (
                      <span className="text-xs text-slate-400">
                        Waiting for creator approval…
                      </span>
                    )}

                    {isRequester && selectedRequest.status === "approved" && (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-green-300">
                          Your request has been approved. Accept and join the
                          channel.
                        </span>
                        <button
                          onClick={() => navigate("/home")}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Join Channel
                        </button>
                      </div>
                    )}

                    {isRequester && selectedRequest.status === "rejected" && (
                      <span className="text-xs text-red-300">
                        Your request was rejected.
                      </span>
                    )}

                    {isCreator && selectedRequest.status === "approved" && (
                      <span className="text-xs text-slate-400">
                        Request approved. The requester can now join the
                        channel from their side.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Your Requests
          </h2>
          {pendingRequests.length === 0 ? (
            <div className="text-xs text-slate-400">
              You have no pending private channel requests.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((req) => {
                const isReq =
                  userIdStr &&
                  (req.requester?._id
                    ? String(req.requester._id) === userIdStr
                    : String(req.requesterId || "") === userIdStr);
                const roleLabel = isReq ? "Requester" : "Creator";
                const status = req.status || "pending";
                return (
                  <button
                    key={req._id}
                    onClick={() => setSelectedRequest(req)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs ${
                      selectedRequest &&
                      String(selectedRequest._id) === String(req._id)
                        ? "bg-slate-800"
                        : "bg-slate-950 hover:bg-slate-800"
                    }`}
                  >
                    <div>
                      <div className="text-slate-100">
                        {req.channel?.name || "Unknown channel"}
                      </div>
                      <div className="text-slate-400">
                        {roleLabel} • {status}
                      </div>
                    </div>
                    {renderStatusBadge(status)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
