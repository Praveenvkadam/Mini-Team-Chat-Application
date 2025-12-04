import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

const countryCodes = [
  { code: "+91", label: "🇮🇳 India" },
  { code: "+1", label: "🇺🇸 USA" },
  { code: "+44", label: "🇬🇧 UK" },
  { code: "+971", label: "🇦🇪 UAE" },
];

const Spinner = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
);

export default function Updatepass() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("email");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);

  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setMsg("");

    if (mode === "email" && (!email.trim() || !newPassword || !confirmPassword)) {
      setMsg("Email and both password fields are required");
      return;
    }

    if (mode === "phone" && (!phone.trim() || !newPassword || !confirmPassword)) {
      setMsg("Phone and both password fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setMsg("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }

    const identifier =
      mode === "phone"
        ? `${countryCode}${phone.trim().replace(/\D/g, "")}`
        : email.trim();

    if (!identifier) {
      setMsg("Enter a valid email or phone");
      return;
    }

    setLoadingReset(true);

    try {
      await axios.post(`${API_BASE}/api/auth/reset-password`, {
        identifier,
        newPassword,
        confirmPassword,
      });

      setMsg("Password updated successfully. Redirecting to login...");

      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Reset failed");
      setLoadingReset(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-700 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-8">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-semibold text-white tracking-tight">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-slate-200/80">
            Use your email or phone to reset your password.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleReset}>
          <div className="flex items-center gap-6 text-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="accent-indigo-400"
                checked={mode === "email"}
                onChange={() => {
                  setMode("email");
                  setMsg("");
                }}
              />
              Email
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="accent-indigo-400"
                checked={mode === "phone"}
                onChange={() => {
                  setMode("phone");
                  setMsg("");
                }}
              />
              Phone
            </label>
          </div>

          {mode === "email" && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-200/80">
                Email
              </label>
              <input
                placeholder="Enter your email"
                className="w-full text-sm rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setMsg("");
                }}
              />
            </div>
          )}

          {mode === "phone" && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-200/80">
                Phone
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="text-sm rounded-xl border border-white/10 bg-slate-900/60 px-2.5 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent cursor-pointer transition"
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
                  placeholder="Phone number"
                  className="flex-1 text-sm rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setMsg("");
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-200/80">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                placeholder="New password"
                className="w-full text-sm rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5 pr-10 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setMsg("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-300 hover:text-white transition"
              >
                {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-200/80">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? "text" : "password"}
                placeholder="Confirm new password"
                className="w-full text-sm rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5 pr-10 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setMsg("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-300 hover:text-white transition"
              >
                {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            disabled={loadingReset}
            className="mt-2 w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-400 active:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loadingReset ? <Spinner /> : "Update Password"}
          </button>

          {msg && (
            <p
              className={`text-center text-xs mt-3 ${
                msg.toLowerCase().includes("success") ||
                msg.toLowerCase().includes("redirecting")
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
