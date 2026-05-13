"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  collectionGroup,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  doc,
  updateDoc,
  deleteDoc,
  arrayRemove,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Camera, Loader2, Trash2, Check, ExternalLink, Filter, Search, Info, ChevronDown, ChevronRight } from "lucide-react";
import { webpIfFirebase } from "@/lib/webp";

interface QueuePhoto {
  id: string;
  businessId: string;
  businessName?: string;
  businessExists: boolean;
  url: string;
  tag?: string;
  reviewed?: boolean;
  scrapedFrom?: string;
  mustReplaceBy?: { seconds: number } | null;
  createdAt?: any;
}

const PAGE_SIZE = 60;

export default function PhotoReplacementQueuePage() {
  const [photos, setPhotos] = useState<QueuePhoto[]>([]);
  const [bizNames, setBizNames] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [totalScraped, setTotalScraped] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const flash = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3000);
  };

  // Bootstrap: load business name lookup, then first page
  useEffect(() => {
    (async () => {
      try {
        const [bizSnap] = await Promise.all([getDocs(collection(db, "businesses"))]);
        const names: Record<string, string> = {};
        bizSnap.forEach((d) => {
          const data = d.data();
          names[d.id] = data.name || d.id;
        });
        setBizNames(names);
        await loadPage(null, names);
      } catch (e) {
        console.error(e);
        flash("Failed to load queue", true);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPage(
    after: QueryDocumentSnapshot<DocumentData> | null,
    names: Record<string, string>
  ) {
    try {
      const constraints: any[] = [
        where("scrapedFrom", "==", "google"),
        orderBy("mustReplaceBy", "asc"),
        limit(PAGE_SIZE),
      ];
      if (after) constraints.splice(2, 0, startAfter(after));
      const snap = await getDocs(query(collectionGroup(db, "photos"), ...constraints));

      const next: QueuePhoto[] = snap.docs.map((d) => {
        const data = d.data();
        const businessId = d.ref.parent.parent?.id || "";
        const businessName = names[businessId];
        return {
          id: d.id,
          businessId,
          businessName,
          businessExists: !!businessName,
          url: data.url,
          tag: data.tag,
          reviewed: data.reviewed === true,
          scrapedFrom: data.scrapedFrom,
          mustReplaceBy: data.mustReplaceBy ?? null,
          createdAt: data.createdAt,
        };
      });

      setPhotos((prev) => (after ? [...prev, ...next] : next));
      if (snap.docs.length < PAGE_SIZE) setDone(true);
      setCursor(snap.docs[snap.docs.length - 1] || null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function loadMore() {
    if (!cursor || done || loadingMore) return;
    setLoadingMore(true);
    await loadPage(cursor, bizNames);
  }

  async function markReviewed(p: QueuePhoto) {
    setBusyId(p.id);
    try {
      await updateDoc(doc(db, "businesses", p.businessId, "photos", p.id), {
        reviewed: true,
      });
      setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, reviewed: true } : x)));
      flash("Marked as reviewed");
    } catch (e) {
      console.error(e);
      flash("Failed to mark reviewed", true);
    } finally {
      setBusyId(null);
    }
  }

  async function removePhoto(p: QueuePhoto) {
    if (!confirm(`Delete this scraped photo from ${p.businessName || p.businessId}?`)) return;
    setBusyId(p.id);
    try {
      await deleteDoc(doc(db, "businesses", p.businessId, "photos", p.id));
      // Mirror the delete to the parent doc's photos array so list views /
      // hero card stop showing the now-gone URL.
      if (p.url) {
        try {
          await updateDoc(doc(db, "businesses", p.businessId), {
            photos: arrayRemove(p.url),
            updatedAt: serverTimestamp(),
          });
        } catch { /* non-fatal — the subcollection delete already succeeded */ }
      }
      setPhotos((prev) => prev.filter((x) => x.id !== p.id));
      flash("Deleted");
    } catch (e) {
      console.error(e);
      flash("Failed to delete", true);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return photos.filter((p) => {
      if (!showReviewed && p.reviewed) return false;
      if (tagFilter && p.tag !== tagFilter) return false;
      if (q && !(p.businessName || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [photos, showReviewed, search, tagFilter]);

  const tags = useMemo(() => {
    const s = new Set<string>();
    photos.forEach((p) => p.tag && s.add(p.tag));
    return Array.from(s).sort();
  }, [photos]);

  const unreviewedCount = photos.filter((p) => !p.reviewed).length;

  return (
    <div className="p-xl max-w-[1400px]">
      <div className="mb-lg">
        <h1 className="text-2xl font-bold text-ls-primary mb-xs flex items-center gap-sm">
          <Camera size={22} /> Photo Replacement Queue
        </h1>
        <p className="text-sm text-ls-secondary">
          Audit Google-scraped photos (<code>scrapedFrom: &quot;google&quot;</code>), oldest expiry first.
          Mark <strong>Keep</strong> to dismiss from queue, or <strong>Delete</strong> to remove.
          Photos whose parent business no longer exists are flagged as <em>orphan</em>.
        </p>
      </div>

      {/* Notes / Operator Docs */}
      <div className="mb-lg bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowNotes((v) => !v)}
          className="w-full flex items-center gap-sm px-md py-sm text-sm font-semibold text-blue-900 hover:bg-blue-100 transition-colors"
        >
          {showNotes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Info size={14} />
          How the photo system works (read before changing things)
        </button>
        {showNotes && (
          <div className="px-md pb-md text-[13px] text-blue-900 leading-relaxed space-y-sm">
            <div>
              <p className="font-semibold mb-xs">Photo origin fields (Firestore <code>businesses/{`{id}`}/photos/{`{photoId}`}</code>):</p>
              <ul className="list-disc pl-lg space-y-[2px]">
                <li><code>scrapedFrom: &quot;google&quot;</code> — photo was pulled from Google Places. This is the canonical &quot;is it scraped?&quot; flag.</li>
                <li><code>mustReplaceBy</code> — Timestamp ~1 year after scrape. The product intent is to flush all scraped imagery before this date.</li>
                <li><code>uploadedBy</code> — sparse. <code>null</code> on legacy migrated photos, user UID on user uploads. Don&apos;t key on this for cleanup.</li>
                <li><code>reviewed: true</code> — added by this page when you click <strong>Keep</strong>.</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-xs">Why URLs break (the bug this whole system fixes):</p>
              <p>
                Google CDN URLs (<code>lh3.googleusercontent.com/place-photos/AL8-SN…</code>) are signed/temporary
                and 403 after a few months — well before <code>mustReplaceBy</code> would suggest. The fix is to
                re-fetch via the Places Photo API and re-host in our Firebase Storage bucket so the URL is permanent.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-xs">Automated cleanup — Cloud Function <code>refreshExpiredGooglePhotos</code>:</p>
              <ul className="list-disc pl-lg space-y-[2px]">
                <li>Schedule: <strong>daily at 03:00 PT</strong> (region: <code>us-west1</code>)</li>
                <li>Processes up to <strong>15 businesses per run</strong> (~90 Places API calls/day)</li>
                <li>Picks Google-scraped photos whose URL still points at <code>lh3.googleusercontent.com</code></li>
                <li>7-day cooldown per business after a failed attempt (skip closed places etc.)</li>
                <li>After refresh, photos live in Firebase Storage (<code>card_0.jpg…card_4.jpg</code>) and won&apos;t expire</li>
                <li>API key stored as Secret Manager secret <code>PLACES_API_KEY</code></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-xs">To pause or terminate the scheduled function:</p>
              <ul className="list-disc pl-lg space-y-[2px]">
                <li>
                  <strong>Pause</strong> (keeps function, stops schedule):{" "}
                  <code>gcloud scheduler jobs pause firebase-schedule-refreshExpiredGooglePhotos-us-west1 --location=us-west1</code>
                </li>
                <li>
                  <strong>Resume</strong>:{" "}
                  <code>gcloud scheduler jobs resume firebase-schedule-refreshExpiredGooglePhotos-us-west1 --location=us-west1</code>
                </li>
                <li>
                  <strong>Delete entirely</strong>:{" "}
                  <code>firebase functions:delete refreshExpiredGooglePhotos --region us-west1 --force</code>
                </li>
                <li>
                  <strong>Manual trigger</strong> (run now without waiting):{" "}
                  <code>gcloud scheduler jobs run firebase-schedule-refreshExpiredGooglePhotos-us-west1 --location=us-west1</code>
                </li>
                <li>
                  <strong>Logs</strong>: Firebase Console → Functions → <code>refreshExpiredGooglePhotos</code> → Logs
                </li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-xs">Manual one-off refresh (specific store list):</p>
              <p>
                Edit <code>seed/refresh-thh-photos.js</code>, replace the <code>STORE_IDS</code> array with the
                businesses you want, then <code>node refresh-thh-photos.js --write</code>. Same logic as the Cloud Function.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-xs">Source files (search if you change schema):</p>
              <ul className="list-disc pl-lg space-y-[2px]">
                <li><code>functions/src/refreshGooglePhotos.ts</code> — scheduled Cloud Function</li>
                <li><code>seed/refresh-thh-photos.js</code> — manual one-off refresh script</li>
                <li><code>web/src/app/api/admin/fetch-photos/route.ts</code> — per-business refresh endpoint used by Photo Manager</li>
                <li><code>web/firestore.indexes.json</code> — collectionGroup index <code>photos: scrapedFrom + mustReplaceBy</code></li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-md mb-md text-sm">
        <span className="px-md py-xs rounded-full bg-ls-surface text-ls-primary font-medium">
          Loaded: {photos.length}
        </span>
        <span className="px-md py-xs rounded-full bg-amber-100 text-amber-900 font-medium">
          Unreviewed: {unreviewedCount}
        </span>
        <span className="px-md py-xs rounded-full bg-emerald-100 text-emerald-900 font-medium">
          Reviewed: {photos.length - unreviewedCount}
        </span>
        {!done && (
          <span className="text-xs text-ls-secondary">More photos available — click Load More</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-md mb-lg p-md bg-white rounded-lg border border-gray-200">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-sm top-1/2 -translate-y-1/2 text-ls-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name..."
            className="w-full pl-[28px] pr-md py-xs text-sm border border-gray-300 rounded-md focus:outline-none focus:border-ls-primary"
          />
        </div>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-md py-xs text-sm border border-gray-300 rounded-md"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-xs text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showReviewed}
            onChange={(e) => setShowReviewed(e.target.checked)}
          />
          Show reviewed
        </label>
      </div>

      {/* Toast */}
      {msg && (
        <div
          className={`fixed bottom-lg right-lg z-50 px-md py-sm rounded-md shadow-lg text-sm text-white ${
            msg.err ? "bg-red-600" : "bg-ls-primary"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center gap-sm text-ls-secondary">
          <Loader2 size={16} className="animate-spin" /> Loading queue...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-xl text-center text-ls-secondary bg-white rounded-lg border border-gray-200">
          No scraped photos match the current filter. {!showReviewed && "Try \"Show reviewed\" or load more."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-md">
          {filtered.map((p) => (
            <PhotoCard
              key={p.id}
              p={p}
              busy={busyId === p.id}
              onKeep={() => markReviewed(p)}
              onDelete={() => removePhoto(p)}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && !done && (
        <div className="mt-xl flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-lg py-sm bg-ls-primary text-white text-sm font-medium rounded-md disabled:opacity-50 flex items-center gap-xs"
          >
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
            Load next {PAGE_SIZE}
          </button>
        </div>
      )}
    </div>
  );
}

function expiryLabel(p: QueuePhoto): { text: string; tone: "red" | "amber" | "gray" } | null {
  if (!p.mustReplaceBy?.seconds) return null;
  const expiryMs = p.mustReplaceBy.seconds * 1000;
  const days = Math.round((expiryMs - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return { text: `expired ${-days}d`, tone: "red" };
  if (days < 30) return { text: `${days}d left`, tone: "amber" };
  return { text: `${days}d`, tone: "gray" };
}

function PhotoCard({
  p,
  busy,
  onKeep,
  onDelete,
}: {
  p: QueuePhoto;
  busy: boolean;
  onKeep: () => void;
  onDelete: () => void;
}) {
  const expiry = expiryLabel(p);
  const expiryClass =
    expiry?.tone === "red"
      ? "bg-red-600 text-white"
      : expiry?.tone === "amber"
        ? "bg-amber-500 text-white"
        : "bg-black/60 text-white";
  return (
    <div
      className={`bg-white rounded-lg border overflow-hidden flex flex-col ${
        p.reviewed ? "border-emerald-300" : !p.businessExists ? "border-red-300" : "border-gray-200"
      }`}
    >
      <div className="relative aspect-square bg-gray-100">
        {p.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={webpIfFirebase(p.url)}
            alt={p.businessName || "scraped photo"}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-ls-secondary">
            No URL
          </div>
        )}
        {p.reviewed && (
          <div className="absolute top-xs right-xs px-xs py-[2px] bg-emerald-600 text-white text-[10px] font-bold rounded uppercase tracking-wide">
            Reviewed
          </div>
        )}
        {!p.businessExists && (
          <div className="absolute top-xs left-xs px-xs py-[2px] bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-wide">
            Orphan
          </div>
        )}
        {expiry && (
          <div
            className={`absolute bottom-xs right-xs px-xs py-[2px] text-[10px] font-bold rounded uppercase tracking-wide ${expiryClass}`}
          >
            {expiry.text}
          </div>
        )}
        {p.tag && (
          <div className="absolute bottom-xs left-xs px-xs py-[2px] bg-black/60 text-white text-[10px] font-medium rounded uppercase tracking-wide">
            {p.tag}
          </div>
        )}
      </div>
      <div className="p-sm flex flex-col gap-xs flex-1">
        <Link
          href={`/admin/businesses/${p.businessId}/edit`}
          className="text-xs font-semibold text-ls-primary line-clamp-2 hover:underline flex items-start gap-[2px]"
          title={p.businessName || p.businessId}
          target="_blank"
        >
          {p.businessName || p.businessId}
          <ExternalLink size={10} className="mt-[2px] flex-shrink-0 opacity-60" />
        </Link>
        <div className="flex gap-xs mt-auto">
          <button
            onClick={onKeep}
            disabled={busy || p.reviewed}
            className="flex-1 px-xs py-[6px] text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-[2px]"
            title={p.reviewed ? "Already reviewed" : "Mark reviewed (keep)"}
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Keep
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="flex-1 px-xs py-[6px] text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-[2px]"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
