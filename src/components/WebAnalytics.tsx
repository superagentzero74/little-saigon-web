"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { collection, addDoc, doc, setDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Lightweight web analytics — logs page views and sessions to Firestore eventLog.
 * Renders nothing. Mount once in Providers.
 */
export default function WebAnalytics() {
  const pathname = usePathname();
  const { user } = useAuth();
  const sessionRef = useRef<string | null>(null);
  const startTime = useRef(Date.now());

  const userId = user?.id || "anonymous";
  const displayName = user?.displayName || "Anonymous";

  // Log page view on route change
  useEffect(() => {
    // Skip admin pages
    if (pathname.startsWith("/admin")) return;

    const pageName = pathname === "/" ? "home" : pathname.replace(/^\//, "");

    addDoc(collection(db, "eventLog"), {
      event: "page_view",
      page: pageName,
      platform: "web",
      userId,
      timestamp: serverTimestamp(),
    }).catch((err) => console.warn("WebAnalytics page_view error:", err.message));

    // Update session's current page
    if (sessionRef.current) {
      setDoc(doc(db, "sessions", sessionRef.current), {
        userId,
        displayName,
        currentPage: pageName,
        platform: "web",
        lastSeen: serverTimestamp(),
        ttl: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
      }, { merge: true }).catch((err) => console.warn("WebAnalytics error:", err.message));
    }
  }, [pathname, userId, displayName]);

  // Create/maintain session
  useEffect(() => {
    const sessionId = `web_${userId}_${Date.now()}`;
    sessionRef.current = sessionId;
    startTime.current = Date.now();

    const pageName = pathname === "/" ? "home" : pathname.replace(/^\//, "");

    // Create session doc
    setDoc(doc(db, "sessions", sessionId), {
      userId,
      displayName,
      currentPage: pageName,
      platform: "web",
      lastSeen: serverTimestamp(),
      ttl: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
    }).catch((err) => console.warn("WebAnalytics error:", err.message));

    // Log app_open equivalent
    addDoc(collection(db, "eventLog"), {
      event: "web_session",
      platform: "web",
      userId,
      timestamp: serverTimestamp(),
    }).catch((err) => console.warn("WebAnalytics error:", err.message));

    // Keep session alive with heartbeat
    const interval = setInterval(() => {
      setDoc(doc(db, "sessions", sessionId), {
        lastSeen: serverTimestamp(),
        ttl: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
      }, { merge: true }).catch((err) => console.warn("WebAnalytics error:", err.message));
    }, 2 * 60 * 1000); // every 2 min

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      deleteDoc(doc(db, "sessions", sessionId)).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
