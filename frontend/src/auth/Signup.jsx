import { useState } from "react";
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

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (e) => {
    setMsg("");
    setForm({ ...form, [e.target.name]: e.target.value });
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

    setLoading(true);

    try {
      const payload = {
        ...form,
        phone: `${countryCode}${form.phone.replace(/\D/g, "")}`,
      };

      const res = await axios.post(`${API_BASE}/api/auth/register`, payload);

      localStorage.setItem("pendingPhone", res.data.phone);

      setMsg(" OTP sent — redirecting...");
      setTimeout(() => navigate("/verifyotp"), 1200);
    } catch (err) {
      setMsg(err.response?.data?.message || "Signup failed");
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Create Account</h1>

        <form className="space-y-4" onSubmit={submit}>
          <input
            name="username"
            placeholder="Username"
            className="w-full border p-2 rounded"
            value={form.username}
            onChange={updateField}
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded"
            value={form.email}
            onChange={updateField}
          />

          <div className="flex gap-2">
            <select
              className="border p-2 rounded"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >
              {countryCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} {c.code}
                </option>
              ))}
            </select>

            <input
              name="phone"
              placeholder="Phone number"
              className="flex-1 border p-2 rounded"
              value={form.phone}
              onChange={updateField}
            />
          </div>

          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full border p-2 rounded pr-10"
              value={form.password}
              onChange={updateField}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              className="w-full border p-2 rounded pr-10"
              value={form.confirmPassword}
              onChange={updateField}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Sending OTP..." : "Sign Up"}
          </button>

          <p className="text-center text-sm mt-2">
            Already registered? <Link to="/login" className="text-blue-600">Login</Link>
          </p>

          {msg && (
            <p
              className={`text-center text-sm mt-2 ${
                msg.includes("✔") ? "text-green-600" : "text-red-600"
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
