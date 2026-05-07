"use client";

import { useState, useEffect } from "react";
import { Send, Search, Loader2, Bell, Users, Radio, User, Check, X, Clock, Smartphone, ImagePlus, Trash2 } from "lucide-react";
import { getNotifications, sendAdminNotification, searchUserByEmail, uploadNotificationImage } from "@/lib/services";
import type { Notification, AppUser } from "@/lib/types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Resize and compress an image to JPEG. Returns a new File. */
async function compressImage(file: File, maxW: number, maxH: number, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio, fitting within maxW x maxH
      let w = img.width;
      let h = img.height;
      if (w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
      if (h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

const LANDING_PAGES = [
  { value: "", label: "None (default)" },
  { value: "home", label: "Home" },
  { value: "explore", label: "Explore" },
  { value: "rewards", label: "Rewards" },
  { value: "profile", label: "My Page" },
  { value: "shop", label: "Shop" },
  { value: "games", label: "Games Hub" },
  { value: "tienlen", label: "Tiến Lên" },
  { value: "blackjack", label: "Blackjack" },
  { value: "guide", label: "Food Guide" },
  { value: "events", label: "Events" },
  { value: "blog", label: "Blog" },
] as const;

const TARGETS = [
  { value: "all", label: "All Users", icon: Users, desc: "Send to everyone" },
  { value: "user", label: "Single User", icon: User, desc: "Send to one person" },
  { value: "topic", label: "Topic", icon: Radio, desc: "Send to a topic group" },
] as const;

function toDate(ts: any): string {
  if (!ts) return "";
  if (ts.toDate) return ts.toDate().toLocaleString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  return String(ts);
}

const inputClass =
  "bg-white border border-ls-border rounded px-[10px] py-[8px] text-[14px] outline-none focus:border-ls-primary w-full";

// ─── Phone Preview Component ─────────────────────────────────────────────────

function PhonePreview({ title, body, imageUrl }: { title: string; body: string; imageUrl?: string }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col items-center">
      <div className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide mb-[8px] flex items-center gap-[4px]">
        <Smartphone size={12} /> Preview
      </div>
      {/* Phone frame */}
      <div className="w-[280px] bg-[#1c1c1e] rounded-[32px] p-[10px] shadow-lg">
        {/* Screen */}
        <div className="bg-gradient-to-b from-[#2c2c2e] to-[#1c1c1e] rounded-[24px] overflow-hidden min-h-[420px] relative">
          {/* Status bar */}
          <div className="flex items-center justify-between px-[20px] pt-[10px] pb-[4px]">
            <span className="text-[12px] font-semibold text-white/80">{timeStr}</span>
            <div className="w-[60px] h-[18px] bg-black rounded-full" />
            <div className="flex items-center gap-[3px]">
              <div className="text-[10px] text-white/60">●●●</div>
            </div>
          </div>

          {/* Lock screen wallpaper area */}
          <div className="px-[20px] pt-[40px] pb-[20px] text-center">
            <div className="text-[48px] font-light text-white tracking-tight">
              {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </div>
            <div className="text-[14px] text-white/50 mt-[2px]">
              {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </div>

          {/* Notification banner */}
          <div className="px-[12px] mt-[10px]">
            {title || body ? (
              <div className="bg-white/15 backdrop-blur-xl rounded-[16px] overflow-hidden border border-white/10">
                <div className="p-[12px]">
                  <div className="flex items-start gap-[8px]">
                    {/* App icon */}
                    <div className="w-[32px] h-[32px] rounded-[8px] bg-[#242424] flex items-center justify-center flex-shrink-0">
                      <span className="text-[16px]">🏮</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-[4px] mb-[2px]">
                        <span className="text-[12px] font-semibold text-white/90 uppercase tracking-wide">Little Saigon</span>
                        <span className="text-[10px] text-white/40">now</span>
                      </div>
                      <div className="text-[13px] font-semibold text-white leading-tight">
                        {title || "Notification Title"}
                      </div>
                      <div className="text-[12px] text-white/70 leading-snug mt-[2px] line-clamp-2">
                        {body || "Notification message will appear here…"}
                      </div>
                    </div>
                    {/* Thumbnail (collapsed view) */}
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-[32px] h-[32px] rounded-[6px] object-cover flex-shrink-0"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                  </div>
                </div>
                {/* Expanded image */}
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full h-[120px] object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-xl rounded-[16px] p-[16px] border border-white/5 text-center">
                <Bell size={20} className="text-white/20 mx-auto mb-[6px]" />
                <span className="text-[12px] text-white/25">Type to see preview</span>
              </div>
            )}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2">
            <div className="w-[100px] h-[4px] bg-white/20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reach Stat Card ─────────────────────────────────────────────────────────

function ReachStat({
  icon,
  label,
  value,
  subtitle,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null | undefined;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-card border p-lg ${
        highlight ? "border-ls-primary/40 ring-1 ring-ls-primary/20" : "border-ls-border"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold text-ls-secondary uppercase tracking-wide">
        <span className={highlight ? "text-ls-primary" : "text-ls-secondary"}>{icon}</span>
        {label}
      </div>
      <div className="text-[28px] font-bold text-ls-primary mt-[4px]">
        {value == null ? <Loader2 size={22} className="animate-spin text-ls-secondary" /> : value.toLocaleString()}
      </div>
      {subtitle && <div className="text-[12px] text-ls-secondary mt-[2px]">{subtitle}</div>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [reach, setReach] = useState<{ total: number; optedIn: number; tokens: number } | null>(null);
  const [reachLoading, setReachLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [sendDetail, setSendDetail] = useState("");

  // Compose form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "user" | "topic">("all");
  const [targetValue, setTargetValue] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<AppUser[]>([]);
  const [searching, setSearching] = useState(false);

  // Landing page
  const [landingPage, setLandingPage] = useState("");

  // Image
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Preview from history
  const [viewing, setViewing] = useState<Notification | null>(null);

  // Scheduling
  const [sendMode, setSendMode] = useState<"now" | "scheduled">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const load = async () => {
    setLoading(true);
    const notifs = await getNotifications(50);
    setNotifications(notifs);
    setLoading(false);
  };

  const loadReach = async () => {
    setReachLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      let optedIn = 0;
      let tokens = 0;
      snap.forEach((d) => {
        const arr = (d.data().fcmTokens as string[] | undefined) || [];
        if (arr.length > 0) {
          optedIn += 1;
          tokens += arr.length;
        }
      });
      setReach({ total: snap.size, optedIn, tokens });
    } catch {
      setReach(null);
    } finally {
      setReachLoading(false);
    }
  };

  useEffect(() => { load(); loadReach(); }, []);

  const handleUserSearch = async () => {
    if (!userSearch.trim()) return;
    setSearching(true);
    const results = await searchUserByEmail(userSearch.trim());
    setUserResults(results);
    setSearching(false);
  };

  const selectUser = (user: AppUser) => {
    setTargetValue(user.id);
    setUserSearch(user.email);
    setUserResults([]);
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      setSendStatus("error");
      setSendDetail("Title and body are required");
      setTimeout(() => setSendStatus("idle"), 3000);
      return;
    }
    if (targetType === "user" && !targetValue) {
      setSendStatus("error");
      setSendDetail("Select a user first");
      setTimeout(() => setSendStatus("idle"), 3000);
      return;
    }
    if (sendMode === "scheduled" && (!scheduleDate || !scheduleTime)) {
      setSendStatus("error");
      setSendDetail("Set a date and time for scheduling");
      setTimeout(() => setSendStatus("idle"), 3000);
      return;
    }

    setSending(true);
    setSendStatus("sending");
    setSendDetail(sendMode === "scheduled" ? "Scheduling notification…" : "Sending notification…");

    try {
      const scheduledFor = sendMode === "scheduled"
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : undefined;

      const result = await sendAdminNotification(
        title.trim(),
        body.trim(),
        "community",
        targetType,
        targetType === "all" ? undefined : targetValue.trim(),
        imageUrl.trim() || undefined,
        scheduledFor,
        landingPage || undefined
      );
      setSendStatus("success");
      setSendDetail(result.message || (sendMode === "scheduled" ? "Notification scheduled" : "Notification sent"));
      setTitle("");
      setBody("");
      setImageUrl("");
      setImagePreview(null);
      setTargetValue("");
      setUserSearch("");
      setLandingPage("");
      setScheduleDate("");
      setScheduleTime("");
      setSendMode("now");
      await load();
      setTimeout(() => setSendStatus("idle"), 5000);
    } catch (err: any) {
      console.error("Notification send error:", err);
      setSendStatus("error");
      const errMsg = err?.message || String(err) || "Unknown error";
      const match = errMsg.match(/\((.*?)\)/);
      setSendDetail(match ? match[1] : errMsg);
      setTimeout(() => setSendStatus("idle"), 8000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Notifications</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">Send push notifications to users</p>
        </div>
      </div>

      {/* Reach panel */}
      <div className="mb-2xl grid grid-cols-1 sm:grid-cols-3 gap-md">
        <ReachStat
          icon={<Users size={16} />}
          label="Total Users"
          value={reachLoading ? null : reach?.total}
        />
        <ReachStat
          icon={<Bell size={16} />}
          label="Push Enabled"
          value={reachLoading ? null : reach?.optedIn}
          subtitle={
            reach && reach.total > 0
              ? `${Math.round((reach.optedIn / reach.total) * 100)}% opt-in rate`
              : undefined
          }
          highlight
        />
        <ReachStat
          icon={<Smartphone size={16} />}
          label="Active Devices"
          value={reachLoading ? null : reach?.tokens}
          subtitle="FCM tokens registered"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2xl">
        {/* Compose — col 1 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-card border border-ls-border p-lg">
            <h2 className="text-[16px] font-semibold text-ls-primary mb-lg flex items-center gap-sm">
              <Send size={16} /> Compose
            </h2>

            {/* Title */}
            <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[6px]">Title</label>
            <input
              className={`${inputClass} mb-md`}
              placeholder="Notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* Body */}
            <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[6px]">Message</label>
            <textarea
              className={`${inputClass} mb-md h-[80px] resize-none`}
              placeholder="Notification body…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />

            {/* Image */}
            <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[6px]">Image <span className="normal-case font-normal">(optional)</span></label>
            {imagePreview ? (
              <div className="relative mb-md">
                <img src={imagePreview} alt="" className="w-full h-[120px] object-cover rounded-btn border border-ls-border" />
                <button
                  onClick={() => { setImageUrl(""); setImagePreview(null); }}
                  className="absolute top-[6px] right-[6px] w-[24px] h-[24px] bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white"
                >
                  <Trash2 size={12} className="text-red-500" />
                </button>
                {uploading && (
                  <div className="absolute inset-0 bg-white/70 rounded-btn flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-ls-primary" />
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-[6px] py-[16px] mb-md rounded-btn border-2 border-dashed border-ls-border hover:border-ls-primary cursor-pointer transition-colors">
                <ImagePlus size={20} className="text-ls-secondary" />
                <span className="text-[12px] text-ls-secondary">Click to upload or drag & drop</span>
                <span className="text-[10px] text-ls-secondary/60">JPG, PNG, GIF — auto-compressed to ~200 KB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      setSendStatus("error");
                      setSendDetail("Image must be under 10 MB");
                      setTimeout(() => setSendStatus("idle"), 3000);
                      return;
                    }
                    setUploading(true);
                    try {
                      // Compress & resize to 1024x512, JPEG 75%
                      const compressed = await compressImage(file, 1024, 512, 0.75);
                      setImagePreview(URL.createObjectURL(compressed));
                      const url = await uploadNotificationImage(compressed);
                      setImageUrl(url);
                    } catch (err: any) {
                      setSendStatus("error");
                      setSendDetail("Image upload failed");
                      setImagePreview(null);
                      setTimeout(() => setSendStatus("idle"), 3000);
                    }
                    setUploading(false);
                  }}
                />
              </label>
            )}

            {/* Landing Page */}
            <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[6px]">Landing Page <span className="normal-case font-normal">(when tapped)</span></label>
            <select
              className={`${inputClass} mb-md`}
              value={landingPage}
              onChange={(e) => setLandingPage(e.target.value)}
            >
              {LANDING_PAGES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* Target */}
            <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[6px]">Send to</label>
            <div className="flex gap-sm mb-md">
              {TARGETS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setTargetType(t.value); setTargetValue(""); setUserSearch(""); setUserResults([]); }}
                  className={`flex-1 flex flex-col items-center gap-[2px] py-[8px] rounded-btn text-[11px] border transition-colors ${
                    targetType === t.value
                      ? "border-ls-primary bg-ls-surface text-ls-primary font-semibold"
                      : "border-ls-border bg-white text-ls-secondary hover:bg-gray-50"
                  }`}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* User search */}
            {targetType === "user" && (
              <div className="mb-md">
                <div className="flex gap-sm">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-ls-secondary" />
                    <input
                      className={`${inputClass} pl-[32px]`}
                      placeholder="Search by email…"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUserSearch()}
                    />
                  </div>
                  <button onClick={handleUserSearch} disabled={searching} className="ls-btn text-[12px] py-[7px] px-md flex items-center gap-xs">
                    {searching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                    Find
                  </button>
                </div>
                {userResults.length > 0 && (
                  <div className="mt-sm bg-ls-surface rounded border border-ls-border overflow-hidden">
                    {userResults.map((u) => (
                      <button key={u.id} onClick={() => selectUser(u)} className="w-full flex items-center gap-sm px-md py-sm text-left hover:bg-white transition-colors">
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-ls-primary">{u.displayName}</div>
                          <div className="text-[11px] text-ls-secondary">{u.email}</div>
                        </div>
                        {targetValue === u.id && <Check size={14} className="text-green-600" />}
                      </button>
                    ))}
                  </div>
                )}
                {targetValue && <div className="mt-sm text-[12px] text-green-600 font-medium">✓ Selected: {userSearch}</div>}
              </div>
            )}

            {/* Topic input */}
            {targetType === "topic" && (
              <input className={`${inputClass} mb-md`} placeholder="Topic name (e.g. event_evt-tet-2026)" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
            )}

            {/* Send mode: Now or Schedule */}
            <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[6px]">When</label>
            <div className="flex gap-sm mb-md">
              <button
                onClick={() => setSendMode("now")}
                className={`flex-1 flex items-center justify-center gap-xs py-[8px] rounded-btn text-[13px] font-medium border transition-colors ${
                  sendMode === "now"
                    ? "border-ls-primary bg-ls-primary text-white"
                    : "border-ls-border bg-white text-ls-secondary hover:bg-gray-50"
                }`}
              >
                <Send size={12} /> Send Now
              </button>
              <button
                onClick={() => setSendMode("scheduled")}
                className={`flex-1 flex items-center justify-center gap-xs py-[8px] rounded-btn text-[13px] font-medium border transition-colors ${
                  sendMode === "scheduled"
                    ? "border-ls-primary bg-ls-primary text-white"
                    : "border-ls-border bg-white text-ls-secondary hover:bg-gray-50"
                }`}
              >
                <Clock size={12} /> Schedule
              </button>
            </div>

            {/* Schedule picker */}
            {sendMode === "scheduled" && (
              <div className="flex gap-sm mb-md">
                <input
                  type="date"
                  className={`${inputClass} flex-1`}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
                <input
                  type="time"
                  className={`${inputClass} flex-1`}
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            )}

            {/* Status banner */}
            {sendStatus === "sending" && (
              <div className="flex items-center gap-sm px-md py-sm rounded-btn bg-blue-50 border border-blue-200 mb-md">
                <Loader2 size={14} className="animate-spin text-blue-600" />
                <span className="text-[13px] text-blue-700 font-medium">{sendDetail}</span>
              </div>
            )}
            {sendStatus === "success" && (
              <div className="flex items-center gap-sm px-md py-sm rounded-btn bg-green-50 border border-green-200 mb-md">
                <Check size={14} className="text-green-600" />
                <span className="text-[13px] text-green-700 font-medium">{sendDetail}</span>
              </div>
            )}
            {sendStatus === "error" && (
              <div className="flex items-center gap-sm px-md py-sm rounded-btn bg-red-50 border border-red-200 mb-md">
                <X size={14} className="text-red-600" />
                <div>
                  <span className="text-[13px] text-red-700 font-medium block">Failed</span>
                  <span className="text-[11px] text-red-500">{sendDetail}</span>
                </div>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={send}
              disabled={sending || uploading || !title.trim() || !body.trim()}
              className="ls-btn w-full flex items-center justify-center gap-sm py-[10px] text-[14px]"
            >
              {sending
                ? <><Loader2 size={15} className="animate-spin" /> {sendMode === "scheduled" ? "Scheduling…" : "Sending…"}</>
                : <>{sendMode === "scheduled" ? <Clock size={15} /> : <Send size={15} />} {sendMode === "scheduled" ? "Schedule Notification" : "Send Notification"}</>
              }
            </button>
          </div>
        </div>

        {/* Phone preview — col 2 */}
        <div className="lg:col-span-1 flex justify-center">
          <div className="sticky top-[24px]">
            {viewing ? (
              <div>
                <PhonePreview
                  title={viewing.title}
                  body={viewing.body}
                  imageUrl={viewing.imageUrl || undefined}
                />
                <div className="mt-[10px] bg-white rounded-btn border border-ls-border p-sm text-center">
                  <div className="flex items-center justify-between px-sm">
                    <div className="text-left">
                      <span className={`text-[10px] font-semibold px-[5px] py-[1px] rounded ${
                        viewing.status === "sent" ? "bg-green-100 text-green-600" :
                        viewing.status === "scheduled" ? "bg-amber-100 text-amber-600" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {viewing.status === "scheduled" ? "⏱ Scheduled" : viewing.status}
                      </span>
                      <span className="text-[10px] text-ls-secondary ml-[6px]">
                        {viewing.status === "scheduled" ? toDate(viewing.scheduledFor) : toDate(viewing.sentAt)}
                      </span>
                    </div>
                    <button
                      onClick={() => setViewing(null)}
                      className="text-[11px] text-ls-secondary hover:text-ls-primary font-medium flex items-center gap-[3px]"
                    >
                      <X size={11} /> Close
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <PhonePreview title={title} body={body} imageUrl={imageUrl.trim() || undefined} />
            )}
          </div>
        </div>

        {/* History — col 3 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-card border border-ls-border overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-ls-border">
              <h2 className="text-[14px] font-semibold text-ls-primary flex items-center gap-sm">
                <Bell size={14} /> History
              </h2>
              <span className="text-[12px] text-ls-secondary">{notifications.length}</span>
            </div>

            {loading ? (
              <div className="p-lg">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-[52px] bg-ls-surface rounded animate-pulse mb-[6px]" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-2xl text-center">
                <Bell size={32} className="text-ls-secondary opacity-30 mx-auto mb-sm" />
                <p className="text-[13px] text-ls-secondary">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-ls-border max-h-[600px] overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setViewing(viewing?.id === n.id ? null : n)}
                    className={`px-lg py-md cursor-pointer transition-colors ${
                      viewing?.id === n.id ? "bg-blue-50 border-l-2 border-l-ls-primary" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-sm mb-[2px]">
                          <span className="text-[13px] font-semibold text-ls-primary truncate">{n.title}</span>
                        </div>
                        <p className="text-[12px] text-ls-secondary truncate">{n.body}</p>
                        <div className="flex items-center gap-md mt-[4px]">
                          <span className="text-[10px] text-ls-secondary">
                            {n.targetType === "all" ? "All users" : n.targetType === "topic" ? `Topic: ${n.targetValue}` : `User`}
                          </span>
                          {n.status === "scheduled" && n.scheduledFor && (
                            <span className="text-[10px] text-amber-600 flex items-center gap-[2px]">
                              <Clock size={9} /> {toDate(n.scheduledFor)}
                            </span>
                          )}
                          {n.status !== "scheduled" && (
                            <span className="text-[10px] text-ls-secondary">{toDate(n.sentAt)}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-[6px] py-[1px] rounded shrink-0 ${
                        n.status === "sent" ? "bg-green-100 text-green-600" :
                        n.status === "scheduled" ? "bg-amber-100 text-amber-600" :
                        "bg-red-50 text-red-600"
                      }`}>
                        {n.status === "scheduled" ? "⏱ Scheduled" : n.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
