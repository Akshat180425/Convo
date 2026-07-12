import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import AuthImagePattern from "../components/AuthImagePattern";
import toast from "react-hot-toast";
import GoogleSignInButton from "../components/GoogleSignInButton";

const darkThemes = [
  "dark", "synthwave", "halloween", "forest", "aqua", "black",
  "luxury", "dracula", "business", "night", "coffee", "dim", "sunset"
];

const SignUpPage = () => {

  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const logoSrc = darkThemes.includes(theme?.toLowerCase())
    ? "/Logo/Transparent_NoName.png"
    : "/Logo/Transparent_NoName_Light.png";

  const { authUser, signup, verifyEmail, isSigningUp, isVerifyingEmail } = useAuthStore();

  useEffect(() => {
    if (authUser) navigate("/", { replace: true });
  }, [authUser, navigate]);

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const success = validateForm();

    if (success === true) {
      const res = await signup(formData);
      if (res?.email) {
        setPendingEmail(res.email);
        setVerificationCode("");
      }
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();

    if (!verificationCode.trim()) return toast.error("Verification code is required");

    await verifyEmail({ email: pendingEmail, code: verificationCode });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* left side */}
      <div className="flex flex-col justify-center items-center p-6 pt-16 sm:p-12 sm:pt-16">
        <div className="w-full max-w-md space-y-8">
          {/* LOGO */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl overflow-hidden group-hover:scale-105 transition-transform">
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl font-bold mt-2">
                {pendingEmail ? "Verify Email" : "Create Account"}
              </h1>
              <p className="text-base-content/60">
                {pendingEmail
                  ? `Enter the code sent to ${pendingEmail}`
                  : "Get started and join our community"}
              </p>
            </div>
          </div>

          {pendingEmail ? (
            <form onSubmit={handleVerifyEmail} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Verification Code</span>
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
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isVerifyingEmail}>
                {isVerifyingEmail ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify and Continue"
                )}
              </button>

              <button
                type="button"
                className="btn btn-outline w-full"
                disabled={isSigningUp}
                onClick={async () => {
                  const res = await signup(formData);
                  if (res?.email) setPendingEmail(res.email);
                }}
              >
                {isSigningUp ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Resend code"
                )}
              </button>

              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={() => setPendingEmail("")}
              >
                Use a different email
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Full Name</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-5 text-base-content/40" />
                </div>
                <input
                  type="text"
                  className={`input input-bordered w-full pl-10`}
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

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
                  className={`input input-bordered w-full pl-10`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input input-bordered w-full pl-10`}
                  placeholder="********"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

            <button type="submit" className="btn btn-primary w-full" disabled={isSigningUp}>
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
          )}

          {!pendingEmail && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-base-300" />
                <span className="text-xs uppercase text-base-content/50">or</span>
                <div className="h-px flex-1 bg-base-300" />
              </div>

              <GoogleSignInButton />
            </>
          )}

          <div className="text-center">
            <p className="text-base-content/60">
              Already have an account?{" "}
              <Link to="/login" className="link link-primary">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* right side */}

      <AuthImagePattern
        title="Connecting Together"
        subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
      />
    </div>
  );
};
export default SignUpPage;
