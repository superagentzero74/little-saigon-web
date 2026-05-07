"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Heart, MapPin, Star, Users } from "lucide-react";
import { getPublicUserProfile, getBusinessById, toggleFollow, isFollowing } from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";
import type { Business } from "@/lib/types";

const SPOT_CATS = [
  { id: "cafe_drinks", label: "Cafe & Drinks" },
  { id: "bakery", label: "Bakery" },
  { id: "restaurant", label: "Restaurants" },
  { id: "pho", label: "Pho" },
  { id: "banh_mi", label: "Banh Mi" },
  { id: "desserts", label: "Desserts" },
  { id: "find_me", label: "Where You'll Probably Find Me" },
  { id: "other", label: "Other Favorites" },
];

export default function ShareFavoritesPage() {
  const params = useParams();
  const userId = params.userId as string;

  const { user } = useAuth();
  const [profile, setProfile] = useState<{
    displayName: string;
    photoURL?: string;
    headline?: string;
    city?: string;
    state?: string;
    profileImages?: string[];
    reviewCount: number;
    checkInCount: number;
    followerCount: number;
    followingCount: number;
    favoriteSpots?: Record<string, string[]>;
  } | null>(null);
  const [businesses, setBusinesses] = useState<Record<string, Business>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (user && userId && user.id !== userId) {
      isFollowing(user.id, userId).then(setFollowing);
    }
  }, [user, userId]);

  const handleFollow = async () => {
    if (!user || user.id === userId) return;
    setFollowLoading(true);
    const result = await toggleFollow(user.id, userId);
    setFollowing(result);
    if (profile) {
      setProfile({ ...profile, followerCount: profile.followerCount + (result ? 1 : -1) });
    }
    setFollowLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    getPublicUserProfile(userId)
      .then(async (p) => {
        if (!p) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProfile(p);

        const allIds = new Set<string>();
        if (p.favoriteSpots) {
          Object.values(p.favoriteSpots).forEach((ids) =>
            ids.forEach((id) => allIds.add(id))
          );
        }

        const bizMap: Record<string, Business> = {};
        await Promise.all(
          Array.from(allIds).map(async (id) => {
            try {
              const biz = await getBusinessById(id);
              if (biz) bizMap[id] = biz;
            } catch {}
          })
        );
        setBusinesses(bizMap);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="ls-container py-3xl">
        <div className="flex flex-col lg:flex-row gap-2xl">
          <div className="lg:w-[30%] animate-pulse">
            <div className="w-full aspect-[4/5] bg-ls-surface rounded-xl mb-lg" />
            <div className="h-6 bg-ls-surface rounded w-2/3 mb-sm" />
            <div className="h-4 bg-ls-surface rounded w-1/2" />
          </div>
          <div className="flex-1 animate-pulse space-y-lg">
            <div className="h-6 bg-ls-surface rounded w-40" />
            <div className="flex gap-md">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-[140px] h-[180px] bg-ls-surface rounded-xl shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="ls-container ls-section text-center">
        <Heart size={32} className="text-ls-border mx-auto mb-md" />
        <p className="text-ls-secondary text-[15px]">This profile is not available.</p>
        <Link href="/explore" className="ls-btn inline-block mt-lg text-[13px]">
          Explore Little Saigon
        </Link>
      </div>
    );
  }

  const spots = profile.favoriteSpots || {};
  const allFavBizIds = Object.values(spots).flat();

  return (
    <div className="ls-container py-3xl">
      {/* Mobile: Hero card with overlay */}
      <div className="lg:hidden mb-xl">
        <div className="relative rounded-xl overflow-hidden">
          <img
            src={profile.profileImages && profile.profileImages.length > 0 ? profile.profileImages[0] : "/images/profile-default-bg.jpg"}
            alt=""
            className="w-full aspect-[4/5] object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-lg pt-[120px]">
            {/* Avatar + name */}
            <div className="flex items-center gap-sm mb-sm">
              <div className="w-[48px] h-[48px] rounded-full overflow-hidden bg-white/20 ring-2 ring-white/40 shrink-0">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[18px] font-bold text-white">{profile.displayName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-[22px] font-bold text-white leading-tight">{profile.displayName}</h1>
                {profile.headline && <p className="text-[13px] text-white/70 mt-[1px]">{profile.headline}</p>}
              </div>
            </div>

            <div className="flex items-center gap-md mt-sm text-[13px]">
              <span><strong className="text-white">{profile.reviewCount}</strong> <span className="text-white/60">reviews</span></span>
              <span><strong className="text-white">{profile.followerCount}</strong> <span className="text-white/60">followers</span></span>
              <span><strong className="text-white">{profile.followingCount}</strong> <span className="text-white/60">following</span></span>
            </div>

            {allFavBizIds.length > 0 && (
              <div className="mt-md">
                <h4 className="text-[12px] font-bold text-white mb-xs">Favorite Tags</h4>
                <div className="flex flex-wrap gap-[4px]">
                  {SPOT_CATS.filter((cat) => (spots[cat.id] || []).length > 0).map((cat) => (
                    <span key={cat.id} className="text-[11px] text-white/80 bg-white/20 backdrop-blur-sm px-sm py-[2px] rounded-full">{cat.label}</span>
                  ))}
                </div>
              </div>
            )}

            {(profile.city || profile.state) && (
              <div className="mt-md">
                <h4 className="text-[12px] font-bold text-white mb-[2px]">Location</h4>
                <p className="text-[13px] text-white/70">{[profile.city, profile.state].filter(Boolean).join(", ")}</p>
              </div>
            )}

            {profile.checkInCount > 0 && (
              <div className="mt-md">
                <h4 className="text-[12px] font-bold text-white mb-[2px]">Activity</h4>
                <p className="text-[13px] text-white/70">{profile.checkInCount} check-ins</p>
              </div>
            )}
          </div>
        </div>

        {/* Follow button below card on mobile */}
        {user && user.id !== userId && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`mt-md w-full py-[10px] rounded-full text-[14px] font-semibold transition-colors ${
              following
                ? "bg-ls-surface text-ls-secondary hover:bg-red-50 hover:text-red-500"
                : "bg-ls-primary text-white hover:opacity-90"
            }`}
          >
            {followLoading ? "..." : following ? "Following" : "Follow"}
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-2xl">
        {/* Desktop Left: Profile Card with overlay (30%) — hidden on mobile */}
        <div className="hidden lg:block lg:w-[30%] lg:shrink-0">
          <div className="lg:sticky lg:top-[160px]">
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={profile.profileImages && profile.profileImages.length > 0 ? profile.profileImages[0] : "/images/profile-default-bg.jpg"}
                alt=""
                className="w-full aspect-[4/5] object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-lg pt-[100px]">
                <div className="flex items-center gap-sm mb-sm">
                  <div className="w-[40px] h-[40px] rounded-full overflow-hidden bg-white/20 ring-2 ring-white/40 shrink-0">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[16px] font-bold text-white">{profile.displayName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-[18px] font-bold text-white leading-tight">{profile.displayName}</h1>
                    {profile.headline && <p className="text-[12px] text-white/70">{profile.headline}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-md text-[12px]">
                  <span><strong className="text-white">{profile.reviewCount}</strong> <span className="text-white/60">reviews</span></span>
                  <span><strong className="text-white">{profile.followerCount}</strong> <span className="text-white/60">followers</span></span>
                  <span><strong className="text-white">{profile.followingCount}</strong> <span className="text-white/60">following</span></span>
                </div>

                {allFavBizIds.length > 0 && (
                  <div className="mt-sm">
                    <h4 className="text-[11px] font-bold text-white mb-xs">Favorite Tags</h4>
                    <div className="flex flex-wrap gap-[3px]">
                      {SPOT_CATS.filter((cat) => (spots[cat.id] || []).length > 0).map((cat) => (
                        <span key={cat.id} className="text-[10px] text-white/80 bg-white/20 backdrop-blur-sm px-sm py-[2px] rounded-full">{cat.label}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(profile.city || profile.state) && (
                  <div className="mt-sm">
                    <h4 className="text-[11px] font-bold text-white mb-[1px]">Location</h4>
                    <p className="text-[12px] text-white/70">{[profile.city, profile.state].filter(Boolean).join(", ")}</p>
                  </div>
                )}

                {profile.checkInCount > 0 && (
                  <div className="mt-sm">
                    <h4 className="text-[11px] font-bold text-white mb-[1px]">Activity</h4>
                    <p className="text-[12px] text-white/70">{profile.checkInCount} check-ins</p>
                  </div>
                )}
              </div>
            </div>

            {user && user.id !== userId && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`mt-md w-full py-[8px] rounded-full text-[13px] font-semibold transition-colors ${
                  following
                    ? "bg-ls-surface text-ls-secondary hover:bg-red-50 hover:text-red-500"
                    : "bg-ls-primary text-white hover:opacity-90"
                }`}
              >
                {followLoading ? "..." : following ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>

        {/* Right: Content Feed (70%) */}
        <div className="flex-1 min-w-0">
          {/* Favorite Spots — horizontal scroll cards */}
          {allFavBizIds.length > 0 && (
            <div className="mb-xl">
              <h3 className="text-[18px] font-bold text-ls-primary mb-md">Favorite Spots</h3>
              <div className="overflow-x-auto pb-sm -mx-sm px-sm scrollbar-hide">
                <div className="flex gap-md">
                  {allFavBizIds.map((bizId) => {
                    const biz = businesses[bizId];
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

          {/* Spots by Category — grid */}
          {allFavBizIds.length > 0 && (
            <div className="mb-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                {SPOT_CATS.filter((cat) => (spots[cat.id] || []).length > 0).map((cat) => (
                  <div key={cat.id} className="rounded-xl border border-ls-border p-md">
                    <h4 className="text-[13px] font-bold text-ls-primary mb-sm">{cat.label}</h4>
                    <div className="space-y-sm">
                      {(spots[cat.id] || []).map((bizId) => {
                        const biz = businesses[bizId];
                        if (!biz) return null;
                        return (
                          <Link key={bizId} href={`/business/${biz.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}--${biz.id}`} className="group">
                            <div className="flex items-center gap-sm hover:bg-ls-surface rounded-lg p-xs transition-colors">
                              {biz.photos?.[0] ? (
                                <img src={biz.photos[0]} alt="" className="w-[36px] h-[36px] object-cover rounded-lg shrink-0" />
                              ) : (
                                <div className="w-[36px] h-[36px] bg-ls-surface rounded-lg shrink-0 flex items-center justify-center">
                                  <MapPin size={14} className="text-ls-secondary" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-ls-primary truncate">{biz.name}</p>
                                <p className="text-[11px] text-ls-secondary truncate">{biz.address}</p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile Photos grid */}
          {profile.profileImages && profile.profileImages.length > 1 && (
            <div className="mb-xl">
              <h3 className="text-[18px] font-bold text-ls-primary mb-md">Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                {profile.profileImages.slice(1).map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-xl" />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {allFavBizIds.length === 0 && (!profile.profileImages || profile.profileImages.length <= 1) && (
            <div className="text-center py-3xl">
              <Heart size={32} className="text-ls-border mx-auto mb-md" />
              <p className="text-ls-secondary text-[15px]">No content shared yet.</p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-xl pt-lg border-t border-ls-border text-center">
            <p className="text-[13px] text-ls-secondary mb-sm">
              Discover more on Little Saigon Official
            </p>
            <Link href="/explore" className="ls-btn inline-block text-[13px]">
              Explore Little Saigon
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
