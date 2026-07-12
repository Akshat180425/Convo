import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import AuthImagePattern from "../components/AuthImagePattern";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";

const darkThemes = [
  "dark", "synthwave", "halloween", "forest", "aqua", "black",
  "luxury", "dracula", "business", "night", "coffee", "dim", "sunset"
];

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { requestPasswordReset, resetPassword, isRequestingPasswordReset, isResettingPassword } = useAuthStore();
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const logoSrc = darkThemes.includes(theme?.toLowerCase())
    ? "/Logo/Transparent_NoName.png"
    : "/Logo/Transparent_NoName_Light.png";

  const handleRequestCode = async (e) => {
    e.preventDefault();

    if (!email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error("Invalid email format");

    const success = await requestPasswordReset({ email });
    if (success) setCodeSent(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!code.trim()) return toast.error("Reset code is required");
    if (!password) return toast.error("New password is required");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    const success = await resetPassword({ email, code, password });
    if (success) navigate("/login");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center items-center p-6 pt-16 sm:p-12 sm:pt-16">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl overflow-hidden group-hover:scale-105 transition-transform">
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl font-bold mt-2">Reset Password</h1>
              <p className="text-base-content/60">
                {codeSent ? "Enter the emailed code and your new password" : "Verify your email to continue"}
              </p>
            </div>
          </div>

          {!codeSent ? (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Email</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="size-5 text-base-content/40" />
                  </div>
                  <input
                    type="email"
                    className="input input-bordered w-full pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isRequestingPasswordReset}>
                {isRequestingPasswordReset ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Code"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Reset Code</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheck className="size-5 text-base-content/40" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input input-bordered w-full pl-10"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">New Password</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="size-5 text-base-content/40" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input input-bordered w-full pl-10"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="size-5 text-base-content/40" />
                    ) : (
                      <Eye className="size-5 text-base-content/40" />
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isResettingPassword}>
                {isResettingPassword ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>

              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                  setPassword("");
                }}
              >
                Use a different email
              </button>
            </form>
          )}

          <div className="text-center">
            <Link to="/login" className="link link-primary">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>

      <AuthImagePattern
        title="Return Safely"
        subtitle="Verify your email and set a fresh password to get back to your conversations."
      />
    </div>
  );
};

export default ForgotPasswordPage;
