"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBusinessById, getUserCheckIns, getUserReviews,
  updateUserProfile, uploadUserAvatar, updateReview, deleteReview,
} from "@/lib/services";
import type { Business, CheckIn, Review } from "@/lib/types";
import BusinessCard from "@/components/business/BusinessCard";
import { Star, MapPin, Award, User, Heart, Camera, Pencil, Trash2 } from "lucide-react";

type Tab = "profile" | "reviews" | "checkins" | "saved";
const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "reviews", label: "Reviews" },
  { key: "checkins", label: "Check-ins" },
  { key: "saved", label: "Saved" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, firebaseUser, loading, updateDisplayName, changePassword, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // Data
  const [favorites, setFavorites] = useState<Business[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [checkInBusinesses, setCheckInBusinesses] = useState<Record<string, Business>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewBusinesses, setReviewBusinesses] = useState<Record<string, Business>>({});
  const [dataLoaded, setDataLoaded] = useState(false);

  // UI
  const [msg, setMsg] = useState<{ text: string; err?: boolean }>({ text: "" });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Profile form
  const [form, setForm] = useState({ firstName: "", lastName: "", nickname: "", bio: "", gender: "", city: "", state: "", website: "" });
  const [saving, setSaving] = useState(false);

  // Password
  const [editPwd, setEditPwd] = useState(false);
  const [newPwd, setNewPwd] = useState("");

  // Review editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || dataLoaded) return;
    setDataLoaded(true);
    // Populate first/last — use stored fields if set, else split displayName
    const parts = (user.displayName || "").trim().split(" ");
    setForm({
      firstName: user.firstName || parts[0] || "",
      lastName: user.lastName || parts.slice(1).join(" ") || "",
      nickname: user.nickname || "",
      bio: (user as any).bio || "",
      gender: user.gender || "",
      city: user.city || "",
      state: user.state || "",
      website: user.website || "",
    });
    if (user.favorites?.length) {
      Promise.all(user.favorites.slice(0, 20).map((id) => getBusinessById(id)))
        .then((b) => setFavorites(b.filter(Boolean) as Business[]));
    }
    getUserCheckIns(user.id).then(async (cis) => {
      setCheckIns(cis);
      const ids = Array.from(new Set(cis.map((c) => c.businessId)));
      const bizzes = await Promise.all(ids.map((id) => getBusinessById(id)));
      const map: Record<string, Business> = {};
      bizzes.forEach((b) => { if (b) map[b.id] = b; });
      setCheckInBusinesses(map);
    });
    getUserReviews(user.id).then(async (revs) => {
      setReviews(revs);
      const ids = Array.from(new Set(revs.map((r) => r.businessId)));
      const bizzes = await Promise.all(ids.map((id) => getBusinessById(id)));
      const map: Record<string, Business> = {};
      bizzes.forEach((b) => { if (b) map[b.id] = b; });
      setReviewBusinesses(map);
    });
  }, [user, dataLoaded]);

  const flash = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg({ text: "" }), 3000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      await uploadUserAvatar(user.id, file);
      await refreshProfile();
      flash("Profile photo updated!");
    } catch (err: any) {
      flash(err.message || "Upload failed", true);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const fullName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ");
      if (fullName && fullName !== user.displayName) {
        await updateDisplayName(fullName);
      }
      await updateUserProfile(user.id, {
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        nickname: form.nickname.trim() || null,
        bio: (form as any).bio.trim() || null,
        gender: (form.gender as any) || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        website: form.website.trim() || null,
      } as any);
      await refreshProfile();
      flash("Profile saved!");
    } catch (err: any) {
      flash(err.message || "Failed to save", true);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePwd = async () => {
    if (newPwd.length < 6) { flash("Min 6 characters", true); return; }
    try {
      await changePassword(newPwd);
      setEditPwd(false);
      setNewPwd("");
      flash("Password updated!");
    } catch (err: any) {
      flash(err.message?.includes("requires-recent-login")
        ? "Sign out and back in first."
        : err.message || "Failed", true);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    try {
      await deleteReview(id);
      setReviews((p) => p.filter((r) => r.id !== id));
      flash("Review deleted");
    } catch (err: any) {
      flash(err.message || "Failed", true);
    }
  };

  const handleSaveReview = async () => {
    if (!editingId) return;
    try {
      await updateReview(editingId, editRating, editText);
      setReviews((p) => p.map((r) => r.id === editingId ? { ...r, rating: editRating, text: editText } : r));
      setEditingId(null);
      flash("Review updated!");
    } catch (err: any) {
      flash(err.message || "Failed", true);
    }
  };

  const fmtDate = (ts: any) => {
    if (!ts) return "";
    const ms = ts.toMillis?.() ?? ts.seconds * 1000;
    return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const isEmailUser = firebaseUser?.providerData?.[0]?.providerId === "password";

  if (loading || !user) {
    return (
      <div className="ls-container py-3xl">
        <div className="animate-pulse space-y-lg max-w-xl mx-auto">
          <div className="w-[88px] h-[88px] rounded-full bg-ls-surface mx-auto" />
          <div className="h-6 bg-ls-surface rounded w-1/3 mx-auto" />
          <div className="h-4 bg-ls-surface rounded w-1/4 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="ls-container py-3xl max-w-3xl mx-auto">

      {/* ── Avatar + stats ── */}
      <div className="flex flex-col items-center text-center mb-2xl">
        <div className="relative mb-md">
          <div className="w-[88px] h-[88px] rounded-full overflow-hidden bg-ls-primary ring-4 ring-ls-surface">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[32px] font-bold text-white">
                  {user.displayName?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute bottom-0 right-0 w-[28px] h-[28px] bg-ls-primary rounded-full flex items-center justify-center border-2 border-white shadow"
            title="Change photo"
          >
            {avatarUploading
              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera size={13} className="text-white" />}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <h1 className="text-[22px] font-bold text-ls-primary">{user.displayName}</h1>
        {user.nickname && <p className="text-[13px] text-ls-secondary italic mt-[2px]">"{user.nickname}"</p>}
        {(user as any).bio && <p className="text-[13px] text-ls-body mt-sm max-w-xs">{(user as any).bio}</p>}
        {(user.city || user.state) && (
          <p className="text-[12px] text-ls-secondary mt-[2px] flex items-center justify-center gap-[3px]">
            <MapPin size={12} /> {[user.city, user.state].filter(Boolean).join(", ")}
          </p>
        )}
        <p className="text-meta text-ls-secondary mt-xs">{user.email}</p>

        {msg.text && (
          <p className={`text-[13px] mt-sm ${msg.err ? "text-red-500" : "text-green-600"}`}>{msg.text}</p>
        )}

        <div className="grid grid-cols-3 gap-md mt-lg w-full max-w-sm">
          {[
            { icon: Award, val: user.points, label: "Đồng" },
            { icon: Star, val: user.reviewCount, label: "Reviews" },
            { icon: MapPin, val: user.checkInCount, label: "Check-ins" },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="ls-card text-center py-md">
              <div className="flex items-center justify-center gap-xs mb-[2px]">
                <Icon size={14} className="text-ls-primary" />
                <span className="text-[20px] font-bold text-ls-primary">{val}</span>
              </div>
              <p className="text-tag text-ls-secondary">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-ls-border mb-2xl overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-lg py-md text-[14px] font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === key
                  ? "border-ls-primary text-ls-primary"
                  : "border-transparent text-ls-secondary hover:text-ls-primary"
              }`}
            >
              {label}
              {key === "reviews" && reviews.length > 0 && (
                <span className="ml-xs text-[11px] bg-ls-surface text-ls-secondary rounded-full px-[6px] py-[1px]">
                  {reviews.length}
                </span>
              )}
              {key === "checkins" && checkIns.length > 0 && (
                <span className="ml-xs text-[11px] bg-ls-surface text-ls-secondary rounded-full px-[6px] py-[1px]">
                  {checkIns.length}
                </span>
              )}
              {key === "saved" && favorites.length > 0 && (
                <span className="ml-xs text-[11px] bg-ls-surface text-ls-secondary rounded-full px-[6px] py-[1px]">
                  {favorites.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === "profile" && (
        <div className="space-y-lg">
          <div className="ls-card space-y-lg">
            <h3 className="text-[15px] font-semibold text-ls-primary">Personal Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              {[
                { key: "firstName", label: "First Name", placeholder: "Nguyễn" },
                { key: "lastName", label: "Last Name", placeholder: "Văn A" },
                { key: "nickname", label: "Nickname", placeholder: "e.g. Foodie Nguyen" },
                { key: "city", label: "City", placeholder: "Garden Grove" },
                { key: "state", label: "State", placeholder: "CA" },
                { key: "website", label: "Website / Social", placeholder: "@username or https://..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className={key === "website" ? "sm:col-span-2" : ""}>
                  <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={(form as any)[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:ring-2 focus:ring-ls-primary/20 placeholder:text-ls-secondary"
                  />
                </div>
              ))}
              {/* Bio — full width */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
                  Bio / About Me
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell the community a little about yourself…"
                  rows={3}
                  maxLength={300}
                  className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:ring-2 focus:ring-ls-primary/20 placeholder:text-ls-secondary resize-none"
                />
                <p className="text-[11px] text-ls-secondary text-right mt-[2px]">{form.bio.length}/300</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:ring-2 focus:ring-ls-primary/20"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Non-binary / Other</option>
                </select>
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={saving} className="ls-btn text-[13px] py-sm px-xl">
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>

          {isEmailUser && (
            <div className="ls-card">
              <h3 className="text-[15px] font-semibold text-ls-primary mb-md">Security</h3>
              {editPwd ? (
                <div className="space-y-sm">
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="New password (min 6 characters)"
                    className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] outline-none placeholder:text-ls-secondary"
                  />
                  <div className="flex gap-sm">
                    <button onClick={handleChangePwd} className="ls-btn text-[13px] py-sm px-lg">Save</button>
                    <button onClick={() => setEditPwd(false)} className="ls-btn-secondary text-[13px] py-sm px-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditPwd(true)} className="ls-btn-secondary text-[13px] py-sm px-lg">
                  Change Password
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Reviews Tab ── */}
      {activeTab === "reviews" && (
        <div>
          {reviews.length === 0 ? (
            <div className="text-center py-3xl">
              <Star size={32} className="text-ls-border mx-auto mb-md" />
              <p className="text-ls-secondary text-[15px]">No reviews yet.</p>
              <Link href="/explore" className="ls-btn inline-block mt-lg text-[13px]">Find places to review</Link>
            </div>
          ) : (
            <div className="space-y-md">
              {reviews.map((review) => {
                const biz = reviewBusinesses[review.businessId];
                const isEditing = editingId === review.id;
                return (
                  <div key={review.id} className="ls-card">
                    <div className="flex items-start justify-between gap-md mb-sm">
                      <div>
                        {biz ? (
                          <Link href={`/business/${biz.id}`} className="text-[14px] font-semibold text-ls-primary hover:underline">
                            {biz.name}
                          </Link>
                        ) : (
                          <p className="text-[14px] font-semibold text-ls-secondary">{review.businessId}</p>
                        )}
                        <p className="text-tag text-ls-secondary mt-[2px]">{fmtDate(review.createdAt)}</p>
                      </div>
                      {!isEditing && (
                        <div className="flex gap-sm shrink-0">
                          <button
                            onClick={() => { setEditingId(review.id); setEditRating(review.rating); setEditText(review.text); }}
                            className="p-xs text-ls-secondary hover:text-ls-primary transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="p-xs text-ls-secondary hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-sm">
                        <div className="flex gap-[3px]">
                          {[1,2,3,4,5].map((s) => (
                            <button key={s} onClick={() => setEditRating(s)}>
                              <Star size={22} className={s <= editRating ? "text-yellow-400 fill-yellow-400" : "text-ls-border"} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full bg-ls-surface rounded-btn px-md py-sm text-[14px] outline-none resize-none placeholder:text-ls-secondary"
                        />
                        <div className="flex gap-sm">
                          <button onClick={handleSaveReview} className="ls-btn text-[13px] py-sm px-lg">Save</button>
                          <button onClick={() => setEditingId(null)} className="ls-btn-secondary text-[13px] py-sm px-lg">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-[2px] mb-xs">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} size={14} className={s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-ls-border"} />
                          ))}
                        </div>
                        {review.text && <p className="text-[14px] text-ls-body leading-relaxed">{review.text}</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Check-ins Tab ── */}
      {activeTab === "checkins" && (
        <div>
          {checkIns.length === 0 ? (
            <div className="text-center py-3xl">
              <MapPin size={32} className="text-ls-border mx-auto mb-md" />
              <p className="text-ls-secondary text-[15px]">No check-ins yet.</p>
              <Link href="/explore" className="ls-btn inline-block mt-lg text-[13px]">Find places to check in</Link>
            </div>
          ) : (
            <div className="space-y-sm">
              {checkIns.map((ci) => {
                const biz = checkInBusinesses[ci.businessId];
                return (
                  <div key={ci.id} className="ls-card flex items-center justify-between gap-md">
                    <div className="flex items-center gap-md min-w-0">
                      <div className="w-[38px] h-[38px] rounded-full bg-ls-surface flex items-center justify-center shrink-0">
                        <MapPin size={16} className="text-ls-primary" />
                      </div>
                      <div className="min-w-0">
                        {biz ? (
                          <Link href={`/business/${biz.id}`} className="text-[14px] font-semibold text-ls-primary hover:underline truncate block">
                            {biz.name}
                          </Link>
                        ) : (
                          <p className="text-[14px] font-semibold text-ls-secondary truncate">{ci.businessId}</p>
                        )}
                        <p className="text-tag text-ls-secondary">{fmtDate(ci.timestamp)}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold text-ls-primary bg-ls-surface px-sm py-[3px] rounded-full whitespace-nowrap">
                      +{ci.pointsEarned} Đồng
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Saved Tab ── */}
      {activeTab === "saved" && (
        <div>
          {favorites.length === 0 ? (
            <div className="text-center py-3xl">
              <Heart size={32} className="text-ls-border mx-auto mb-md" />
              <p className="text-ls-secondary text-[15px]">No saved places yet.</p>
              <Link href="/explore" className="ls-btn inline-block mt-lg text-[13px]">Explore businesses</Link>
            </div>
          ) : (
            <div className="space-y-sm">
              {favorites.map((biz) => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
