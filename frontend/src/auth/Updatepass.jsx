import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

const countryCodes = [
  { code: "+91", label: "🇮🇳" },
  { code: "+1", label: "🇺🇸" },
  { code: "+44", label: "🇬🇧" },
  { code: "+971", label: "🇦🇪" },
];

export default function Updatepass() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [timer, setTimer] = useState(0);

  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const normalizeIdentifier = () => {
    if (/^\d+$/.test(identifier.trim())) {
      return `${countryCode}${identifier.trim().replace(/\D/g, "")}`;
    }
    return identifier.trim();
  };

  const sendOtp = async () => {
    setMsg("");

    if (!identifier.trim()) {
      setMsg("Enter your phone number first");
      return;
    }

    if (!/^\d+$/.test(identifier.trim())) {
      setMsg("OTP can only be sent to phone numbers (numbers only)");
      return;
    }

    const phone = normalizeIdentifier();

    setSendingOtp(true);
    try {
      await axios.post(`${API_BASE}/api/auth/resend-otp`, { phone });
      setMsg("OTP sent successfully");
      setTimer(60);
    } catch (err) {
      setMsg(err.response?.data?.message || "Failed to send OTP");
    }
    setSendingOtp(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!identifier || !otp || !newPassword || !confirmPassword) {
      setMsg("All fields are required");
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

    const normalized = normalizeIdentifier();

    setLoadingReset(true);
    try {
      await axios.post(`${API_BASE}/api/auth/reset-password`, {
        identifier: normalized,
        otp,
        newPassword,
        confirmPassword,
      });

      setMsg("Password updated successfully. Redirecting...");

      setOtp("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setMsg(err.response?.data?.message || "Reset failed");
    }

    setLoadingReset(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-center mb-4">Reset Password</h2>

        <form className="space-y-4" onSubmit={handleReset}>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              disabled={!/^\d+$/.test(identifier.trim())}
              className="border p-2 rounded"
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

          <div className="flex gap-2">
            <input
              placeholder="OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              className="flex-1 border p-2 rounded"
            />
            <button
              type="button"
              disabled={sendingOtp || timer > 0}
              onClick={sendOtp}
              className="px-3 py-2 bg-black text-white rounded disabled:opacity-50"
            >
              {timer > 0 ? `Resend in ${timer}s` : "Send OTP"}
            </button>
          </div>

          <div className="relative">
            <input
              type={showNewPass ? "text" : "password"}
              placeholder="New Password"
              className="w-full border p-2 rounded pr-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowNewPass(!showNewPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              {showNewPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPass ? "text" : "password"}
              placeholder="Confirm Password"
              className="w-full border p-2 rounded pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPass(!showConfirmPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              {showConfirmPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            disabled={loadingReset}
            className="w-full bg-black text-white py-2 rounded disabled:opacity-50 hover:bg-gray-900"
          >
            {loadingReset ? "Updating..." : "Update Password"}
          </button>

          {msg && (
            <p
              className={`text-center text-sm mt-2 ${
                msg.includes("success") || msg.includes("sent")
                  ? "text-green-600"
                  : "text-red-600"
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
