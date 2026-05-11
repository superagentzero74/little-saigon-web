"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  User,
} from "firebase/auth";
import { auth, googleProvider, appleProvider, db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getUserProfile, createUserProfile, updateUserProfile } from "@/lib/services";
import type { AppUser } from "@/lib/types";

// Fire-and-forget login telemetry for the admin dashboard.
async function recordLoginAttempt(
  method: "email" | "google" | "apple",
  outcome: "success" | "failure",
  extra: { email?: string; userId?: string; errorCode?: string; errorMessage?: string } = {}
) {
  try {
    await addDoc(collection(db, "loginAttempts"), {
      method,
      outcome,
      platform: "web",
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      ...extra,
    });
  } catch {
    /* swallow — telemetry should never break sign-in */
  }
}

interface AuthContextType {
  firebaseUser: User | null;
  user: AppUser | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load/create user profile when Firebase auth changes
  const loadProfile = async (fbUser: User) => {
    let profile = await getUserProfile(fbUser.uid);
    if (!profile) {
      await createUserProfile(fbUser.uid, {
        displayName: fbUser.displayName || "",
        email: fbUser.email || "",
        ...(fbUser.photoURL ? { photoURL: fbUser.photoURL } : {}),
      });
      profile = await getUserProfile(fbUser.uid);
    }
    setUser(profile);
  };

  // Handle redirect result from Apple Sign-In
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        await loadProfile(result.user);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await loadProfile(fbUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await loadProfile(cred.user);
      recordLoginAttempt("email", "success", { email, userId: cred.user.uid });
    } catch (err: any) {
      recordLoginAttempt("email", "failure", { email, errorCode: err?.code, errorMessage: err?.message });
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await createUserProfile(cred.user.uid, {
        displayName,
        email: cred.user.email || email,
      });
      await loadProfile(cred.user);
      recordLoginAttempt("email", "success", { email, userId: cred.user.uid });
    } catch (err: any) {
      recordLoginAttempt("email", "failure", { email, errorCode: err?.code, errorMessage: err?.message });
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await loadProfile(cred.user);
      recordLoginAttempt("google", "success", { email: cred.user.email ?? undefined, userId: cred.user.uid });
    } catch (err: any) {
      recordLoginAttempt("google", "failure", { errorCode: err?.code, errorMessage: err?.message });
      throw err;
    }
  };

  const loginWithApple = async () => {
    try {
      const cred = await signInWithPopup(auth, appleProvider);
      await loadProfile(cred.user);
      recordLoginAttempt("apple", "success", { email: cred.user.email ?? undefined, userId: cred.user.uid });
    } catch (err: any) {
      recordLoginAttempt("apple", "failure", { errorCode: err?.code, errorMessage: err?.message });
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateDisplayName = async (name: string) => {
    if (!firebaseUser) return;
    await updateProfile(firebaseUser, { displayName: name });
    await updateUserProfile(firebaseUser.uid, { displayName: name });
    await refreshProfile();
  };

  const changePassword = async (newPassword: string) => {
    if (!firebaseUser) return;
    await updatePassword(firebaseUser, newPassword);
  };

  const refreshProfile = async () => {
    if (firebaseUser) await loadProfile(firebaseUser);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        loginWithApple,
        logout,
        resetPassword,
        updateDisplayName,
        changePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
