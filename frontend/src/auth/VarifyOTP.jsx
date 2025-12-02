import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3002";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const phone = localStorage.getItem("pendingPhone");

  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(60);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phone) navigate("/signup"); 
  }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const verify = async () => {
    if (otp.length < 6) return setMsg("Enter valid OTP");

    setLoading(true);

    try {
      await axios.post(`${API_BASE}/api/auth/verify-otp`, { phone, otp });

      setMsg("Verification successful. Redirecting...");
      localStorage.removeItem("pendingPhone");

      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setMsg(err.response?.data?.message || "OTP verification failed");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow w-full max-w-sm">
        <h2 className="text-lg font-semibold text-center">Enter OTP</h2>

        <p className="text-center text-sm text-gray-500">
          OTP sent to <strong>{phone}</strong>
        </p>

        <input
          className="mt-4 w-full p-2 border rounded text-center tracking-wide"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter 6-digit OTP"
        />

        <button
          onClick={verify}
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded mt-4 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <div className="flex justify-between text-sm mt-3 text-gray-600">
          <span>{timer > 0 ? `Resend in ${timer}s` : "Didn't get OTP?"}</span>
          <button
            className={`${
              timer > 0
                ? "opacity-30 cursor-not-allowed"
                : "text-blue-600 underline"
            }`}
            disabled={timer > 0}
            onClick={() => setTimer(60)}
          >
            Resend
          </button>
        </div>

        {msg && (
          <p
            className={`mt-3 text-center text-sm ${
              msg.includes("successful") ? "text-green-600" : "text-red-600"
            }`}
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
