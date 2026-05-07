"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

// Firebase delivers password-reset / email-verification / email-recovery links
// here when "Customize action URL" is set in Firebase Console → Authentication
// → Templates. The query string Firebase sends:
//   ?mode=resetPassword|verifyEmail|recoverEmail|signIn
//   &oobCode=<one-time code>
//   &apiKey=<project api key>
//   &continueUrl=<optional return url>

function AuthActionContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  const [phase, setPhase] = useState<"loading" | "form" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode || !mode) {
      setErrorMsg("This link is missing required information. Request a new one from the login screen.");
      setPhase("error");
      return;
    }

    (async () => {
      try {
        if (mode === "resetPassword") {
          const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
          setEmail(verifiedEmail);
          setPhase("form");
        } else if (mode === "verifyEmail" || mode === "recoverEmail") {
          // Inspect first so we can show a useful confirmation
          const info = await checkActionCode(auth, oobCode);
          setEmail(info.data.email ?? "");
          await applyActionCode(auth, oobCode);
          setPhase("done");
        } else {
          setErrorMsg(`Unsupported action: ${mode}.`);
          setPhase("error");
        }
      } catch (err: any) {
        setErrorMsg(friendlyError(err));
        setPhase("error");
      }
    })();
  }, [oobCode, mode]);

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!oobCode) return;
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setPhase("done");
    } catch (err: any) {
      setErrorMsg(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ls-container py-3xl flex justify-center">
      <div className="w-full max-w-[440px] bg-white rounded-card border border-ls-border p-2xl">
        {phase === "loading" && (
          <div className="text-center text-ls-secondary text-[14px]">Verifying link...</div>
        )}

        {phase === "error" && (
          <div className="text-center">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-md" />
            <h1 className="text-[18px] font-bold text-ls-primary mb-sm">Link is invalid or expired</h1>
            <p className="text-[13px] text-ls-secondary mb-lg">{errorMsg}</p>
            <Link href="/login" className="ls-btn inline-block">Back to sign in</Link>
          </div>
        )}

        {phase === "form" && mode === "resetPassword" && (
          <form onSubmit={submitNewPassword} className="space-y-md">
            <div className="text-center mb-lg">
              <Lock size={28} className="text-ls-primary mx-auto mb-sm" />
              <h1 className="text-[18px] font-bold text-ls-primary">Set a new password</h1>
              <p className="text-[13px] text-ls-secondary mt-xs">for {email}</p>
            </div>

            <label className="block">
              <span className="text-[12px] font-semibold text-ls-primary">New password</span>
              <div className="relative mt-xs">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-md py-sm pr-10 border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-sm top-1/2 -translate-y-1/2 text-ls-secondary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-ls-primary">Confirm new password</span>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full mt-xs px-md py-sm border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
                required
                minLength={6}
              />
            </label>

            {errorMsg && <p className="text-[12px] text-red-600">{errorMsg}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full ls-btn"
            >
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        {phase === "done" && (
          <div className="text-center">
            <CheckCircle2 size={32} className="text-green-600 mx-auto mb-md" />
            <h1 className="text-[18px] font-bold text-ls-primary mb-sm">
              {mode === "resetPassword"
                ? "Password updated"
                : mode === "verifyEmail"
                ? "Email verified"
                : "Email change confirmed"}
            </h1>
            <p className="text-[13px] text-ls-secondary mb-lg">
              {email && <>Signed-in email: <strong>{email}</strong>.</>} You can sign in now.
            </p>
            <button onClick={() => router.push("/login")} className="ls-btn">
              Continue to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function friendlyError(err: any): string {
  const code = err?.code as string | undefined;
  switch (code) {
    case "auth/expired-action-code":
      return "This link has expired. Request a new one.";
    case "auth/invalid-action-code":
      return "This link is invalid or has already been used.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
      return "No account found for this link.";
    case "auth/weak-password":
      return "Choose a stronger password (at least 6 characters).";
    default:
      return err?.message || "Something went wrong. Try again.";
  }
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={<div className="ls-container py-3xl text-center text-ls-secondary">Loading...</div>}>
      <AuthActionContent />
    </Suspense>
  );
}
