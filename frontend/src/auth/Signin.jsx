import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const API_BASE =
  (import.meta && import.meta.env && import.meta.env.VITE_API_URL) ||
  "http://localhost:3002";

const countryCodes = [
  { code: "+91", label: "🇮🇳 India" },
  { code: "+1", label: "🇺🇸 USA" },
  { code: "+44", label: "🇬🇧 UK" },
  { code: "+971", label: "🇦🇪 UAE" },
];

export default function Login() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState("email"); 

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (loginType === "email" && (!email.trim() || !password)) {
      setMsg("Email and password required");
      return;
    }

    if (loginType === "phone" && (!phone.trim() || !password)) {
      setMsg("Phone and password required");
      return;
    }

    const identifier =
      loginType === "phone"
        ? `${countryCode}${phone.trim().replace(/\D/g, "")}`
        : email.trim();

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        identifier,
        password,
      });

      if (res.data.requireOtp) {
        if (!res.data.phone) {
          throw new Error(
            "Server indicated requireOtp but did not return phone"
          );
        }

        localStorage.setItem("pendingPhone", res.data.phone);
        setMsg("Verification required → Sending OTP...");
        setTimeout(() => navigate("/verifyotp"), 1000);
        return;
      }

      const { token, user } = res.data;

      if (!token || !user) {
        throw new Error(
          "Invalid login response: token or user missing from server"
        );
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setMsg("Login successful. Redirecting...");
      setTimeout(() => navigate("/home"), 1000);
    } catch (err) {
      setMsg(
        err?.response?.data?.message ||
          err.message ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-700 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-8">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-semibold text-white tracking-tight">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-200/80">
            Log in to continue chatting with your team.
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="flex items-center gap-6 text-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="accent-indigo-400"
                checked={loginType === "email"}
                onChange={() => {
                  setLoginType("email");
                  setMsg("");
                }}
              />
              Email
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                className="accent-indigo-400"
                checked={loginType === "phone"}
                onChange={() => {
                  setLoginType("phone");
                  setMsg("");
                }}
              />
              Phone
            </label>
          </div>

          {loginType === "email" && (
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

          {loginType === "phone" && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-200/80">
                Phone
              </label>
              <div className="flex gap-2">
                <select
                  className="text-sm rounded-xl border border-white/10 bg-slate-900/60 px-2.5 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent cursor-pointer transition"
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
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full text-sm rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5 pr-10 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setMsg("");
                }}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white transition"
                onClick={() => setShowPass((s) => !s)}
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-400 active:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Processing..." : "Login"}
          </button>

          <div className="text-center text-xs mt-3 space-y-1">
            <p className="text-slate-200/80">
              No account?{" "}
              <Link
                to="/signup"
                className="font-medium text-indigo-300 hover:text-indigo-200 underline underline-offset-4"
              >
                Create one
              </Link>
            </p>

            <p className="text-slate-200/80">
              Forgot password?{" "}
              <Link
                to="/updatepass"
                className="font-medium text-indigo-300 hover:text-indigo-200 underline underline-offset-4"
              >
                Reset
              </Link>
            </p>
          </div>

          {msg && (
            <p
              className={`text-center mt-3 text-xs ${
                msg.includes("successful") || msg.includes("Verification")
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
