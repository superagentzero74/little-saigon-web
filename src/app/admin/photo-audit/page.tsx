"use client";

import { useState, useEffect, useRef } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Camera, Search, Upload, Loader2, ExternalLink, Image as ImageIcon, AlertTriangle, Check } from "lucide-react";
import Link from "next/link";

interface BizPhoto {
  id: string;
  name: string;
  address: string;
  category: string;
  photos: string[];
  placeId?: string;
}

interface FixedEntry {
  biz: BizPhoto;
  fixedAt: number; // timestamp ms
}

const FIXED_KEY = "photo_audit_fixed";
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

function loadFixed(): FixedEntry[] {
  try {
    const raw = localStorage.getItem(FIXED_KEY);
    if (!raw) return [];
    const entries: FixedEntry[] = JSON.parse(raw);
    const now = Date.now();
    return entries.filter((e) => now - e.fixedAt < FORTY_EIGHT_HOURS);
  } catch { return []; }
}

function saveFixed(entries: FixedEntry[]) {
  localStorage.setItem(FIXED_KEY, JSON.stringify(entries));
}

type FilterMode = "none" | "few" | "one" | "all" | "fixed";

export default function PhotoAuditPage() {
  const [businesses, setBusinesses] = useState<BizPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState<FilterMode>("none");
  const [uploading, setUploading] = useState<string | null>(null);
  const [fetching, setFetching] = useState<string | null>(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fixed, setFixed] = useState<FixedEntry[]>([]);
  const [bizErrors, setBizErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetBizId, setTargetBizId] = useState<string | null>(null);

  const flash = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "businesses"));
      const all: BizPhoto[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        const photos = (data.photos || []).filter((p: string) => p && p.trim());
        all.push({
          id: d.id,
          name: data.name || "",
          address: data.address || "",
          category: data.category || "",
          photos,
          placeId: data.placeId,
        });
      });
      all.sort((a, b) => a.photos.length - b.photos.length);
      setBusinesses(all);
      setLoading(false);
    }
    load();
    setFixed(loadFixed());
  }, []);

  const fixedIds = new Set(fixed.map((f) => f.biz.id));

  const filtered = mode === "fixed"
    ? fixed.map((f) => f.biz).filter((b) => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        return b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
      })
    : businesses.filter((b) => {
        if (mode === "none" && b.photos.length !== 0) return false;
        if (mode === "few" && b.photos.length >= 3) return false;
        if (mode === "one" && b.photos.length !== 1) return false;
        if (filter) {
          const q = filter.toLowerCase();
          return b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
        }
        return true;
      });

  const stats = {
    noPhotos: businesses.filter((b) => b.photos.length === 0).length,
    onePhoto: businesses.filter((b) => b.photos.length === 1).length,
    fewPhotos: businesses.filter((b) => b.photos.length > 0 && b.photos.length < 3).length,
    total: businesses.length,
  };

  const fetchPhotos = async (biz: BizPhoto) => {
    if (!biz.placeId) {
      setBizErrors((prev) => ({ ...prev, [biz.id]: "No Place ID" }));
      return;
    }
    setFetching(biz.id);
    setBizErrors((prev) => { const n = { ...prev }; delete n[biz.id]; return n; });
    try {
      const res = await fetch("/api/admin/fetch-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: biz.id, placeId: biz.placeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const updatedBiz = { ...biz, photos: data.urls };
      setBusinesses((prev) => prev.map((b) => b.id === biz.id ? updatedBiz : b));
      const newFixed = [...fixed.filter((f) => f.biz.id !== biz.id), { biz: updatedBiz, fixedAt: Date.now() }];
      setFixed(newFixed);
      saveFixed(newFixed);
      flash(`${biz.name}: ${data.count} photo(s) fetched`);
    } catch (err: any) {
      setBizErrors((prev) => ({ ...prev, [biz.id]: err.message }));
    }
    setFetching(null);
  };

  const fetchAll = async () => {
    const targets = filtered.filter((b) => b.placeId && b.photos.length === 0);
    if (targets.length === 0) { flash("No businesses with Place ID to fetch", true); return; }
    setFetchingAll(true);
    let success = 0;
    for (const biz of targets) {
      await fetchPhotos(biz);
      success++;
      await new Promise((r) => setTimeout(r, 500));
    }
    flash(`Done! Processed ${success} businesses`);
    setFetchingAll(false);
  };

  const handleUpload = async (bizId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(bizId);
    try {
      const biz = businesses.find((b) => b.id === bizId);
      const existingPhotos = biz?.photos || [];
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `businesses/${bizId}/photos/card_${Date.now()}_${i}.jpg`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      }
      const allPhotos = [...existingPhotos, ...newUrls];
      await updateDoc(doc(db, "businesses", bizId), { photos: allPhotos, active: true });
      const updatedBiz = { ...(biz as BizPhoto), photos: allPhotos };
      setBusinesses((prev) => prev.map((b) => b.id === bizId ? updatedBiz : b));
      const newFixed = [...fixed.filter((f) => f.biz.id !== bizId), { biz: updatedBiz, fixedAt: Date.now() }];
      setFixed(newFixed);
      saveFixed(newFixed);
      flash(`${newUrls.length} photo(s) added to ${biz?.name}`);
    } catch (err: any) {
      flash(err.message || "Upload failed", true);
    }
    setUploading(null);
    setTargetBizId(null);
  };

  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Photo Audit</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">
            Review and fix business photos across all listings.{" "}
            <Link href="/admin/photo-replacement-queue" className="underline text-ls-primary hover:opacity-80">
              See Replacement Queue notes
            </Link>{" "}
            for the auto-refresh Cloud Function and how to terminate it.
          </p>
        </div>
        <div className="flex items-center gap-md">
          {msg && (
            <span className={`text-[13px] font-semibold ${msg.err ? "text-red-600" : "text-green-600"}`}>
              {msg.err ? "⚠ " : "✓ "}{msg.text}
            </span>
          )}
          {mode === "none" && (
            <button
              onClick={fetchAll}
              disabled={fetchingAll}
              className="ls-btn flex items-center gap-sm text-[13px] py-[7px] px-lg disabled:opacity-50"
            >
              {fetchingAll ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              {fetchingAll ? "Fetching..." : "Fetch All from Google"}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-md mb-xl">
        <div className="bg-red-50 rounded-card p-md text-center">
          <p className="text-[22px] font-bold text-red-700">{stats.noPhotos}</p>
          <p className="text-[11px] font-semibold text-red-600 uppercase">No Photos</p>
        </div>
        <div className="bg-yellow-50 rounded-card p-md text-center">
          <p className="text-[22px] font-bold text-yellow-700">{stats.onePhoto}</p>
          <p className="text-[11px] font-semibold text-yellow-600 uppercase">1 Photo</p>
        </div>
        <div className="bg-blue-50 rounded-card p-md text-center">
          <p className="text-[22px] font-bold text-blue-700">{stats.fewPhotos}</p>
          <p className="text-[11px] font-semibold text-blue-600 uppercase">&lt; 3 Photos</p>
        </div>
        <div className="bg-green-50 rounded-card p-md text-center">
          <p className="text-[22px] font-bold text-green-700">{stats.total}</p>
          <p className="text-[11px] font-semibold text-green-600 uppercase">Total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-md mb-xl">
        <div className="flex bg-ls-surface rounded-btn overflow-hidden">
          {([
            ["none", "No Photos"],
            ["one", "1 Photo"],
            ["few", "< 3 Photos"],
            ["all", "All"],
            ...(fixed.length > 0 ? [["fixed", `Fixed (${fixed.length})`]] : []),
          ] as [FilterMode, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`px-lg py-[7px] text-[12px] font-semibold transition-colors ${
                mode === key ? "bg-ls-primary text-white" : "text-ls-secondary hover:text-ls-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
          <input
            type="text"
            placeholder="Search..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-[38px] pr-md py-[7px] bg-white border border-ls-border rounded-btn text-[13px] focus:outline-none focus:border-ls-primary"
          />
        </div>
        <span className="text-[13px] text-ls-secondary">{filtered.length} results</span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (targetBizId) handleUpload(targetBizId, e.target.files);
          e.target.value = "";
        }}
      />

      {/* Clear fixed button — only show on fixed tab */}
      {mode === "fixed" && fixed.length > 0 && (
        <div className="flex justify-end mb-md">
          <button
            onClick={() => { setFixed([]); saveFixed([]); setMode("none"); }}
            className="text-[11px] text-ls-secondary hover:text-red-500"
          >
            Clear fixed history
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-md">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="ls-card animate-pulse h-[100px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-3xl text-ls-secondary">
          <ImageIcon size={32} className="mx-auto mb-md text-ls-border" />
          <p>No businesses match this filter</p>
        </div>
      ) : (
        <div className="space-y-md">
          {filtered.map((biz) => (
            <div key={biz.id} className="bg-white rounded-card border border-ls-border p-lg">
              <div className="flex items-start justify-between gap-lg mb-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm">
                    <Link href={`/admin/businesses/${biz.id}/edit`} className="text-[15px] font-semibold text-ls-primary hover:underline truncate">
                      {biz.name}
                    </Link>
                    <span className={`text-[10px] font-bold px-[6px] py-[2px] rounded-full ${
                      fixedIds.has(biz.id) ? "bg-green-100 text-green-700" :
                      biz.photos.length === 0 ? "bg-red-100 text-red-700" :
                      biz.photos.length === 1 ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {biz.photos.length} photo{biz.photos.length === 1 ? "" : "s"}
                    </span>
                    {mode === "fixed" && (() => {
                      const entry = fixed.find((f) => f.biz.id === biz.id);
                      if (!entry) return null;
                      const ago = Math.round((Date.now() - entry.fixedAt) / 60000);
                      const t = ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : `${Math.round(ago / 1440)}d ago`;
                      return <span className="text-[10px] text-green-600">{t}</span>;
                    })()}
                  </div>
                  <p className="text-[12px] text-ls-secondary mt-[2px]">{biz.category.replace(/_/g, " ")} · {biz.address}</p>
                </div>
                <div className="flex items-center gap-sm shrink-0">
                  {biz.placeId && (
                    <button
                      onClick={() => fetchPhotos(biz)}
                      disabled={fetching === biz.id}
                      className="flex items-center gap-xs text-[11px] font-semibold px-md py-[5px] rounded-btn bg-green-600 text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {fetching === biz.id ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                      Fetch
                    </button>
                  )}
                  <button
                    onClick={() => { setTargetBizId(biz.id); fileInputRef.current?.click(); }}
                    disabled={uploading === biz.id}
                    className="flex items-center gap-xs text-[11px] font-semibold px-md py-[5px] rounded-btn bg-ls-primary text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {uploading === biz.id ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                    Add
                  </button>
                </div>
              </div>

              {/* Photo thumbnails */}
              {biz.photos.length > 0 ? (
                <div className="flex gap-[4px] overflow-x-auto">
                  {biz.photos.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${biz.name} photo ${i + 1}`}
                      className="w-[80px] h-[80px] object-cover rounded-[6px] shrink-0 bg-ls-surface"
                      onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).className += " border border-red-200"; }}
                    />
                  ))}
                  {biz.photos.length < 3 && (
                    <div className="w-[80px] h-[80px] rounded-[6px] border-2 border-dashed border-ls-border flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-ls-secondary text-center leading-tight">Need<br/>more</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-sm py-sm">
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-[12px] text-red-600">No photos — business card will show placeholder</span>
                </div>
              )}

              {/* Inline error */}
              {bizErrors[biz.id] && (
                <div className="flex items-center gap-sm mt-sm px-sm py-xs bg-red-50 border border-red-200 rounded text-[12px] text-red-700">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{bizErrors[biz.id]}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
