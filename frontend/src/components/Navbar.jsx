import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import UpdateProfile from "./UpdateProfile";
import CreateChannel from "./Createchannel";

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showFullId, setShowFullId] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem("user");
        const parsed = raw ? JSON.parse(raw) : null;
        setUser(parsed);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    };

    load();
    const onStorage = (e) => {
      if (e.key === "user") load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const anyOpen = showProfileModal || showCreateModal;
    if (anyOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showProfileModal, showCreateModal]);

  useEffect(() => {
    const anyOpen = showProfileModal || showCreateModal;
    if (!anyOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowProfileModal(false);
        setShowCreateModal(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showProfileModal, showCreateModal]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setProfileOpen(false);
    setMobileOpen(false);
    setShowProfileModal(false);
    setShowCreateModal(false);
    navigate("/");
  }, [navigate]);

  const shortCode = (id = "") => {
    if (!id) return "";
    const s = id.toString();
    return s.length > 12 ? `${s.slice(0, 8)}…` : s;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied ID to clipboard");
    } catch (e) {
      console.error("copy failed", e);
      alert("Copy failed");
    }
  };

  const Avatar = ({ size = 40 }) => {
    if (!user) {
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-slate-700 flex items-center justify-center text-sm text-slate-200"
        >
          ?
        </div>
      );
    }

    if (user.profileUrl) {
      return (
        <img
          src={user.profileUrl}
          alt="avatar"
          style={{ width: size, height: size }}
          className="rounded-full object-cover border border-slate-600"
        />
      );
    }

    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm"
      >
        {(user.username || "U").slice(0, 2).toUpperCase()}
      </div>
    );
  };

  const userId = (user && (user._id || user.id || user.code)) || "";

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[9999] border-b border-slate-800 bg-slate-900/85 backdrop-blur"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3"
              onClick={() => {
                setMobileOpen(false);
                setProfileOpen(false);
              }}
            >
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                WebChat
              </span>
              <span className="hidden sm:inline text-xs text-slate-300">
                Realtime chat
              </span>
            </Link>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => {
                setProfileOpen(false);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
            >
              + Create Channel
            </button>

            {!user ? (
              <button
                onClick={() => navigate("/signin")}
                className="px-3 py-2 rounded-lg border border-slate-600 text-sm text-slate-100 hover:bg-slate-800 transition-colors"
              >
                Login
              </button>
            ) : (
              <div className="relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setProfileOpen((p) => !p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setProfileOpen((p) => !p);
                    }
                  }}
                  className="flex items-center gap-3 px-3 py-1 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                >
                  <Avatar />
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium text-slate-100">
                      {user.username}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {showFullId
                          ? userId || "—"
                          : `Code: ${shortCode(userId)}`}
                      </span>
                      {userId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFullId((s) => !s);
                          }}
                          className="text-xs text-blue-300 px-2 py-0.5 rounded hover:bg-slate-800"
                          aria-label="toggle id display"
                        >
                          {showFullId ? "Hide" : "Show"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-lg py-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <Avatar size={40} />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-100">
                            {user.username}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {user.email || ""}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            ID: {shortCode(userId)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setShowProfileModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
                    >
                      Edit Profile
                    </button>

                    {userId && (
                      <button
                        onClick={() => copyToClipboard(userId)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 flex items-center justify-between"
                      >
                        <span>Copy ID</span>
                        <span className="text-xs text-slate-400">
                          {shortCode(userId)}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={logout}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-800"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-3">
            {user && (
              <button
                onClick={() => setProfileOpen((p) => !p)}
                className="flex items-center"
                aria-label="Open profile menu"
              >
                <Avatar size={34} />
              </button>
            )}

            <button
              onClick={() => {
                setMobileOpen((o) => !o);
                setProfileOpen(false);
              }}
              className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-700 text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              aria-label={mobileOpen ? "Close main menu" : "Open main menu"}
              aria-expanded={mobileOpen}
            >
              <span className="sr-only">Toggle main menu</span>

              <div className="space-y-1.5">
                <span
                  className={`block h-0.5 w-6 bg-cyan-400 transition-transform transform origin-center ${
                    mobileOpen ? "translate-y-1.5 rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-6 bg-cyan-400 transition-opacity ${
                    mobileOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`block h-0.5 w-6 bg-cyan-400 transition-transform transform origin-center ${
                    mobileOpen ? "-translate-y-1.5 -rotate-45" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900">
            <div className="px-4 py-3 space-y-2">
              {user ? (
                <>
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-800 mb-2">
                    <Avatar size={40} />
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {user.username}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {user.email || ""}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        ID: {shortCode(userId)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setShowCreateModal(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white"
                  >
                    + Create Channel
                  </button>

                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-100 hover:bg-slate-800"
                  >
                    Edit Profile
                  </button>

                  {userId && (
                    <button
                      onClick={() => {
                        copyToClipboard(userId);
                        setMobileOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-100 hover:bg-slate-800"
                    >
                      Copy ID
                    </button>
                  )}

                  <button
                    onClick={() => {
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setShowCreateModal(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white"
                  >
                    + Create Channel
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      navigate("/signin");
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-100 hover:bg-slate-800"
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Profile modal */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowProfileModal(false)}
          />

          <div
            className="relative z-50 w-full max-w-3xl mx-4 sm:mx-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Edit profile
                </h3>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-slate-400 hover:text-slate-200 px-2 py-1 rounded"
                  aria-label="Close profile editor"
                >
                  ✕
                </button>
              </div>

              <UpdateProfile onClose={() => setShowProfileModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Create Channel modal — more blue */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-blue-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowCreateModal(false)}
          />

          <div
            className="relative z-50 w-full max-w-3xl mx-4 sm:mx-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 rounded-2xl border border-blue-800 shadow-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Create Channel
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-200 px-2 py-1 rounded"
                  aria-label="Close create channel"
                >
                  ✕
                </button>
              </div>

              <CreateChannel onClose={() => setShowCreateModal(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
