"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Building2, ExternalLink, Pencil, Mail, Phone, User, Clock } from "lucide-react";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { businessSlug } from "@/lib/utils";

interface ClaimedRow {
  id: string;
  name: string;
  phone: string;
  ownerId: string | null;
  ownerName: string;
  ownerEmail: string;
  claimedAt: Date | null;
}

export default function ClaimedBusinessesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<ClaimedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    (async () => {
      setLoading(true);
      try {
        // Query claimed businesses (no orderBy to avoid a composite index;
        // sort client-side by updatedAt desc — the timestamp the claim
        // approval bumped).
        const snap = await getDocs(
          query(collection(db, "businesses"), where("claimed", "==", true), limit(300))
        );
        const businesses = snap.docs.map((d) => {
          const x = d.data() as any;
          const updated = x.updatedAt?.toDate?.() ?? null;
          return {
            id: d.id,
            name: (x.name as string) || "Untitled",
            phone: (x.phone as string) || "",
            ownerId: (x.ownerId as string) || null,
            updatedAt: updated as Date | null,
          };
        });
        // Resolve owner contact info — batched in chunks of 30 (Firestore in() max).
        const ownerIds = Array.from(new Set(businesses.map((b) => b.ownerId).filter(Boolean))) as string[];
        const ownerMap: Record<string, { displayName: string; email: string }> = {};
        for (let i = 0; i < ownerIds.length; i += 30) {
          const chunk = ownerIds.slice(i, i + 30);
          await Promise.all(
            chunk.map(async (uid) => {
              try {
                const userSnap = await getDoc(doc(db, "users", uid));
                if (userSnap.exists()) {
                  const u = userSnap.data() as any;
                  ownerMap[uid] = {
                    displayName: u.displayName || "",
                    email: u.email || "",
                  };
                }
              } catch { /* skip */ }
            })
          );
        }
        const merged: ClaimedRow[] = businesses.map((b) => ({
          id: b.id,
          name: b.name,
          phone: b.phone,
          ownerId: b.ownerId,
          ownerName: b.ownerId ? (ownerMap[b.ownerId]?.displayName ?? "") : "",
          ownerEmail: b.ownerId ? (ownerMap[b.ownerId]?.email ?? "") : "",
          claimedAt: b.updatedAt,
        }));
        merged.sort((a, b) => (b.claimedAt?.getTime() || 0) - (a.claimedAt?.getTime() || 0));
        setRows(merged);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (authLoading) return <div className="p-2xl text-ls-secondary">Loading...</div>;
  if (!user || user.role !== "admin") return null;

  const q = search.trim().toLowerCase();
  const filtered = q.length === 0
    ? rows
    : rows.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        r.ownerEmail.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
      );

  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="mb-2xl">
        <div className="flex items-center gap-sm mb-xs">
          <Link href="/admin" className="text-meta text-ls-secondary hover:text-ls-primary">Admin</Link>
          <ChevronRight size={12} className="text-ls-secondary" />
          <Link href="/admin/claims" className="text-meta text-ls-secondary hover:text-ls-primary">Claims</Link>
          <ChevronRight size={12} className="text-ls-secondary" />
          <span className="text-meta text-ls-body">Claimed Businesses</span>
        </div>
        <h1 className="text-page-title text-ls-primary">Claimed Businesses</h1>
        <p className="text-body text-ls-secondary mt-xs">
          All businesses where ownership has been claimed, latest first.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-sm mb-xl">
        <Link
          href="/admin/claims"
          className="text-[12px] font-semibold px-md py-xs rounded-badge bg-ls-surface text-ls-secondary hover:text-ls-primary"
        >
          Requests
        </Link>
        <span className="text-[12px] font-semibold px-md py-xs rounded-badge bg-ls-primary text-white">
          Claimed Businesses
        </span>
      </div>

      {/* Search */}
      <div className="mb-lg">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by business name, owner, email, or phone…"
          className="w-full bg-white border border-ls-border rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:border-ls-primary placeholder:text-ls-secondary"
        />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-[13px] text-ls-secondary py-2xl">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-ls-border rounded-card py-3xl text-center">
          <Building2 size={32} className="text-ls-secondary mx-auto mb-sm" />
          <p className="text-[14px] text-ls-secondary">
            {rows.length === 0 ? "No claimed businesses yet." : "No matches for that search."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-ls-border rounded-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1.2fr_120px_120px_140px] gap-md px-md py-sm bg-ls-surface text-[11px] font-semibold uppercase tracking-wide text-ls-secondary">
            <div>Business</div>
            <div>Owner</div>
            <div>Phone</div>
            <div>Claimed</div>
            <div>Actions</div>
          </div>
          <div className="divide-y divide-ls-border">
            {filtered.map((r) => {
              const slug = businessSlug({ id: r.id, name: r.name } as any);
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-[1fr_1.2fr_120px_120px_140px] gap-md px-md py-md text-[13px] items-start"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-ls-primary truncate flex items-center gap-xs">
                      <Building2 size={13} className="text-ls-secondary shrink-0" />
                      {r.name}
                    </div>
                    <div className="text-[11px] text-ls-secondary font-mono truncate" title={r.id}>
                      {r.id.slice(0, 14)}…
                    </div>
                  </div>
                  <div className="min-w-0">
                    {r.ownerName ? (
                      <div className="flex items-center gap-xs text-ls-primary truncate">
                        <User size={12} className="text-ls-secondary shrink-0" />
                        {r.ownerName}
                      </div>
                    ) : (
                      <div className="text-[12px] text-ls-secondary italic">No name</div>
                    )}
                    {r.ownerEmail && (
                      <div className="flex items-center gap-xs mt-[2px]">
                        <Mail size={11} className="text-ls-secondary shrink-0" />
                        <a
                          href={`mailto:${r.ownerEmail}`}
                          className="text-[12px] text-ls-primary underline hover:no-underline truncate"
                        >
                          {r.ownerEmail}
                        </a>
                      </div>
                    )}
                    {!r.ownerEmail && r.ownerId === null && (
                      <div className="text-[11px] text-amber-700 mt-[2px]">No owner record</div>
                    )}
                  </div>
                  <div className="text-ls-primary truncate">
                    {r.phone ? (
                      <a
                        href={`tel:${r.phone}`}
                        className="flex items-center gap-xs underline hover:no-underline"
                      >
                        <Phone size={11} className="text-ls-secondary shrink-0" />
                        {r.phone}
                      </a>
                    ) : (
                      <span className="text-[12px] text-ls-secondary">—</span>
                    )}
                  </div>
                  <div className="text-ls-secondary text-[12px] flex items-center gap-xs">
                    <Clock size={11} />
                    {formatDate(r.claimedAt)}
                  </div>
                  <div className="flex items-center gap-xs flex-wrap">
                    <Link
                      href={`/admin/businesses/${r.id}/edit`}
                      className="flex items-center gap-[3px] text-[11px] font-semibold border border-ls-border rounded px-[6px] py-[3px] text-ls-primary hover:border-ls-primary"
                    >
                      <Pencil size={11} /> Edit
                    </Link>
                    <Link
                      href={`/business/${slug}`}
                      target="_blank"
                      className="flex items-center gap-[3px] text-[11px] font-semibold border border-ls-border rounded px-[6px] py-[3px] text-ls-secondary hover:text-ls-primary hover:border-ls-primary"
                    >
                      <ExternalLink size={11} /> View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-meta text-ls-secondary mt-md">
        Showing {filtered.length} of {rows.length} claimed business{rows.length === 1 ? "" : "es"}
        {q && ` (filtered)`}.
      </p>
    </div>
  );
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  const ageMs = Date.now() - d.getTime();
  const day = 86_400_000;
  if (ageMs < day) return `${Math.floor(ageMs / 3600_000)}h ago`;
  if (ageMs < 7 * day) return `${Math.floor(ageMs / day)}d ago`;
  return d.toLocaleDateString();
}
