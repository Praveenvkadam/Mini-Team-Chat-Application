import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

const countryCodes = [
  { code: "+91", label: "🇮🇳" },
  { code: "+1", label: "🇺🇸" },
  { code: "+44", label: "🇬🇧" },
  { code: "+971", label: "🇦🇪" },
];

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!identifier || !password) {
      setMsg("Email/Phone and password required");
      return;
    }

    const formatted =
      /^\d+$/.test(identifier)
        ? `${countryCode}${identifier.trim()}`
        : identifier.trim();

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        identifier: formatted,
        password,
      });

      if (res.data.requireOtp) {
        localStorage.setItem("pendingPhone", res.data.phone);
        setMsg("Verification required → Sending OTP...");
        setTimeout(() => navigate("/verifyotp"), 1000);
        return;
      }

      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setMsg("Login successful. Redirecting...");
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setMsg(err.response?.data?.message || "Login failed");
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-center">Login</h2>

        <form className="space-y-4" onSubmit={submit}>
          
          <div className="flex gap-2">
            <select
              disabled={!/^\d+$/.test(identifier)} 
              className="border p-2 rounded disabled:bg-gray-200 cursor-pointer"
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
              placeholder="Email or Phone"
              className="flex-1 border p-2 rounded"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div className="relative">
            <input type={showPass ? "text" : "password"} placeholder="Password" className="w-full border p-2 rounded pr-10"
              value={password} onChange={(e) => setPassword(e.target.value)}/>
            <button type="button" className="absolute right-3 top-2 text-gray-600" onClick={() => setShowPass((s) => !s)}>
              {showPass ? <EyeOff /> : <Eye />}
            </button>
          </div>
         <button disabled={loading}className="w-full bg-black text-white py-2 rounded hover:bg-gray-900 disabled:opacity-50">
            {loading ? "Processing..." : "Login"}
          </button>

          <p className="text-center text-sm">No account? <Link to="/signup" className="text-blue-600">Create one</Link></p>

          <p className="text-center text-sm">Forgot Password? <Link to="/updatepass" className="text-blue-600">Reset</Link></p>

          {msg && (
            <p className={`text-center mt-2 text-sm ${ msg.includes("successful") || msg.includes("Verification")  ? "text-green-600"  : "text-red-600"  }`}>
              {msg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
