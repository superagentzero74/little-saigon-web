"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBusinessById, getUserCheckIns, getUserReviews, getUserPhotos,
  updateUserProfile, uploadUserAvatar, updateReview, deleteReview,
  uploadProfileImage, getAllBusinesses,
} from "@/lib/services";
import type { Business, BusinessPhoto, CheckIn, Review, BusinessCategory } from "@/lib/types";
import BusinessCard from "@/components/business/BusinessCard";
import { Star, MapPin, Award, User, Users, Heart, Camera, Pencil, Trash2, Upload, X, Plus, Share2, Check } from "lucide-react";
import VietInput from "@/components/ui/VietInput";

type Tab = "overview" | "profile" | "favorites" | "reviews" | "checkins" | "saved";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "My Page" },
  { key: "profile", label: "Edit Profile" },
  { key: "favorites", label: "Favorite Spots" },
  { key: "reviews", label: "Reviews" },
  { key: "checkins", label: "Check-ins" },
  { key: "saved", label: "Saved" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, firebaseUser, loading, updateDisplayName, changePassword, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Data
  const [favorites, setFavorites] = useState<Business[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [checkInBusinesses, setCheckInBusinesses] = useState<Record<string, Business>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewBusinesses, setReviewBusinesses] = useState<Record<string, Business>>({});
  const [userPhotos, setUserPhotos] = useState<BusinessPhoto[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // UI
  const [msg, setMsg] = useState<{ text: string; err?: boolean }>({ text: "" });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Profile form
  const [form, setForm] = useState({ firstName: "", lastName: "", nickname: "", bio: "", gender: "", city: "", state: "", website: "", headline: "", aboutMe: "", hometown: "", instagram: "", tiktok: "", youtube: "" });
  const [saving, setSaving] = useState(false);
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const vibeInputRef = useRef<HTMLInputElement>(null);

  // Favorite spots
  const [favSpots, setFavSpots] = useState<Record<string, string[]>>({});
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [favBizCache, setFavBizCache] = useState<Record<string, Business>>({});
  const [favSearch, setFavSearch] = useState("");
  const [favPickingCat, setFavPickingCat] = useState<string | null>(null);
  const [savingFavs, setSavingFavs] = useState(false);

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
      headline: user.headline || "",
      aboutMe: user.aboutMe || "",
      hometown: user.hometown || "",
      instagram: user.instagram || "",
      tiktok: user.tiktok || "",
      youtube: user.youtube || "",
    });
    setProfileImages(user.profileImages || []);
    // Load favorite spots
    const spots = user.favoriteSpots || {};
    setFavSpots(spots);
    const allBizIds = Object.values(spots).flat().filter(Boolean);
    if (allBizIds.length) {
      Promise.all(allBizIds.map((id) => getBusinessById(id)))
        .then((bizzes) => {
          const cache: Record<string, Business> = {};
          bizzes.forEach((b) => { if (b) cache[b.id] = b; });
          setFavBizCache(cache);
        });
    }
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
    getUserPhotos(user.id, 30).then(setUserPhotos).catch(() => {});
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
        headline: form.headline.trim() || null,
        aboutMe: form.aboutMe.trim() || null,
        hometown: form.hometown.trim() || null,
        instagram: form.instagram.trim() || null,
        tiktok: form.tiktok.trim() || null,
        youtube: form.youtube.trim() || null,
        profileImages,
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
    <div className="ls-container py-3xl">
      {msg.text && (
        <p className={`text-[13px] mb-md text-center ${msg.err ? "text-red-500" : "text-green-600"}`}>{msg.text}</p>
      )}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      <div>

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

      {/* ── Overview Tab (Public View) ── */}
      {activeTab === "overview" && (
        <div>
          {/* Mobile: Hero card with overlay */}
          <div className="lg:hidden mb-xl">
            <div className="relative rounded-xl overflow-hidden">
              {/* Background image — user's first profile image or default */}
              <img
                src={(user.profileImages || []).length > 0 ? user.profileImages![0] : "/images/profile-default-bg.jpg"}
                alt=""
                className="w-full aspect-[4/5] object-cover"
              />
              {/* Gradient overlay with profile info */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-lg pt-[120px]">
                {/* Avatar + name */}
                <div className="flex items-center gap-sm mb-sm">
                  <div className="w-[48px] h-[48px] rounded-full overflow-hidden bg-white/20 ring-2 ring-white/40 shrink-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[18px] font-bold text-white">{user.displayName?.charAt(0)?.toUpperCase() || "?"}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-[22px] font-bold text-white leading-tight">{user.displayName}</h2>
                    {user.headline && <p className="text-[13px] text-white/70 mt-[1px]">{user.headline}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-md text-[13px]">
                  <span><strong className="text-white">{user.reviewCount}</strong> <span className="text-white/60">reviews</span></span>
                  <span><strong className="text-white">{user.followerCount || 0}</strong> <span className="text-white/60">followers</span></span>
                  <span><strong className="text-white">{user.followingCount || 0}</strong> <span className="text-white/60">following</span></span>
                </div>

                {Object.values(favSpots).flat().length > 0 && (
                  <div className="mt-md">
                    <h4 className="text-[12px] font-bold text-white mb-xs">Favorite Tags</h4>
                    <div className="flex flex-wrap gap-[4px]">
                      {SPOT_CATS.filter((cat) => (favSpots[cat.id] || []).length > 0).map((cat) => (
                        <span key={cat.id} className="text-[11px] text-white/80 bg-white/20 backdrop-blur-sm px-sm py-[2px] rounded-full">{cat.label}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(user.hometown || user.city || user.state) && (
                  <div className="mt-md">
                    <h4 className="text-[12px] font-bold text-white mb-[2px]">Location</h4>
                    <p className="text-[13px] text-white/70">{user.hometown || [user.city, user.state].filter(Boolean).join(", ")}</p>
                  </div>
                )}

                {user.checkInCount > 0 && (
                  <div className="mt-md">
                    <h4 className="text-[12px] font-bold text-white mb-[2px]">Activity</h4>
                    <p className="text-[13px] text-white/70">{user.checkInCount} check-ins</p>
                  </div>
                )}
              </div>

              {/* Avatar edit button */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute top-md right-md w-[32px] h-[32px] bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
                title="Change photo"
              >
                {avatarUploading
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera size={14} className="text-white" />}
              </button>
            </div>

            {/* Bio + social below card on mobile */}
            {(user.aboutMe || (user as any).bio) && (
              <p className="text-[13px] text-ls-body leading-relaxed mt-md px-xs">{user.aboutMe || (user as any).bio}</p>
            )}
            {(user.instagram || user.tiktok || user.youtube || user.website) && (
              <div className="flex flex-wrap gap-md mt-sm px-xs text-[12px] text-ls-secondary">
                {user.instagram && <span>@{user.instagram}</span>}
                {user.tiktok && <span>@{user.tiktok}</span>}
                {user.youtube && <span>{user.youtube}</span>}
                {user.website && <span>{user.website}</span>}
              </div>
            )}
            <div className="mt-md px-xs">
              <ShareFavoritesButton userId={user.id} />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-2xl">
          {/* Desktop Left: Profile Card with overlay (30%) — hidden on mobile */}
          <div className="hidden lg:block lg:w-[30%] lg:shrink-0">
            <div className="lg:sticky lg:top-[160px]">
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={(user.profileImages || []).length > 0 ? user.profileImages![0] : "/images/profile-default-bg.jpg"}
                  alt=""
                  className="w-full aspect-[4/5] object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-lg pt-[100px]">
                  <div className="flex items-center gap-sm mb-sm">
                    <div className="w-[40px] h-[40px] rounded-full overflow-hidden bg-white/20 ring-2 ring-white/40 shrink-0">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[16px] font-bold text-white">{user.displayName?.charAt(0)?.toUpperCase() || "?"}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-[18px] font-bold text-white leading-tight">{user.displayName}</h2>
                      {user.headline && <p className="text-[12px] text-white/70">{user.headline}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-md text-[12px]">
                    <span><strong className="text-white">{user.reviewCount}</strong> <span className="text-white/60">reviews</span></span>
                    <span><strong className="text-white">{user.followerCount || 0}</strong> <span className="text-white/60">followers</span></span>
                    <span><strong className="text-white">{user.followingCount || 0}</strong> <span className="text-white/60">following</span></span>
                  </div>

                  {Object.values(favSpots).flat().length > 0 && (
                    <div className="mt-sm">
                      <h4 className="text-[11px] font-bold text-white mb-xs">Favorite Tags</h4>
                      <div className="flex flex-wrap gap-[3px]">
                        {SPOT_CATS.filter((cat) => (favSpots[cat.id] || []).length > 0).map((cat) => (
                          <span key={cat.id} className="text-[10px] text-white/80 bg-white/20 backdrop-blur-sm px-sm py-[2px] rounded-full">{cat.label}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(user.hometown || user.city || user.state) && (
                    <div className="mt-sm">
                      <h4 className="text-[11px] font-bold text-white mb-[1px]">Location</h4>
                      <p className="text-[12px] text-white/70">{user.hometown || [user.city, user.state].filter(Boolean).join(", ")}</p>
                    </div>
                  )}

                  {user.checkInCount > 0 && (
                    <div className="mt-sm">
                      <h4 className="text-[11px] font-bold text-white mb-[1px]">Activity</h4>
                      <p className="text-[12px] text-white/70">{user.checkInCount} check-ins</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute top-sm right-sm w-[28px] h-[28px] bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
                  title="Change photo"
                >
                  {avatarUploading
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera size={12} className="text-white" />}
                </button>
              </div>

              <div className="mt-md">
                <ShareFavoritesButton userId={user.id} />
              </div>
            </div>
          </div>

          {/* Right: Content Feed (70%) */}
          <div className="flex-1 min-w-0">
            {/* Favorite Spots — horizontal scroll cards like "Featured Stories" */}
            {Object.values(favSpots).flat().length > 0 && (
              <div className="mb-xl">
                <h3 className="text-[18px] font-bold text-ls-primary mb-md">Favorite Spots</h3>
                <div className="overflow-x-auto pb-sm -mx-sm px-sm scrollbar-hide">
                  <div className="flex gap-md">
                    {Object.values(favSpots).flat().map((bizId) => {
                      const biz = favBizCache[bizId];
                      if (!biz) return null;
                      return (
                        <Link key={bizId} href={`/business/${biz.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}--${biz.id}`} className="group shrink-0">
                          <div className="w-[140px]">
                            <div className="relative w-[140px] h-[180px] rounded-xl overflow-hidden">
                              {biz.photos?.[0] ? (
                                <img src={biz.photos[0]} alt={biz.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full bg-ls-surface flex items-center justify-center">
                                  <MapPin size={24} className="text-ls-secondary" />
                                </div>
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-sm pt-lg">
                                <p className="text-[12px] font-semibold text-white leading-tight">{biz.name}</p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Reviews — compact cards */}
            {reviews.length > 0 && (
              <div className="mb-xl">
                <h3 className="text-[18px] font-bold text-ls-primary mb-md">Reviews</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sm">
                  {reviews.slice(0, 12).map((r) => {
                    const biz = reviewBusinesses[r.businessId];
                    return (
                      <div key={r.id} className="rounded-lg border border-ls-border overflow-hidden hover:shadow-sm transition-shadow">
                        {biz?.photos?.[0] && (
                          <Link href={`/business/${biz.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}--${biz.id}`}>
                            <img src={biz.photos[0]} alt={biz.name} className="w-full h-[100px] object-cover" />
                          </Link>
                        )}
                        <div className="p-sm">
                          {biz && (
                            <Link href={`/business/${biz.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}--${biz.id}`} className="text-[13px] font-semibold text-ls-primary hover:underline line-clamp-1">
                              {biz.name}
                            </Link>
                          )}
                          <div className="flex items-center gap-xs mt-[2px]">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={10} className={i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
                              ))}
                            </div>
                            <span className="text-[10px] text-ls-secondary">{fmtDate(r.createdAt)}</span>
                          </div>
                          {r.text && <p className="text-[12px] text-ls-body mt-xs leading-relaxed line-clamp-2">{r.text}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Photo Gallery — photos uploaded to business listings */}
            {userPhotos.length > 0 && (
              <div className="mb-xl">
                <h3 className="text-[18px] font-bold text-ls-primary mb-md">Photo Gallery</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-sm">
                  {userPhotos.map((photo) => (
                    <Link
                      key={photo.id}
                      href={`/business/b--${photo.businessId}`}
                      className="group"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden">
                        <img src={photo.url} alt={photo.description || ""} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        {photo.tag && (
                          <span className="absolute top-xs right-xs text-[9px] text-white/90 bg-black/40 backdrop-blur-sm px-[6px] py-[1px] rounded-full">
                            {photo.tag}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Check-ins — compact grid with photos */}
            {checkIns.length > 0 && (
              <div className="mb-xl">
                <h3 className="text-[18px] font-bold text-ls-primary mb-md">Recent Check-ins</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                  {checkIns.slice(0, 9).map((ci) => {
                    const biz = checkInBusinesses[ci.businessId];
                    return (
                      <div key={ci.id} className="relative rounded-xl overflow-hidden aspect-square group">
                        {biz?.photos?.[0] ? (
                          <img src={biz.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-ls-surface flex items-center justify-center">
                            <MapPin size={24} className="text-ls-secondary" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-sm pt-xl">
                          <p className="text-[12px] font-semibold text-white leading-tight truncate">{biz?.name || "Check-in"}</p>
                          <p className="text-[10px] text-white/70">{fmtDate(ci.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vibe photos — masonry-ish grid */}
            {(user.profileImages || []).length > 1 && (
              <div className="mb-xl">
                <h3 className="text-[18px] font-bold text-ls-primary mb-md">Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                  {(user.profileImages || []).slice(1).map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-xl" />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!user.aboutMe && !(user as any).bio && Object.values(favSpots).flat().length === 0 && reviews.length === 0 && checkIns.length === 0 && (
              <div className="text-center py-3xl">
                <User size={32} className="text-ls-border mx-auto mb-md" />
                <p className="text-ls-secondary text-[15px]">Your public page is empty.</p>
                <p className="text-ls-secondary text-[13px] mt-xs">Add favorite spots and a bio to share with others.</p>
                <button onClick={() => setActiveTab("profile")} className="ls-btn inline-block mt-lg text-[13px]">
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* ── Profile Tab ── */}
      {activeTab === "profile" && (
        <div className="space-y-lg">
          {/* Profile Photo */}
          <div className="ls-card">
            <h3 className="text-[15px] font-semibold text-ls-primary mb-md">Profile Photo</h3>
            <div className="flex items-center gap-lg">
              <div className="relative shrink-0">
                <div className="w-[80px] h-[80px] rounded-full overflow-hidden bg-ls-primary ring-4 ring-ls-surface">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[30px] font-bold text-white">
                        {user.displayName?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="text-[13px] font-semibold text-ls-primary hover:opacity-70 flex items-center gap-xs"
                >
                  <Camera size={14} />
                  {avatarUploading ? "Uploading..." : "Change Photo"}
                </button>
                <p className="text-[11px] text-ls-secondary mt-xs">JPG or PNG. Max 5MB.</p>
              </div>
            </div>
          </div>

          <div className="ls-card space-y-lg">
            <h3 className="text-[15px] font-semibold text-ls-primary">Personal Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              {[
                { key: "firstName", label: "First Name", placeholder: "Nguyễn", viet: true },
                { key: "lastName", label: "Last Name", placeholder: "Văn A", viet: true },
                { key: "nickname", label: "Nickname", placeholder: "e.g. Foodie Nguyen", viet: true },
                { key: "city", label: "City", placeholder: "Garden Grove", viet: false },
                { key: "state", label: "State", placeholder: "CA", viet: false },
                { key: "website", label: "Website / Social", placeholder: "@username or https://...", viet: false },
              ].map(({ key, label, placeholder, viet }) => (
                <div key={key} className={key === "website" ? "sm:col-span-2" : ""}>
                  <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
                    {label}
                  </label>
                  {viet ? (
                    <VietInput
                      value={(form as any)[key]}
                      onChange={(v) => setForm((p) => ({ ...p, [key]: v }))}
                      placeholder={placeholder}
                      className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:ring-2 focus:ring-ls-primary/20 placeholder:text-ls-secondary"
                    />
                  ) : (
                    <input
                      type="text"
                      value={(form as any)[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:ring-2 focus:ring-ls-primary/20 placeholder:text-ls-secondary"
                    />
                  )}
                </div>
              ))}
              {/* Bio — full width */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
                  Bio / About Me
                </label>
                <VietInput
                  value={form.bio}
                  onChange={(v) => setForm((p) => ({ ...p, bio: v.slice(0, 300) }))}
                  placeholder="Tell the community a little about yourself…"
                  multiline
                  rows={3}
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

          {/* About You */}
          <div className="ls-card space-y-lg">
            <h3 className="text-[15px] font-semibold text-ls-primary">About You</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Headline</label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
                  placeholder="e.g. Foodie · Pho Lover · OC Local"
                  className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:ring-2 focus:ring-ls-primary/20 placeholder:text-ls-secondary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">About Me</label>
                <textarea
                  value={form.aboutMe}
                  onChange={(e) => setForm((p) => ({ ...p, aboutMe: e.target.value.slice(0, 500) }))}
                  placeholder="Tell the community about yourself..."
                  rows={3}
                  className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:ring-2 focus:ring-ls-primary/20 placeholder:text-ls-secondary resize-none"
                />
                <p className="text-[11px] text-ls-secondary text-right mt-[2px]">{form.aboutMe.length}/500</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Hometown</label>
                <input
                  type="text"
                  value={form.hometown}
                  onChange={(e) => setForm((p) => ({ ...p, hometown: e.target.value }))}
                  placeholder="e.g. Westminster, CA"
                  className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:ring-2 focus:ring-ls-primary/20 placeholder:text-ls-secondary"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="ls-card space-y-lg">
            <h3 className="text-[15px] font-semibold text-ls-primary">Social Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              {[
                { key: "instagram", label: "Instagram", placeholder: "username (no @)" },
                { key: "tiktok", label: "TikTok", placeholder: "username (no @)" },
                { key: "youtube", label: "YouTube", placeholder: "channel name" },
                { key: "website", label: "Website", placeholder: "https://..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">{label}</label>
                  <input
                    type="text"
                    value={(form as any)[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:ring-2 focus:ring-ls-primary/20 placeholder:text-ls-secondary"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Style & Vibe Photos */}
          <div className="ls-card space-y-lg">
            <h3 className="text-[15px] font-semibold text-ls-primary">Style & Vibe</h3>
            <p className="text-[12px] text-ls-secondary -mt-sm">Add up to 5 photos that represent your style. Shown on your public profile.</p>
            {profileImages.length > 0 && (
              <div className="flex flex-wrap gap-sm">
                {profileImages.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-[100px] h-[100px] object-cover rounded-card" />
                    <button
                      onClick={async () => {
                        const updated = profileImages.filter((_, j) => j !== i);
                        setProfileImages(updated);
                        if (user) {
                          await updateUserProfile(user.id, { profileImages: updated } as any);
                          flash("Photo removed");
                        }
                      }}
                      className="absolute top-[3px] right-[3px] bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {profileImages.length < 5 && (
              <>
                <button
                  onClick={() => vibeInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="ls-btn-secondary text-[13px] py-sm px-lg flex items-center gap-xs"
                >
                  {uploadingImage ? <div className="w-3 h-3 border-2 border-ls-primary border-t-transparent rounded-full animate-spin" /> : <Upload size={13} />}
                  {uploadingImage ? "Uploading..." : `Add Photos (${profileImages.length}/5)`}
                </button>
                <input
                  ref={vibeInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length || !user) return;
                    setUploadingImage(true);
                    try {
                      const remaining = 5 - profileImages.length;
                      const toUpload = files.slice(0, remaining);
                      const urls: string[] = [];
                      for (const file of toUpload) {
                        const url = await uploadProfileImage(user.id, file);
                        urls.push(url);
                      }
                      const updated = [...profileImages, ...urls];
                      setProfileImages(updated);
                      await updateUserProfile(user.id, { profileImages: updated } as any);
                      flash(`${urls.length} photo(s) uploaded`);
                    } catch (err: any) {
                      flash(err.message || "Upload failed", true);
                    }
                    setUploadingImage(false);
                    e.target.value = "";
                  }}
                />
              </>
            )}
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

      {/* ── Favorite Spots Tab ── */}
      {activeTab === "favorites" && (
        <div className="mb-lg">
          <ShareFavoritesButton userId={user.id} />
        </div>
      )}
      {activeTab === "favorites" && (
        <FavoriteSpotsTab
          favSpots={favSpots}
          setFavSpots={setFavSpots}
          favBizCache={favBizCache}
          setFavBizCache={setFavBizCache}
          allBusinesses={allBusinesses}
          setAllBusinesses={setAllBusinesses}
          favSearch={favSearch}
          setFavSearch={setFavSearch}
          favPickingCat={favPickingCat}
          setFavPickingCat={setFavPickingCat}
          savingFavs={savingFavs}
          setSavingFavs={setSavingFavs}
          userId={user.id}
          flash={flash}
          refreshProfile={refreshProfile}
        />
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
                      +{ci.pointsEarned} Points
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
    </div>
  );
}

// ── Favorite Spots Categories ──
const SPOT_CATS = [
  { id: "cafe_drinks", label: "Cafés & Drinks", filterCats: ["coffee_tea", "cafe"] },
  { id: "bakery", label: "Bakery", filterCats: ["bakery_dessert", "bakery"] },
  { id: "restaurant", label: "Restaurants", filterCats: ["restaurant"] },
  { id: "pho", label: "Pho", filterCats: ["restaurant"] },
  { id: "banh_mi", label: "Banh Mi", filterCats: ["restaurant", "bakery_dessert", "bakery"] },
  { id: "desserts", label: "Desserts", filterCats: ["bakery_dessert"] },
  { id: "find_me", label: "Where You'll Probably Find Me", filterCats: [] as string[] },
  { id: "other", label: "Other Favorites", filterCats: [] as string[] },
];

function FavoriteSpotsTab({
  favSpots, setFavSpots, favBizCache, setFavBizCache,
  allBusinesses, setAllBusinesses,
  favSearch, setFavSearch, favPickingCat, setFavPickingCat,
  savingFavs, setSavingFavs, userId, flash, refreshProfile,
}: {
  favSpots: Record<string, string[]>;
  setFavSpots: (v: Record<string, string[]>) => void;
  favBizCache: Record<string, Business>;
  setFavBizCache: (v: Record<string, Business>) => void;
  allBusinesses: Business[];
  setAllBusinesses: (v: Business[]) => void;
  favSearch: string;
  setFavSearch: (v: string) => void;
  favPickingCat: string | null;
  setFavPickingCat: (v: string | null) => void;
  savingFavs: boolean;
  setSavingFavs: (v: boolean) => void;
  userId: string;
  flash: (text: string, err?: boolean) => void;
  refreshProfile: () => Promise<void>;
}) {
  useEffect(() => {
    if (allBusinesses.length === 0) {
      getAllBusinesses().then((b) => setAllBusinesses(b)).catch(() => {});
    }
  }, []);

  const handleSave = async () => {
    setSavingFavs(true);
    try {
      await updateUserProfile(userId, { favoriteSpots: favSpots } as any);
      await refreshProfile();
      flash("Favorite spots saved!");
    } catch (err: any) {
      flash(err.message || "Failed to save", true);
    }
    setSavingFavs(false);
  };

  const addSpot = (catId: string, biz: Business) => {
    const current = favSpots[catId] || [];
    if (!current.includes(biz.id)) {
      setFavSpots({ ...favSpots, [catId]: [...current, biz.id] });
      setFavBizCache({ ...favBizCache, [biz.id]: biz });
    }
    setFavPickingCat(null);
    setFavSearch("");
  };

  const removeSpot = (catId: string, bizId: string) => {
    setFavSpots({ ...favSpots, [catId]: (favSpots[catId] || []).filter((id) => id !== bizId) });
  };

  const pickingCatDef = SPOT_CATS.find((c) => c.id === favPickingCat);
  const selectedIdsInCurrentCat = new Set(favPickingCat ? (favSpots[favPickingCat] || []) : []);
  const filteredPicker = allBusinesses
    .filter((b) => {
      if (pickingCatDef && pickingCatDef.filterCats.length > 0) {
        const bCat = (b as any).category || "";
        const bCats = ((b as any).categories || []) as string[];
        if (!pickingCatDef.filterCats.some((fc) => fc === bCat || bCats.includes(fc))) return false;
      }
      if (favSearch) {
        const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return normalize(b.name).includes(normalize(favSearch));
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 50);

  return (
    <div className="space-y-lg">
      {/* Categories */}
      {SPOT_CATS.map((cat) => {
        const ids = favSpots[cat.id] || [];
        return (
          <div key={cat.id} className="ls-card">
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-[14px] font-semibold text-ls-primary">{cat.label}</h3>
              <button
                onClick={() => { setFavPickingCat(cat.id); setFavSearch(""); }}
                className="text-[12px] font-semibold text-ls-primary flex items-center gap-xs hover:opacity-70"
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {ids.length === 0 ? (
              <p className="text-[13px] text-ls-secondary">No spots selected yet.</p>
            ) : (
              <div className="space-y-sm">
                {ids.map((bizId) => {
                  const biz = favBizCache[bizId];
                  return (
                    <div key={bizId} className="flex items-center gap-md">
                      {biz?.photos?.[0] ? (
                        <img src={biz.photos[0]} alt="" className="w-[40px] h-[40px] object-cover rounded-[8px]" />
                      ) : (
                        <div className="w-[40px] h-[40px] bg-ls-surface rounded-[8px]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ls-primary truncate">{biz?.name || bizId}</p>
                        {biz?.address && <p className="text-[11px] text-ls-secondary truncate">{biz.address}</p>}
                      </div>
                      <button
                        onClick={() => removeSpot(cat.id, bizId)}
                        className="text-red-400 hover:text-red-600 shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-sm">
        <button onClick={handleSave} disabled={savingFavs} className="ls-btn text-[13px] py-sm px-xl">
          {savingFavs ? "Saving..." : "Save Favorite Spots"}
        </button>
        <ShareFavoritesButton userId={userId} />
      </div>

      {/* Picker modal */}
      {favPickingCat && pickingCatDef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setFavPickingCat(null)}>
          <div className="bg-white rounded-card w-full max-w-md max-h-[70vh] flex flex-col m-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-lg border-b border-ls-border">
              <div className="flex items-center justify-between mb-md">
                <h3 className="text-[15px] font-semibold text-ls-primary">Add {pickingCatDef.label}</h3>
                <button onClick={() => setFavPickingCat(null)} className="text-ls-secondary hover:text-ls-primary">
                  <X size={18} />
                </button>
              </div>
              <input
                type="text"
                value={favSearch}
                onChange={(e) => setFavSearch(e.target.value)}
                placeholder="Search businesses..."
                autoFocus
                className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none placeholder:text-ls-secondary"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-lg space-y-[2px]">
              {filteredPicker.length === 0 ? (
                <p className="text-[13px] text-ls-secondary text-center py-lg">No businesses found</p>
              ) : (
                filteredPicker.map((biz) => {
                  const alreadySelected = selectedIdsInCurrentCat.has(biz.id);
                  return (
                    <button
                      key={biz.id}
                      disabled={alreadySelected}
                      onClick={() => addSpot(favPickingCat!, biz)}
                      className={`w-full flex items-center gap-md p-sm rounded hover:bg-ls-surface text-left transition-colors ${alreadySelected ? "opacity-40" : ""}`}
                    >
                      {biz.photos?.[0] ? (
                        <img src={biz.photos[0]} alt="" className="w-[36px] h-[36px] object-cover rounded-[6px]" />
                      ) : (
                        <div className="w-[36px] h-[36px] bg-ls-surface rounded-[6px]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ls-primary truncate">{biz.name}</p>
                        <p className="text-[11px] text-ls-secondary truncate">{biz.address}</p>
                      </div>
                      {alreadySelected && (
                        <span className="text-[11px] text-ls-secondary">Selected</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareFavoritesButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${userId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Favorite Spots on Little Saigon",
          text: "Check out my favorite spots in Little Saigon!",
          url: shareUrl,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-xs text-[13px] font-medium text-ls-primary border border-ls-border rounded-btn px-lg py-sm hover:bg-ls-surface transition-colors"
    >
      {copied ? <Check size={14} /> : <Share2 size={14} />}
      {copied ? "Link copied!" : "Share List"}
    </button>
  );
}
