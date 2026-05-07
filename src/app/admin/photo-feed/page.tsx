"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Camera, User, Store, Clock, Filter } from "lucide-react";
import { collection, collectionGroup, getDocs, query, orderBy, limit, doc, updateDoc, where, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PhotoTag } from "@/lib/types";

interface FeedPhoto {
  id: string;
  businessId: string;
  businessName?: string;
  userId?: string;
  userName?: string;
  url: string;
  tag: PhotoTag;
  foodTags?: string[];
  description?: string;
  feedApproved?: boolean;
  createdAt?: any;
}

type FilterMode = "all" | "pending" | "approved";

export default function PhotoFeedPage() {
  const [photos, setPhotos] = useState<FeedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [tagFilter, setTagFilter] = useState<PhotoTag | "">("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Fetch recent photos from collectionGroup
        let snap;
        try {
          const q = query(collectionGroup(db, "photos"), orderBy("createdAt", "desc"), limit(200));
          snap = await getDocs(q);
        } catch {
          // Index may not be ready — fetch without ordering and sort client-side
          const fallbackQ = query(collectionGroup(db, "photos"), limit(200));
          snap = await getDocs(fallbackQ);
        }

        // Resolve business names
        const bizNameCache: Record<string, string> = {};
        const rawPhotos: FeedPhoto[] = [];

        for (const d of snap.docs) {
          const data = d.data();
          const businessId = data.businessId || d.ref.parent.parent?.id || "";

          if (!bizNameCache[businessId] && businessId) {
            try {
              const bizDoc = await getDoc(doc(db, "businesses", businessId));
              bizNameCache[businessId] = bizDoc.exists() ? bizDoc.data()?.name || businessId : businessId;
            } catch {
              bizNameCache[businessId] = businessId;
            }
          }

          rawPhotos.push({
            id: d.id,
            businessId,
            businessName: bizNameCache[businessId] || businessId,
            userId: data.userId,
            userName: data.userName || undefined,
            url: data.url,
            tag: data.tag || "other",
            foodTags: data.foodTags,
            description: data.description,
            feedApproved: data.feedApproved || false,
            createdAt: data.createdAt,
          });
        }

        // Resolve userNames for photos missing them
        const userNameCache: Record<string, string> = {};
        for (const photo of rawPhotos) {
          if (!photo.userName && photo.userId) {
            if (!userNameCache[photo.userId]) {
              try {
                const userDoc = await getDoc(doc(db, "users", photo.userId));
                userNameCache[photo.userId] = userDoc.exists() ? userDoc.data()?.displayName || "Unknown" : "Unknown";
              } catch {
                userNameCache[photo.userId] = "Unknown";
              }
            }
            photo.userName = userNameCache[photo.userId];
          }
        }

        // Sort newest first
        rawPhotos.sort((a, b) => {
          const toMs = (ts: any) => ts?.toMillis?.() || (ts?.seconds ? ts.seconds * 1000 : 0);
          return toMs(b.createdAt) - toMs(a.createdAt);
        });
        setPhotos(rawPhotos);
      } catch (e) {
        console.error("Failed to load photos:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleApproval = async (photo: FeedPhoto) => {
    setTogglingId(photo.id);
    const next = !photo.feedApproved;
    try {
      await updateDoc(doc(db, "businesses", photo.businessId, "photos", photo.id), {
        feedApproved: next,
      });
      setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, feedApproved: next } : p));
    } catch (e) {
      console.error("Toggle failed:", e);
    } finally {
      setTogglingId(null);
    }
  };

  const fmtDate = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate?.() ?? new Date(ts.seconds * 1000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const filtered = photos.filter((p) => {
    if (filter === "approved" && !p.feedApproved) return false;
    if (filter === "pending" && p.feedApproved) return false;
    if (tagFilter && p.tag !== tagFilter) return false;
    return true;
  });

  const approvedCount = photos.filter((p) => p.feedApproved).length;

  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="mb-2xl">
        <div className="flex items-center gap-sm mb-xs">
          <Link href="/admin" className="text-meta text-ls-secondary hover:text-ls-primary">Admin</Link>
          <span className="text-ls-secondary">/</span>
          <span className="text-meta text-ls-body">Photo Feed</span>
        </div>
        <h1 className="text-[24px] font-bold text-ls-primary flex items-center gap-sm">
          <Camera size={24} /> Photo Feed
        </h1>
        <p className="text-[14px] text-ls-secondary mt-xs">
          Review user-uploaded photos and approve them for the community feed.
          {!loading && ` ${photos.length} photos total, ${approvedCount} approved.`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-sm mb-xl">
        <div className="flex gap-sm">
          {(["all", "pending", "approved"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[12px] font-semibold px-md py-xs rounded-badge transition-colors capitalize ${
                filter === f ? "bg-ls-primary text-white" : "bg-ls-surface text-ls-secondary hover:text-ls-primary"
              }`}
            >
              {f === "pending" ? "Not Approved" : f}
            </button>
          ))}
        </div>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value as PhotoTag | "")}
          className="text-[12px] bg-white border border-ls-border rounded-btn px-md py-xs focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="food">Food</option>
          <option value="drinks">Drinks</option>
          <option value="inside">Inside</option>
          <option value="outside">Outside</option>
          <option value="menu">Menu</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Photo grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white rounded-card border border-ls-border overflow-hidden animate-pulse">
              <div className="aspect-square bg-ls-surface" />
              <div className="p-md space-y-sm">
                <div className="h-3 bg-ls-surface rounded w-2/3" />
                <div className="h-3 bg-ls-surface rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-ls-border rounded-card py-3xl text-center">
          <Camera size={32} className="text-ls-secondary mx-auto mb-sm" />
          <p className="text-[14px] text-ls-secondary">No photos found for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md">
          {filtered.map((photo) => (
            <div
              key={photo.id}
              className={`bg-white rounded-card border overflow-hidden transition-shadow hover:shadow-md ${
                photo.feedApproved ? "border-red-200" : "border-ls-border"
              }`}
            >
              {/* Image */}
              <div className="relative aspect-square bg-ls-surface">
                <img
                  src={photo.url}
                  alt={photo.description || "Photo"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Tag badge */}
                <span className="absolute top-[6px] left-[6px] text-[10px] font-semibold bg-black/50 text-white px-[6px] py-[2px] rounded-full capitalize">
                  {photo.tag}
                </span>
                {/* Approve button */}
                <button
                  onClick={() => toggleApproval(photo)}
                  disabled={togglingId === photo.id}
                  className={`absolute top-[6px] right-[6px] p-[6px] rounded-full transition-colors disabled:opacity-50 ${
                    photo.feedApproved
                      ? "bg-red-500 text-white"
                      : "bg-white/80 text-gray-400 hover:text-red-500"
                  }`}
                  title={photo.feedApproved ? "Remove from feed" : "Approve for feed"}
                >
                  <Heart size={16} className={photo.feedApproved ? "fill-white" : ""} />
                </button>
              </div>

              {/* Info */}
              <div className="p-md">
                {photo.description && (
                  <p className="text-[12px] text-ls-body line-clamp-2 mb-sm">{photo.description}</p>
                )}
                {photo.foodTags && photo.foodTags.length > 0 && (
                  <div className="flex flex-wrap gap-[3px] mb-sm">
                    {photo.foodTags.map((t) => (
                      <span key={t} className="text-[10px] bg-ls-surface text-ls-body px-[5px] py-[1px] rounded-full">{t}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-[4px] text-[11px] text-ls-secondary">
                  <User size={10} />
                  <span className="truncate">{photo.userName || "Anonymous"}</span>
                </div>
                <Link
                  href={`/admin/businesses/${photo.businessId}/edit`}
                  className="flex items-center gap-[4px] text-[11px] text-ls-secondary hover:text-ls-primary mt-[2px]"
                >
                  <Store size={10} />
                  <span className="truncate">{photo.businessName}</span>
                </Link>
                {photo.createdAt && (
                  <div className="flex items-center gap-[4px] text-[10px] text-ls-secondary mt-[2px]">
                    <Clock size={9} />
                    <span>{fmtDate(photo.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
