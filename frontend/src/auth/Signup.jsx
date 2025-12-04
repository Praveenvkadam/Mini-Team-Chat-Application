import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

const countryCodes = [
  { code: "+91", label: "🇮🇳 India" },
  { code: "+1", label: "🇺🇸 USA" },
  { code: "+44", label: "🇬🇧 UK" },
  { code: "+971", label: "🇦🇪 UAE" },
];

export default function Signup() {
  const navigate = useNavigate();
  const [countryCode, setCountryCode] = useState("+91");
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [profileFile, setProfileFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const updateField = (e) => {
    setMsg("");
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const sanitizeLocalPhone = (raw) => {
    if (!raw) return "";
    return raw.replace(/\D/g, "");
  };

  const toE164 = (countryCode, localPhone) => {
    const lp = localPhone.replace(/^0+/, "");
    return `${countryCode}${lp}`;
  };

  const onFileChange = (e) => {
    setMsg("");
    const file = e.target.files?.[0];
    if (!file) {
      setProfileFile(null);
      setPreviewUrl(null);
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setMsg("Profile image must be jpeg/png/webp/gif");
      e.target.value = "";
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setMsg("Profile image must be <= 2MB");
      e.target.value = "";
      return;
    }

    setProfileFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!form.username || !form.email || !form.phone || !form.password) {
      setMsg("All fields are required");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }

    const digits = sanitizeLocalPhone(form.phone);
    if (digits.length < 6) {
      setMsg("Enter a valid phone number");
      return;
    }

    const phoneE164 = toE164(countryCode, digits);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("username", form.username.trim());
      fd.append("email", form.email.trim().toLowerCase());
      fd.append("phone", phoneE164);
      fd.append("password", form.password);
      fd.append("confirmPassword", form.confirmPassword);
      if (profileFile) fd.append("profile", profileFile);

      console.debug("POSTing to", `${API_BASE}/api/auth/register`, {
        phone: phoneE164,
        username: form.username,
        email: form.email,
        file: profileFile ? profileFile.name : null,
      });

      const res = await axios.post(`${API_BASE}/api/auth/register`, fd, {
        timeout: 30000,
      });

      console.log("signup response:", res);

      const token = res.data?.token;
      const user = res.data?.user;

      if (token && user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      }

      setMsg("Account created successfully. Redirecting...");
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
      console.error("signup error full:", err);
      console.error("err.response:", err?.response);
      console.error("err.request:", err?.request);
      console.error("err.message:", err?.message);

      const backendMessage =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.map((x) => x.msg).join(", ")
          : null);

      setMsg(backendMessage || `Network error: ${err.message || "no response"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-700 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-slate-200/80">
            Join the team chat and stay in sync with your crew.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={submit}
          encType="multipart/form-data"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <label className="block text-xs font-medium text-slate-200/80">
                Username
              </label>
              <input
                name="username"
                placeholder="Enter your username"
                className="w-full text-sm rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                value={form.username}
                onChange={updateField}
                autoComplete="name"
              />
            </div>

            <div className="flex flex-col items-center">
              <label
                htmlFor="profile"
                className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800/60 cursor-pointer flex items-center justify-center text-xs text-slate-300 border border-dashed border-slate-500/60 hover:border-indigo-400 hover:bg-slate-800/90 transition"
                title="Upload profile (optional)"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="select-none">Add photo</span>
                )}
              </label>
              <input
                id="profile"
                name="profile"
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              <small className="text-[10px] text-slate-300/80 mt-1">
                Profile picture
              </small>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-200/80">
              Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              className="w-full text-sm rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              value={form.email}
              onChange={updateField}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-200/80">
              Phone Number
            </label>
            <div className="flex gap-2">
              <select
                className="text-sm rounded-xl border border-white/10 bg-slate-900/60 px-2.5 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {countryCodes.map((c) => (
                  <option
                    key={c.code}
                    value={c.code}
                    className="bg-slate-900 text-slate-100"
                  >
                    {c.label} {c.code}
                  </option>
                ))}
              </select>

              <input
                name="phone"
                placeholder="Phone number"
                className="flex-1 text-sm rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                value={form.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setForm((s) => ({ ...s, phone: digits }));
                }}
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-200/80">
              Password
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className="w-full text-sm rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5 pr-10 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                value={form.password}
                onChange={updateField}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-300 hover:text-white transition"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-200/80">
              Confirm Password
            </label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                className="w-full text-sm rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5 pr-10 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                value={form.confirmPassword}
                onChange={updateField}
              />
              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-300 hover:text-white transition"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <button
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-400 active:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>

          <p className="text-center text-xs mt-3 text-slate-200/80">
            Already registered?{" "}
            <Link
              to="/"
              className="font-medium text-indigo-300 hover:text-indigo-200 underline underline-offset-4"
            >
              Login
            </Link>
          </p>

          {msg && (
            <p
              className={`text-center text-xs mt-3 ${
                msg.toLowerCase().includes("success")
                  ? "text-emerald-300"
                  : "text-rose-300"
              }`}
            >
              {msg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
