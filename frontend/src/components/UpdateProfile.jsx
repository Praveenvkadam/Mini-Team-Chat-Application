import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:3002";

export default function UpdateProfile({ onClose }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requireOtp, setRequireOtp] = useState(false);

  const [form, setForm] = useState({ username: "", email: "", phone: "" });
  const [user, setUser] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    const local = localStorage.getItem("user");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        setUser(parsed);
        setForm({ username: parsed.username || "", email: parsed.email || "", phone: parsed.phone || "" });
        setPreviewUrl(parsed.profileUrl || null);
      } catch (e) {}
    }

    (async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      setLoading(true);
      try {
        const endpoint = `${API}/api/auth/me`;
        console.log("[DEBUG] GET", endpoint);
        const res = await axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
        console.log("[DEBUG] /me response:", res);
        if (res.data && res.data.user) {
          setUser(res.data.user);
          setForm({ username: res.data.user.username || "", email: res.data.user.email || "", phone: res.data.user.phone || "" });
          setPreviewUrl(res.data.user.profileUrl || null);
        }
      } catch (err) {
        console.warn("[DEBUG] Could not fetch /me", err?.response || err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB");
      e.target.value = null;
      return;
    }
    setSelectedFile(f);
    setError("");
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
    setPreviewUrl(user?.profileUrl || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.username || !form.email || !form.phone) {
      setError("All fields are required");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("username", form.username);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      if (selectedFile) fd.append("profile", selectedFile); 

      const endpoint = `${API}/api/auth/update-profile`;
      console.log("[DEBUG] POST ->", endpoint);
      for (let pair of fd.entries()) {
        console.log("[DEBUG] form:", pair[0], pair[1] instanceof File ? `<File ${pair[1].name}>` : pair[1]);
      }

      const res = await axios.post(endpoint, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      console.log("[DEBUG] update-profile response:", res);
      if (res.data) {
        setSuccess(res.data.message || "Profile updated");
        setRequireOtp(!!res.data.requireOtp);
        if (res.data.token) localStorage.setItem("token", res.data.token);
        if (res.data.user) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          setUser(res.data.user);
          setForm({ username: res.data.user.username || "", email: res.data.user.email || "", phone: res.data.user.phone || "" });
          setPreviewUrl(res.data.user.profileUrl || null);
          setSelectedFile(null);
          if (typeof onClose === "function") {
            onClose();
            return;
          }
          navigate("/home");
        }
      }
    } catch (err) {
      console.error("Update profile error:", err);
      if (err?.response) {
        console.error("[DEBUG] response.data:", err.response.data);
        console.error("[DEBUG] response.status:", err.response.status);
        console.error("[DEBUG] response.headers:", err.response.headers);
        setError(err.response.data?.message || JSON.stringify(err.response.data) || `HTTP ${err.response.status}`);
      } else {
        setError(err.message || "Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (typeof onClose === "function") {
      onClose();
      return;
    }
    navigate(-1);
  };

  return (
    <div>
      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-400">{error}</div>}
          {success && <div className="text-sm text-green-400">{success}</div>}

          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center border border-slate-800">
              {previewUrl ? <img src={previewUrl} alt="avatar" className="w-full h-full object-cover" /> : <div className="text-white font-semibold">{(user?.username || "U").slice(0, 2).toUpperCase()}</div>}
            </div>

            <div className="flex-1">
              <label className="block text-xs text-slate-300">Profile picture</label>
              <div className="flex gap-2 mt-1">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="text-sm text-slate-200" />
                {selectedFile && <button type="button" onClick={clearSelectedFile} className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-200">Cancel</button>}
              </div>
              <div className="text-xs text-slate-500 mt-1">Max 2MB. JPG/PNG recommended.</div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300">Username</label>
            <input name="username" value={form.username} onChange={onChange} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
          </div>

          <div>
            <label className="block text-xs text-slate-300">Email</label>
            <input name="email" type="email" value={form.email} onChange={onChange} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
          </div>

          <div>
            <label className="block text-xs text-slate-300">Phone</label>
            <input name="phone" value={form.phone} onChange={onChange} className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
            <div className="text-xs text-slate-500 mt-1">Changing phone will require OTP verification.</div>
          </div>

          <div className="flex gap-2 items-center">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-medium hover:opacity-95 disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>
            <button type="button" onClick={handleCancel} className="text-sm px-3 py-2 rounded-lg border border-slate-700 text-slate-200">Cancel</button>
          </div>

          {requireOtp && <div className="text-sm text-amber-300">Phone changed — an OTP was sent to your new number. Complete verification to reactivate phone features.</div>}
        </form>
      )}
    </div>
  );
}
