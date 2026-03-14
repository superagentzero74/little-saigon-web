"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";

type Tab = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, signUpWithEmail, loginWithGoogle, loginWithApple, resetPassword } = useAuth();

  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const redirectAfterLogin = async () => {
    // Check if user is admin and redirect accordingly
    const profile = await import("@/lib/services").then(m => m.getUserProfile(auth.currentUser!.uid));
    if (profile?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await loginWithEmail(email, password);
      } else {
        if (!displayName.trim()) { setError("Display name is required"); setLoading(false); return; }
        await signUpWithEmail(email, password, displayName.trim());
      }
      await redirectAfterLogin();
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "") || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await loginWithGoogle();
      await redirectAfterLogin();
    } catch (err: any) {
      if (!err.message?.includes("popup-closed")) {
        setError(err.message?.replace("Firebase: ", "") || "Google sign-in failed");
      }
    }
  };

  const handleApple = async () => {
    setError("");
    try {
      await loginWithApple();
      await redirectAfterLogin();
    } catch (err: any) {
      if (!err.message?.includes("popup-closed")) {
        setError(err.message?.replace("Firebase: ", "") || "Apple sign-in failed");
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await resetPassword(forgotEmail);
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "") || "Failed to send reset email");
    }
  };

  // Forgot Password Modal
  if (showForgot) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto px-xl">
          <h1 className="text-page-title text-ls-primary text-center">Reset Password</h1>
          {forgotSent ? (
            <div className="mt-2xl text-center">
              <p className="text-body text-ls-body">Password reset email sent to <strong>{forgotEmail}</strong>. Check your inbox.</p>
              <button onClick={() => { setShowForgot(false); setForgotSent(false); }} className="ls-btn mt-lg">
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="mt-2xl space-y-lg">
              <p className="text-body text-ls-secondary">Enter your email and we'll send you a link to reset your password.</p>
              <div className="relative">
                <Mail size={18} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full bg-ls-surface rounded-btn pl-[44px] pr-lg py-[12px] text-[14px] text-ls-primary outline-none placeholder:text-ls-secondary"
                />
              </div>
              {error && <p className="text-[13px] text-red-600">{error}</p>}
              <button type="submit" className="ls-btn w-full">Send Reset Link</button>
              <button type="button" onClick={() => setShowForgot(false)} className="text-meta text-ls-secondary hover:text-ls-primary w-full text-center">
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto px-xl">
        {/* Title */}
        <h1 className="text-page-title text-ls-primary text-center">Xin Chào!</h1>
        <p className="text-body text-ls-secondary text-center mt-xs">
          Sign in to check in, leave reviews, and earn rewards.
        </p>

        {/* Tab Picker */}
        <div className="flex mt-2xl bg-ls-surface rounded-btn overflow-hidden">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 py-sm text-[14px] font-semibold transition-colors ${
              tab === "login" ? "bg-ls-primary text-white" : "text-ls-secondary"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab("signup"); setError(""); }}
            className={`flex-1 py-sm text-[14px] font-semibold transition-colors ${
              tab === "signup" ? "bg-ls-primary text-white" : "text-ls-secondary"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="mt-2xl space-y-md">
          {tab === "signup" && (
            <div className="relative">
              <User size={18} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full bg-ls-surface rounded-btn pl-[44px] pr-lg py-[12px] text-[14px] text-ls-primary outline-none placeholder:text-ls-secondary"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={18} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full bg-ls-surface rounded-btn pl-[44px] pr-lg py-[12px] text-[14px] text-ls-primary outline-none placeholder:text-ls-secondary"
            />
          </div>

          <div className="relative">
            <Lock size={18} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full bg-ls-surface rounded-btn pl-[44px] pr-[44px] py-[12px] text-[14px] text-ls-primary outline-none placeholder:text-ls-secondary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-md top-1/2 -translate-y-1/2 text-ls-secondary"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {tab === "login" && (
            <button
              type="button"
              onClick={() => { setShowForgot(true); setForgotEmail(email); }}
              className="text-[13px] text-ls-secondary hover:text-ls-primary"
            >
              Forgot password?
            </button>
          )}

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="ls-btn w-full disabled:opacity-50">
            {loading ? "..." : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-md my-2xl">
          <div className="flex-1 h-px bg-ls-border" />
          <span className="text-tag text-ls-secondary">or continue with</span>
          <div className="flex-1 h-px bg-ls-border" />
        </div>

        {/* Social Buttons */}
        <div className="space-y-md">
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-sm bg-ls-surface rounded-btn py-[12px] text-[14px] font-semibold text-ls-primary hover:bg-ls-border transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={handleApple}
            className="w-full flex items-center justify-center gap-sm bg-ls-primary rounded-btn py-[12px] text-[14px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 18 22" fill="currentColor">
              <path d="M14.94 11.58c-.03-2.78 2.27-4.12 2.37-4.18-1.29-1.89-3.3-2.15-4.02-2.18-1.71-.17-3.34 1.01-4.21 1.01-.87 0-2.21-.98-3.63-.96-1.87.03-3.59 1.09-4.55 2.76-1.94 3.36-.5 8.34 1.39 11.07.92 1.34 2.02 2.84 3.47 2.78 1.39-.06 1.92-.9 3.6-.9 1.68 0 2.16.9 3.63.87 1.5-.02 2.45-1.36 3.37-2.71 1.06-1.55 1.5-3.06 1.52-3.14-.03-.01-2.92-1.12-2.95-4.44zM12.19 3.47c.77-.93 1.28-2.22 1.14-3.51-1.1.04-2.44.73-3.23 1.66-.71.82-1.33 2.13-1.16 3.39 1.23.1 2.48-.62 3.25-1.54z"/>
            </svg>
            Continue with Apple
          </button>
        </div>
      </div>
    </div>
  );
}
