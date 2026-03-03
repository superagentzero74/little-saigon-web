"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getBusinessById, getUserCheckIns } from "@/lib/services";
import type { Business, CheckIn } from "@/lib/types";
import BusinessCard from "@/components/business/BusinessCard";
import { Star, MapPin, Camera, Award, Pencil, Check, X } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, firebaseUser, loading, updateDisplayName, changePassword, refreshProfile } = useAuth();
  const [favorites, setFavorites] = useState<Business[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    // Load favorite businesses
    async function loadFavorites() {
      if (!user?.favorites?.length) return;
      const bizzes = await Promise.all(
        user.favorites.slice(0, 10).map((id) => getBusinessById(id))
      );
      setFavorites(bizzes.filter(Boolean) as Business[]);
    }
    async function loadCheckIns() {
      const cis = await getUserCheckIns(user!.id);
      setCheckIns(cis.slice(0, 10));
    }
    loadFavorites();
    loadCheckIns();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="ls-container py-3xl">
        <div className="animate-pulse space-y-lg">
          <div className="w-[80px] h-[80px] rounded-full bg-ls-surface mx-auto" />
          <div className="h-6 bg-ls-surface rounded w-1/3 mx-auto" />
          <div className="h-4 bg-ls-surface rounded w-1/4 mx-auto" />
        </div>
      </div>
    );
  }

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      await updateDisplayName(newName.trim());
      setEditingName(false);
      setMessage("Name updated!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message || "Failed to update name");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { setMessage("Password must be at least 6 characters"); return; }
    try {
      await changePassword(newPassword);
      setEditingPassword(false);
      setNewPassword("");
      setMessage("Password updated!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message?.includes("requires-recent-login")
        ? "Please sign out and sign back in before changing your password."
        : err.message || "Failed to change password");
    }
  };

  const isEmailUser = firebaseUser?.providerData?.[0]?.providerId === "password";

  return (
    <div className="ls-container py-3xl max-w-2xl mx-auto">
      {/* Avatar + Name */}
      <div className="text-center">
        <div className="w-[80px] h-[80px] rounded-full bg-ls-primary flex items-center justify-center mx-auto">
          <span className="text-[28px] font-bold text-white">
            {user.displayName?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>

        {editingName ? (
          <div className="flex items-center justify-center gap-sm mt-md">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-ls-surface rounded-btn px-md py-xs text-[16px] text-ls-primary outline-none w-[200px] text-center"
              autoFocus
            />
            <button onClick={handleSaveName} className="text-green-600"><Check size={20} /></button>
            <button onClick={() => setEditingName(false)} className="text-ls-secondary"><X size={20} /></button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-xs mt-md">
            <h1 className="text-[22px] font-bold text-ls-primary">{user.displayName}</h1>
            <button onClick={() => { setEditingName(true); setNewName(user.displayName); }}>
              <Pencil size={14} className="text-ls-secondary" />
            </button>
          </div>
        )}

        <p className="text-meta text-ls-secondary">{user.email}</p>
        {message && <p className="text-[13px] text-green-600 mt-sm">{message}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-md mt-2xl">
        <div className="ls-card text-center">
          <div className="flex items-center justify-center gap-xs">
            <Award size={18} className="text-ls-primary" />
            <span className="text-[22px] font-bold text-ls-primary">{user.points}</span>
          </div>
          <p className="text-tag text-ls-secondary mt-xs">Đồng</p>
        </div>
        <div className="ls-card text-center">
          <div className="flex items-center justify-center gap-xs">
            <Star size={18} className="text-ls-primary" />
            <span className="text-[22px] font-bold text-ls-primary">{user.reviewCount}</span>
          </div>
          <p className="text-tag text-ls-secondary mt-xs">Reviews</p>
        </div>
        <div className="ls-card text-center">
          <div className="flex items-center justify-center gap-xs">
            <MapPin size={18} className="text-ls-primary" />
            <span className="text-[22px] font-bold text-ls-primary">{user.checkInCount}</span>
          </div>
          <p className="text-tag text-ls-secondary mt-xs">Check-ins</p>
        </div>
      </div>

      {/* Change Password (email users only) */}
      {isEmailUser && (
        <div className="mt-2xl">
          {editingPassword ? (
            <div className="ls-card">
              <h3 className="text-[14px] font-semibold text-ls-primary mb-md">Change Password</h3>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                className="w-full bg-ls-surface rounded-btn px-md py-[10px] text-[14px] outline-none placeholder:text-ls-secondary"
              />
              <div className="flex gap-sm mt-md">
                <button onClick={handleChangePassword} className="ls-btn text-[13px] py-sm px-lg">Save</button>
                <button onClick={() => setEditingPassword(false)} className="ls-btn-secondary text-[13px] py-sm px-lg">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditingPassword(true)} className="ls-btn-secondary text-[13px] py-sm">
              Change Password
            </button>
          )}
        </div>
      )}

      {/* Saved Favorites */}
      {favorites.length > 0 && (
        <div className="mt-3xl">
          <h2 className="text-section-header text-ls-primary mb-lg">
            Saved Places ({user.favorites?.length || 0})
          </h2>
          <div className="space-y-sm">
            {favorites.map((biz) => (
              <BusinessCard key={biz.id} business={biz} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Check-ins */}
      {checkIns.length > 0 && (
        <div className="mt-3xl">
          <h2 className="text-section-header text-ls-primary mb-lg">
            Recent Check-ins
          </h2>
          <div className="space-y-sm">
            {checkIns.map((ci) => (
              <div key={ci.id} className="ls-card flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-ls-primary">{ci.businessId}</p>
                  <p className="text-tag text-ls-secondary">
                    +{ci.pointsEarned} Đồng
                  </p>
                </div>
                <MapPin size={16} className="text-ls-secondary" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
