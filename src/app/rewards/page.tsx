"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getRewards, redeemReward, getUserRedemptions } from "@/lib/services";
import type { Reward, Redemption } from "@/lib/types";
import { POINTS } from "@/lib/types";
import { Gift, Award, Star, MapPin, Camera, Check } from "lucide-react";

export default function RewardsPage() {
  const router = useRouter();
  const { user, loading, refreshProfile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [r, red] = await Promise.all([
          getRewards(),
          user ? getUserRedemptions(user.id) : Promise.resolve([]),
        ]);
        setRewards(r);
        setRedemptions(red);
      } catch (err) {
        console.error("Failed to load rewards:", err);
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [user]);

  const handleRedeem = async (rewardId: string) => {
    if (!user) { router.push("/login"); return; }
    setRedeeming(rewardId);
    setMessage("");
    try {
      await redeemReward(rewardId);
      await refreshProfile();
      const red = await getUserRedemptions(user.id);
      setRedemptions(red);
      setMessage("Reward redeemed!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message || "Failed to redeem");
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="ls-container py-3xl max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-3xl">
        <Gift size={36} className="text-ls-primary mx-auto" />
        <h1 className="text-page-title text-ls-primary mt-md">Rewards</h1>
        <p className="text-body text-ls-secondary mt-xs">
          Earn Đồng by checking in, leaving reviews, and uploading photos.
        </p>
        {user && (
          <div className="mt-lg inline-flex items-center gap-sm bg-ls-surface rounded-pill px-xl py-sm">
            <Award size={18} className="text-ls-primary" />
            <span className="text-[18px] font-bold text-ls-primary">{user.points}</span>
            <span className="text-meta text-ls-secondary">Đồng available</span>
          </div>
        )}
      </div>

      {/* How to Earn */}
      <div className="mb-3xl">
        <h2 className="text-section-header text-ls-primary mb-lg">How to Earn Đồng</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {[
            { icon: <Star size={20} />, label: "Write a Review", pts: POINTS.REVIEW },
            { icon: <MapPin size={20} />, label: "Check In", pts: POINTS.CHECK_IN },
            { icon: <Camera size={20} />, label: "Upload a Photo", pts: POINTS.PHOTO_UPLOAD },
            { icon: <Check size={20} />, label: "Check off a Top 50 Dish", pts: POINTS.DISH_CHECK },
          ].map((item) => (
            <div key={item.label} className="ls-card flex items-center gap-md">
              <div className="w-[40px] h-[40px] rounded-full bg-ls-surface flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ls-primary">{item.label}</p>
              </div>
              <span className="text-meta font-bold text-ls-primary">+{item.pts} Đồng</span>
            </div>
          ))}
        </div>
      </div>

      {/* Available Rewards */}
      <div>
        <h2 className="text-section-header text-ls-primary mb-lg">Available Rewards</h2>
        {message && <p className="text-[13px] text-green-600 mb-md">{message}</p>}

        {loadingData ? (
          <div className="space-y-md">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="ls-card animate-pulse">
                <div className="h-5 bg-ls-surface rounded w-1/2" />
                <div className="h-4 bg-ls-surface rounded w-3/4 mt-sm" />
              </div>
            ))}
          </div>
        ) : rewards.length === 0 ? (
          <div className="ls-card text-center py-2xl">
            <Gift size={32} className="text-ls-secondary mx-auto" />
            <p className="text-body text-ls-secondary mt-md">
              No rewards available right now. Keep earning Đồng!
            </p>
          </div>
        ) : (
          <div className="space-y-md">
            {rewards.map((reward) => {
              const canAfford = user && user.points >= reward.pointsCost;
              return (
                <div key={reward.id} className="ls-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-card-title text-ls-primary">{reward.title}</h3>
                      <p className="text-body text-ls-body mt-xs">{reward.description}</p>
                    </div>
                    <span className="text-meta font-bold text-ls-primary whitespace-nowrap ml-md">
                      {reward.pointsCost} Đồng
                    </span>
                  </div>
                  <button
                    onClick={() => handleRedeem(reward.id)}
                    disabled={!canAfford || redeeming === reward.id}
                    className={`mt-md text-[13px] font-semibold py-sm px-lg rounded-btn transition-colors ${
                      canAfford
                        ? "bg-ls-primary text-white hover:opacity-90"
                        : "bg-ls-surface text-ls-secondary cursor-not-allowed"
                    }`}
                  >
                    {redeeming === reward.id ? "Redeeming..." : canAfford ? "Redeem" : "Not enough Đồng"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redemption History */}
      {redemptions.length > 0 && (
        <div className="mt-3xl">
          <h2 className="text-section-header text-ls-primary mb-lg">Your Redemptions</h2>
          <div className="space-y-sm">
            {redemptions.map((r) => (
              <div key={r.id} className="ls-card flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-ls-primary">{r.rewardId}</p>
                  <p className="text-tag text-ls-secondary">
                    {r.redeemedAt?.toDate ? r.redeemedAt.toDate().toLocaleDateString() : ""}
                  </p>
                </div>
                <Check size={16} className="text-green-600" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not logged in CTA */}
      {!loading && !user && (
        <div className="ls-card bg-ls-surface border-0 text-center mt-3xl py-2xl">
          <p className="text-[16px] font-semibold text-ls-primary">
            Sign in to start earning rewards
          </p>
          <button onClick={() => router.push("/login")} className="ls-btn mt-lg">
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}
