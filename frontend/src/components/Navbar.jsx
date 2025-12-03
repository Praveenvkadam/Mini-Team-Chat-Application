import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/signin");
  };

  const Avatar = () => {
    if (!user) {
      return (
        <div className="bg-gray-300 w-10 h-10 rounded-full flex items-center justify-center text-gray-700">
          ?
        </div>
      );
    }
    if (user.profileUrl) {
      return (
        <img
          src={user.profileUrl}
          className="w-10 h-10 rounded-full object-cover border"
        />
      );
    }
    return (
      <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold">
        {(user.username || "U").slice(0, 2).toUpperCase()}
      </div>
    );
  };

  return (
    <nav className="w-full bg-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 flex justify-between items-center h-16">

        <Link to="/" className="text-2xl font-bold text-blue-600">
          WebChat
        </Link>

        <div className="flex items-center gap-6">

          {/* CREATE CHANNEL BUTTON */}
          <button
            onClick={() => navigate("/createchannel")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Create Channel
          </button>

          {!user ? (
            <button
              onClick={() => navigate("/signin")}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Login
            </button>
          ) : (
            <>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                Logout
              </button>

              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setOpen((p) => !p)} className="flex items-center gap-2">
                  <Avatar />
                  <span>{user.username}</span>
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg border z-40">
                    <button
                      onClick={() => navigate("/profile/edit")}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Edit Profile
                    </button>

                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
