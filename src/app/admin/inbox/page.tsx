"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Inbox,
  MessageSquare,
  MapPin,
  Mail,
  Loader2,
  RefreshCw,
  Plus,
  Check,
  X,
  Copy as CopyIcon,
  ExternalLink,
  Search,
} from "lucide-react";

type Tab = "feedback" | "suggestions";

interface FeedbackEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  text: string;
  pointsAwarded: boolean;
  createdAt?: Date;
}

interface SuggestionEntry {
  id: string;
  businessName: string;
  address: string;
  category: string;
  notes: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  createdAt?: Date;
}

interface DbBiz {
  id: string;
  name: string;
  address: string;
  normName: string;
}

interface Match {
  level: "exact" | "fuzzy" | "none";
  biz?: DbBiz;
  others?: DbBiz[];
}

const STATUS_OPTIONS = ["all", "new", "added", "duplicate", "dismissed"] as const;

export default function InboxPage() {
  const [tab, setTab] = useState<Tab>("feedback");
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionEntry[]>([]);
  const [businesses, setBusinesses] = useState<DbBiz[]>([]);
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_OPTIONS[number]>("all");
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  async function loadFeedback() {
    const snap = await getDocs(
      query(collection(db, "feedback"), orderBy("createdAt", "desc"), limit(200))
    );
    setFeedback(
      snap.docs.map((d) => {
        const x = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          userId: (x.userId as string) ?? "",
          userName: (x.userName as string) ?? "",
          userEmail: (x.userEmail as string) ?? "",
          text: (x.text as string) ?? "",
          pointsAwarded: !!x.pointsAwarded,
          createdAt: (x.createdAt as { toDate?: () => Date })?.toDate?.(),
        };
      })
    );
  }

  async function loadSuggestionsAndBusinesses() {
    const [sSnap, bSnap] = await Promise.all([
      getDocs(query(collection(db, "businessSuggestions"), orderBy("createdAt", "desc"), limit(200))),
      getDocs(collection(db, "businesses")),
    ]);
    setSuggestions(
      sSnap.docs.map((d) => {
        const x = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          businessName: (x.businessName as string) ?? "",
          address: (x.address as string) ?? "",
          category: (x.category as string) ?? "",
          notes: (x.notes as string) ?? "",
          userId: (x.userId as string) ?? "",
          userName: (x.userName as string) ?? "",
          userEmail: (x.userEmail as string) ?? "",
          status: (x.status as string) ?? "new",
          createdAt: (x.createdAt as { toDate?: () => Date })?.toDate?.(),
        };
      })
    );
    setBusinesses(
      bSnap.docs.map((d) => {
        const x = d.data() as Record<string, unknown>;
        const name = (x.name as string) ?? "";
        return {
          id: d.id,
          name,
          address: (x.address as string) ?? "",
          normName: normalize(name),
        };
      })
    );
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      if (tab === "feedback") {
        await loadFeedback();
      } else {
        await loadSuggestionsAndBusinesses();
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Group suggestions by normalized business name to count duplicates.
  const suggestionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of suggestions) {
      const key = normalize(s.businessName);
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [suggestions]);

  function matchSuggestion(s: SuggestionEntry): Match {
    const norm = normalize(s.businessName);
    if (!norm || businesses.length === 0) return { level: "none" };
    const exact = businesses.find((b) => b.normName === norm);
    if (exact) return { level: "exact", biz: exact };
    const fuzzy = businesses.filter(
      (b) => b.normName.includes(norm) || norm.includes(b.normName)
    );
    if (fuzzy.length === 1) return { level: "fuzzy", biz: fuzzy[0] };
    if (fuzzy.length > 1) return { level: "fuzzy", biz: fuzzy[0], others: fuzzy.slice(1, 4) };
    return { level: "none" };
  }

  async function updateStatus(id: string, status: string) {
    const next = new Set(busyIds);
    next.add(id);
    setBusyIds(next);
    try {
      await updateDoc(doc(db, "businessSuggestions", id), { status });
      setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      const after = new Set(busyIds);
      after.delete(id);
      setBusyIds(after);
    }
  }

  const filteredSuggestions =
    statusFilter === "all"
      ? suggestions
      : suggestions.filter((s) => s.status === statusFilter);

  const count =
    tab === "feedback" ? feedback.length : filteredSuggestions.length;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Inbox className="text-ls-primary" size={24} />
          <h1 className="text-2xl font-bold text-ls-primary">Inbox</h1>
          <span className="text-sm text-gray-500">({count})</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4 border-b">
        <TabButton active={tab === "feedback"} onClick={() => setTab("feedback")}>
          <MessageSquare size={15} /> Feedback
        </TabButton>
        <TabButton active={tab === "suggestions"} onClick={() => setTab("suggestions")}>
          <MapPin size={15} /> Suggestions
        </TabButton>
      </div>

      {tab === "suggestions" && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-500">Status:</span>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                statusFilter === s
                  ? "bg-ls-primary text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {err && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {err}
        </div>
      )}

      {loading && count === 0 ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : tab === "feedback" ? (
        <FeedbackList entries={feedback} />
      ) : (
        <SuggestionList
          entries={filteredSuggestions}
          matchFor={matchSuggestion}
          countFor={(s) => suggestionCounts[normalize(s.businessName)] || 1}
          onStatus={updateStatus}
          busyIds={busyIds}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-ls-primary text-ls-primary"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function FeedbackList({ entries }: { entries: FeedbackEntry[] }) {
  if (entries.length === 0) return <EmptyState label="No feedback yet" />;
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.id} className="p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ls-primary">
                {displayName(e)}
              </span>
              {e.pointsAwarded && (
                <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-green-600 rounded-full">
                  PTS
                </span>
              )}
            </div>
            {e.createdAt && (
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatDate(e.createdAt)}
              </span>
            )}
          </div>
          {e.userEmail && (
            <a
              href={`mailto:${e.userEmail}`}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mb-2"
            >
              <Mail size={11} />
              {e.userEmail}
            </a>
          )}
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{e.text}</p>
        </div>
      ))}
    </div>
  );
}

function SuggestionList({
  entries,
  matchFor,
  countFor,
  onStatus,
  busyIds,
}: {
  entries: SuggestionEntry[];
  matchFor: (s: SuggestionEntry) => Match;
  countFor: (s: SuggestionEntry) => number;
  onStatus: (id: string, status: string) => void;
  busyIds: Set<string>;
}) {
  if (entries.length === 0) return <EmptyState label="No suggestions yet" />;
  return (
    <div className="space-y-3">
      {entries.map((s) => (
        <SuggestionCard
          key={s.id}
          s={s}
          match={matchFor(s)}
          duplicateCount={countFor(s)}
          onStatus={onStatus}
          busy={busyIds.has(s.id)}
        />
      ))}
    </div>
  );
}

interface PlaceHit {
  place_id: string;
  name: string;
  formatted_address: string;
}

function SuggestionCard({
  s,
  match,
  duplicateCount,
  onStatus,
  busy,
}: {
  s: SuggestionEntry;
  match: Match;
  duplicateCount: number;
  onStatus: (id: string, status: string) => void;
  busy: boolean;
}) {
  const addUrl = `/admin/businesses/new?q=${encodeURIComponent(s.businessName)}`;
  const googleQuery = encodeURIComponent(`${s.businessName} ${s.address}`.trim());
  const googleUrl = `https://www.google.com/search?q=${googleQuery}`;
  const isFresh = s.status === "new";

  // When the suggestion isn't already in our DB, pull Google Places hits so
  // the admin can pick one with one click instead of typing a search again.
  const [places, setPlaces] = useState<PlaceHit[] | null>(null);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesErr, setPlacesErr] = useState<string | null>(null);

  useEffect(() => {
    if (match.level === "exact" || s.status !== "new") return;
    if (!s.businessName.trim()) return;
    setPlacesLoading(true);
    setPlacesErr(null);
    const q = `${s.businessName} ${s.address}`.trim();
    fetch(`/api/places/search?query=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        const hits = (data.results || []).slice(0, 3) as PlaceHit[];
        setPlaces(hits);
      })
      .catch((e) => setPlacesErr(e instanceof Error ? e.message : "Google search failed"))
      .finally(() => setPlacesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id, match.level]);

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-ls-primary">
            {s.businessName || "(no name)"}
          </span>
          {duplicateCount > 1 && (
            <span className="px-2 py-0.5 text-[10px] font-semibold text-white bg-purple-600 rounded-full">
              Suggested {duplicateCount}×
            </span>
          )}
          {s.category && (
            <span className="px-2 py-0.5 text-[10px] font-semibold text-gray-700 bg-gray-200 rounded-full">
              {s.category}
            </span>
          )}
          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusColor(s.status)}`}>
            {s.status}
          </span>
        </div>
        {s.createdAt && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatDate(s.createdAt)}
          </span>
        )}
      </div>

      {/* Auto-match status */}
      <div className="mb-3">
        <MatchBadge match={match} />
      </div>

      {/* Google Places quick-add (when not in DB) */}
      {match.level !== "exact" && s.status === "new" && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Search size={11} /> Google Places suggestions
          </div>
          {placesLoading && (
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" /> Searching…
            </div>
          )}
          {placesErr && <div className="text-xs text-red-600">{placesErr}</div>}
          {!placesLoading && places && places.length === 0 && (
            <div className="text-xs text-gray-500">No matching places found on Google.</div>
          )}
          {!placesLoading && places && places.length > 0 && (
            <div className="space-y-1.5">
              {places.map((p) => (
                <div
                  key={p.place_id}
                  className="flex items-start justify-between gap-2 p-2 bg-white border rounded"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {p.formatted_address}
                    </div>
                  </div>
                  <Link
                    href={`/admin/businesses/new?placeId=${encodeURIComponent(p.place_id)}`}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-ls-primary rounded hover:opacity-90"
                  >
                    <Plus size={11} /> Add
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {s.address && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
          <MapPin size={11} className="text-orange-500" />
          {s.address}
        </div>
      )}

      {s.notes && (
        <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">
          {s.notes}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2 mt-1 border-t text-xs text-gray-500">
        <span>{submitterName(s)}</span>
        {s.userEmail && (
          <a
            href={`mailto:${s.userEmail}`}
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <Mail size={11} />
            {s.userEmail}
          </a>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {match.level !== "exact" && (
          <Link
            href={addUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-ls-primary rounded-md hover:opacity-90"
          >
            <Plus size={12} /> Add to DB
          </Link>
        )}
        {match.biz && (
          <Link
            href={`/admin/businesses/${match.biz.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ls-primary border border-ls-primary rounded-md hover:bg-gray-50"
          >
            <ExternalLink size={12} /> View Match
          </Link>
        )}
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border rounded-md hover:bg-gray-50"
        >
          <Search size={12} /> Google
        </a>
        <button
          onClick={() => navigator.clipboard?.writeText(`${s.businessName}\n${s.address}\n${s.notes}`.trim())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border rounded-md hover:bg-gray-50"
        >
          <CopyIcon size={12} /> Copy
        </button>

        <span className="ml-auto flex items-center gap-2">
          {isFresh && match.level === "exact" && (
            <button
              disabled={busy}
              onClick={() => onStatus(s.id, "duplicate")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200 disabled:opacity-50"
            >
              Mark Duplicate
            </button>
          )}
          {s.status !== "added" && (
            <button
              disabled={busy}
              onClick={() => onStatus(s.id, "added")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 disabled:opacity-50"
            >
              <Check size={11} /> Added
            </button>
          )}
          {s.status !== "dismissed" && (
            <button
              disabled={busy}
              onClick={() => onStatus(s.id, "dismissed")}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              <X size={11} /> Dismiss
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

function MatchBadge({ match }: { match: Match }) {
  if (match.level === "exact" && match.biz) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-800 bg-green-100 border border-green-200 rounded-md">
        <Check size={12} />
        Already in DB:&nbsp;
        <Link href={`/admin/businesses/${match.biz.id}`} className="underline font-semibold">
          {match.biz.name}
        </Link>
      </div>
    );
  }
  if (match.level === "fuzzy" && match.biz) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-100 border border-yellow-200 rounded-md">
        Possible match:&nbsp;
        <Link href={`/admin/businesses/${match.biz.id}`} className="underline font-semibold">
          {match.biz.name}
        </Link>
        {match.others && match.others.length > 0 && (
          <span className="text-yellow-700">
            (+{match.others.length} more)
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
      <Plus size={12} /> Not in database — needs to be added
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Inbox size={32} className="mb-2" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function displayName(e: { userName: string; userId: string }): string {
  if (e.userName) return e.userName;
  if (e.userId === "anonymous") return "Anonymous";
  return `User ${e.userId.slice(0, 6)}`;
}

function submitterName(e: { userName: string; userId: string }): string {
  return displayName(e);
}

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusColor(status: string): string {
  switch (status) {
    case "new":
      return "bg-red-100 text-red-700";
    case "reviewed":
      return "bg-yellow-100 text-yellow-700";
    case "added":
      return "bg-green-100 text-green-700";
    case "duplicate":
      return "bg-yellow-100 text-yellow-700";
    case "resolved":
      return "bg-green-100 text-green-700";
    case "dismissed":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(restaurant|cafe|bakery|the|inc|llc|co)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
