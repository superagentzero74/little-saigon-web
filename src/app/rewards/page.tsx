"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getRewards, redeemReward, getUserRedemptions, getUserOffers, getActivePromotions, issueOfferToUser } from "@/lib/services";
import type { Reward, Redemption, UserOffer, Promotion } from "@/lib/types";
import { POINTS, OFFER_TYPES } from "@/lib/types";
import { Gift, Award, Star, MapPin, Camera, Check, Ticket, QrCode, Percent, DollarSign, PlusCircle, ArrowUpRight, Copy, Tag } from "lucide-react";

export default function RewardsPage() {
  const router = useRouter();
  const { user, loading, refreshProfile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [offers, setOffers] = useState<UserOffer[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [showQR, setShowQR] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [r, red] = await Promise.all([
          getRewards().catch(() => []),
          user ? getUserRedemptions(user.id).catch(() => []) : Promise.resolve([]),
        ]);
        setRewards(r as any);
        setRedemptions(red as any);
      } catch { /* ignore */ }

      if (user) {
        try {
          const off = await getUserOffers(user.id);
          setOffers(off);
        } catch { /* ignore */ }

        try {
          const promos = await getActivePromotions();
          setPromotions(promos);
        } catch { /* ignore */ }
      }

      setLoadingData(false);
    }
    load();
  }, [user]);

  const OFFER_ICONS: Record<string, React.ReactNode> = {
    percent_off: <Percent size={20} className="text-white" />,
    fixed_off: <DollarSign size={20} className="text-white" />,
    free_item: <Gift size={20} className="text-white" />,
    double_dong: <ArrowUpRight size={20} className="text-white" />,
    bonus_dong: <PlusCircle size={20} className="text-white" />,
    bogo: <Copy size={20} className="text-white" />,
  };

  // Filter out promotions the user already has an offer for
  const claimedPromoIds = new Set(offers.map((o) => o.promotionId));
  const availablePromos = promotions.filter((p) => !claimedPromoIds.has(p.id));

  const handleClaim = async (promo: Promotion) => {
    if (!user) { router.push("/login"); return; }
    setClaiming(promo.id);
    setMessage("");
    try {
      await issueOfferToUser(user.id, promo);
      // Refresh offers
      const off = await getUserOffers(user.id);
      setOffers(off);
      setMessage(`"${promo.title}" added to your offers!`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message || "Failed to claim offer");
    } finally {
      setClaiming(null);
    }
  };

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

      {/* My Offers */}
      {user && offers.length > 0 && (
        <div className="mb-3xl">
          <h2 className="text-section-header text-ls-primary mb-lg flex items-center gap-sm">
            <Ticket size={20} /> My Offers
          </h2>
          <div className="space-y-md">
            {offers.map((offer) => {
              const active = offer.status === "issued" || offer.status === "saved";
              return (
                <div key={offer.id} className="ls-card">
                  <div className="flex items-start gap-md">
                    <div className={`w-[44px] h-[44px] rounded-card flex items-center justify-center shrink-0 ${active ? "bg-ls-primary" : "bg-ls-surface"}`}>
                      <Ticket size={20} className={active ? "text-white" : "text-ls-secondary"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-sm">
                        <h3 className="text-[14px] font-semibold text-ls-primary truncate">{offer.title}</h3>
                        <span className={`text-[11px] font-semibold px-sm py-[2px] rounded-full shrink-0 ${
                          active ? "bg-green-100 text-green-700" :
                          offer.status === "redeemed" ? "bg-gray-100 text-gray-600" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {offer.status === "issued" ? "Available" : offer.status === "saved" ? "Saved" : offer.status === "redeemed" ? "Redeemed" : "Expired"}
                        </span>
                      </div>
                      <p className="text-[12px] text-ls-secondary">{offer.businessName}</p>
                      {offer.description && (
                        <p className="text-[12px] text-ls-body mt-[2px]">{offer.description}</p>
                      )}
                      {active && (
                        <button
                          onClick={() => setShowQR(showQR === offer.id ? null : offer.id)}
                          className="mt-sm flex items-center gap-xs text-[12px] font-semibold text-ls-primary hover:underline"
                        >
                          <QrCode size={14} /> {showQR === offer.id ? "Hide QR Code" : "Show QR Code"}
                        </button>
                      )}
                      {showQR === offer.id && (
                        <div className="mt-md p-lg bg-white border border-ls-border rounded-card text-center">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(offer.qrPayload)}`}
                            alt="QR Code"
                            width={200}
                            height={200}
                            className="mx-auto"
                          />
                          <p className="text-[11px] text-ls-secondary mt-sm">Show this QR code to the cashier</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Offers to Claim */}
      {user && (
        <div className="mb-3xl">
          <h2 className="text-section-header text-ls-primary mb-lg flex items-center gap-sm">
            <Tag size={20} /> Available Offers
          </h2>
          {availablePromos.length === 0 ? (
            <div className="ls-card text-center py-2xl">
              <Tag size={32} className="text-ls-secondary mx-auto" />
              <p className="text-body text-ls-secondary mt-md">
                No offers available right now. Check back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-md">
              {availablePromos.map((promo) => {
                const fmtDate = (ts: any) => {
                  if (!ts) return null;
                  const d = ts.toDate ? ts.toDate() : new Date(ts);
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                };
                return (
                  <div key={promo.id} className="ls-card">
                    <div className="flex items-start gap-md">
                      <div className="w-[44px] h-[44px] rounded-card flex items-center justify-center shrink-0 bg-ls-primary">
                        {OFFER_ICONS[promo.type] || <Ticket size={20} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-semibold text-ls-primary">{promo.title}</h3>
                        <p className="text-[12px] text-ls-secondary">{promo.businessName}</p>
                        {promo.description && (
                          <p className="text-[12px] text-ls-body mt-[2px]">{promo.description}</p>
                        )}
                        <div className="flex items-center gap-md mt-[4px]">
                          <span className="text-[11px] text-ls-secondary">
                            {OFFER_TYPES[promo.type]?.label}
                            {promo.discountValue ? ` — ${promo.type === "percent_off" ? `${promo.discountValue}%` : `$${promo.discountValue}`}` : ""}
                          </span>
                          {promo.validUntil && (
                            <span className="text-[11px] text-ls-secondary">
                              Expires {fmtDate(promo.validUntil)}
                            </span>
                          )}
                          {promo.dongBonus > 0 && (
                            <span className="text-[11px] font-semibold text-ls-primary">
                              +{promo.dongBonus} Đồng
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleClaim(promo)}
                          disabled={claiming === promo.id}
                          className="mt-sm text-[12px] font-semibold py-[6px] px-lg rounded-btn bg-ls-primary text-white hover:opacity-90 transition-colors disabled:opacity-50"
                        >
                          {claiming === promo.id ? "Claiming..." : "Claim Offer"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* How to Earn */}
      <div className="mb-3xl">
        <h2 className="text-section-header text-ls-primary mb-lg">How to Earn Đồng</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {[
            { icon: <Star size={20} />, label: "Write a Review", pts: POINTS.REVIEW },
            { icon: <MapPin size={20} />, label: "Check In", pts: POINTS.CHECK_IN },
            { icon: <Camera size={20} />, label: "Upload a Photo", pts: POINTS.PHOTO_UPLOAD },
            { icon: <Check size={20} />, label: "Check off a Top 50 Food", pts: POINTS.DISH_CHECK },
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
