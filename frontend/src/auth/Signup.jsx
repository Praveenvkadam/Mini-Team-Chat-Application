import { useState, useEffect } from "react";
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

    const maxSize = 2 * 1024 * 1024; // 2MB
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

      if (profileFile) {
        fd.append("profile", profileFile);
      }

      const res = await axios.post(`${API_BASE}/api/auth/register`, fd, {
      });

      const pendingPhone = res.data?.phone || phoneE164;
      localStorage.setItem("pendingPhone", pendingPhone);

      if (res.data?.user?.profileUrl) {
        localStorage.setItem("pendingProfileUrl", res.data.user.profileUrl);
      }

      setMsg("OTP sent — redirecting...");
      setTimeout(() => navigate("/verifyotp"), 700);
    } catch (err) {
      const backendMessage =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.map((x) => x.msg).join(", ")
          : null);

      setMsg(backendMessage || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Create Account</h1>

        <form className="space-y-4" onSubmit={submit} encType="multipart/form-data">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                name="username"
                placeholder="Username"
                className="w-full border p-2 rounded"
                value={form.username}
                onChange={updateField}
                autoComplete="name"
              />
            </div>

            <div className="flex flex-col items-center">
              <label
                htmlFor="profile"
                className="w-14 h-14 rounded-md overflow-hidden bg-gray-200 cursor-pointer flex items-center justify-center text-sm text-gray-600 border"
                title="Upload profile (optional)"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="select-none">Add</span>
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
              <small className="text-xs text-gray-500 mt-1">optional</small>
            </div>
          </div>

          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded"
            value={form.email}
            onChange={updateField}
            autoComplete="email"
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
              inputMode="tel"
              autoComplete="tel"
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
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              aria-label="Toggle password visibility"
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
              aria-label="Toggle confirm password visibility"
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
              className={`text-center text-sm mt-2 ${msg.toLowerCase().includes("sent") || msg.toLowerCase().includes("success") ? "text-green-600" : "text-red-600"}`}
            >
              {msg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
