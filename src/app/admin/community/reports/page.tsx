"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  collectionGroup,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Flag, Loader2, Check, X, Trash2, MessageCircle } from "lucide-react";

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: "thread" | "reply";
  targetId: string;
  threadId: string;
  reason: string;
  createdAt?: { seconds: number };
  status: "pending" | "reviewed" | "dismissed";
}

interface ThreadPreview {
  title: string;
  body: string;
  authorName: string;
  categorySlug: string;
}

interface ReplyPreview {
  body: string;
  authorName: string;
}

export default function ForumReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "reviewed" | "dismissed" | "all">("pending");
  const [threadCache, setThreadCache] = useState<Record<string, ThreadPreview>>({});
  const [replyCache, setReplyCache] = useState<Record<string, ReplyPreview>>({}); // key = `${threadId}/${replyId}`
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const constraints: any[] = [orderBy("createdAt", "desc"), limit(100)];
      if (filter !== "all") constraints.unshift(where("status", "==", filter));
      const snap = await getDocs(query(collection(db, "forumReports"), ...constraints));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Report[];
      setReports(list);

      // Prefetch thread + reply previews
      const threadIds = Array.from(new Set(list.map((r) => r.threadId)));
      const tCache: Record<string, ThreadPreview> = { ...threadCache };
      await Promise.all(
        threadIds
          .filter((id) => !tCache[id])
          .map(async (id) => {
            const tSnap = await getDocs(query(collection(db, "forumThreads"), where("__name__", "==", id)));
            tSnap.forEach((d) => {
              const td = d.data() as any;
              tCache[id] = {
                title: td.title || "(deleted)",
                body: td.body || "",
                authorName: td.authorName || "",
                categorySlug: td.categorySlug || "",
              };
            });
          })
      );
      setThreadCache(tCache);

      const rCache: Record<string, ReplyPreview> = { ...replyCache };
      await Promise.all(
        list
          .filter((r) => r.targetType === "reply" && !rCache[`${r.threadId}/${r.targetId}`])
          .map(async (r) => {
            const replyDoc = await getDocs(query(
              collection(db, "forumThreads", r.threadId, "replies"),
              where("__name__", "==", r.targetId)
            ));
            replyDoc.forEach((d) => {
              const rd = d.data() as any;
              rCache[`${r.threadId}/${r.targetId}`] = { body: rd.body || "(deleted)", authorName: rd.authorName || "" };
            });
          })
      );
      setReplyCache(rCache);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function flash(s: string) {
    setMsg(s);
    setTimeout(() => setMsg(null), 2500);
  }

  async function setStatus(report: Report, status: "reviewed" | "dismissed") {
    setBusy(report.id);
    try {
      await updateDoc(doc(db, "forumReports", report.id), { status });
      setReports((prev) => prev.filter((r) => filter === "all" || r.id !== report.id));
      flash(`Marked ${status}`);
    } catch (e) {
      console.error(e);
      flash("Failed");
    }
    setBusy(null);
  }

  async function deleteTarget(report: Report) {
    if (!confirm(`Delete this ${report.targetType}? This cannot be undone.`)) return;
    setBusy(report.id);
    try {
      if (report.targetType === "thread") {
        await deleteDoc(doc(db, "forumThreads", report.threadId));
      } else {
        await deleteDoc(doc(db, "forumThreads", report.threadId, "replies", report.targetId));
      }
      await updateDoc(doc(db, "forumReports", report.id), { status: "reviewed" });
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      flash(`Deleted ${report.targetType}`);
    } catch (e) {
      console.error(e);
      flash("Failed");
    }
    setBusy(null);
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="p-xl max-w-[1200px]">
      <div className="mb-lg">
        <h1 className="text-2xl font-bold text-ls-primary mb-xs flex items-center gap-sm">
          <Flag size={22} /> Forum Reports
        </h1>
        <p className="text-sm text-ls-secondary">
          User reports on threads and replies. Mark <strong>Reviewed</strong> or <strong>Dismissed</strong>,
          or delete the offending content directly.
        </p>
      </div>

      <div className="flex items-center gap-sm mb-lg">
        {(["pending", "reviewed", "dismissed", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-md py-xs text-sm font-medium rounded-full transition-colors ${
              filter === s ? "bg-ls-primary text-white" : "bg-white text-ls-primary border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s === "pending" && pendingCount > 0 && <span className="ml-xs">({pendingCount})</span>}
          </button>
        ))}
      </div>

      {msg && (
        <div className="fixed bottom-lg right-lg z-50 px-md py-sm rounded-md shadow-lg text-sm text-white bg-ls-primary">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-sm text-ls-secondary">
          <Loader2 size={16} className="animate-spin" /> Loading reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="p-xl text-center text-ls-secondary bg-white rounded-lg border border-gray-200">
          No reports match this filter.
        </div>
      ) : (
        <div className="space-y-md">
          {reports.map((r) => {
            const thread = threadCache[r.threadId];
            const reply = r.targetType === "reply" ? replyCache[`${r.threadId}/${r.targetId}`] : null;
            return (
              <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-lg">
                <div className="flex items-start justify-between gap-md mb-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm mb-xs text-xs text-ls-secondary">
                      <span className="px-sm py-[2px] rounded bg-red-100 text-red-700 font-bold uppercase">
                        {r.targetType}
                      </span>
                      <span>Reported by <strong>{r.reporterName}</strong></span>
                      {r.createdAt && (
                        <span>{new Date(r.createdAt.seconds * 1000).toLocaleString()}</span>
                      )}
                      <span className={`ml-auto px-sm py-[2px] rounded-full text-[10px] font-bold uppercase ${
                        r.status === "pending" ? "bg-amber-100 text-amber-800" :
                        r.status === "reviewed" ? "bg-emerald-100 text-emerald-800" :
                        "bg-gray-100 text-gray-700"
                      }`}>{r.status}</span>
                    </div>

                    <p className="text-sm text-ls-primary font-semibold mb-xs">Reason:</p>
                    <p className="text-sm text-ls-primary mb-md whitespace-pre-wrap">{r.reason}</p>

                    {thread && (
                      <div className="border-l-4 border-ls-border pl-md mb-sm">
                        <p className="text-xs text-ls-secondary mb-[2px]">Thread · {thread.categorySlug}</p>
                        <p className="text-sm font-semibold text-ls-primary mb-xs">{thread.title}</p>
                        <p className="text-xs text-ls-secondary line-clamp-3">{thread.body}</p>
                        <p className="text-[10px] text-ls-secondary mt-[2px]">by {thread.authorName}</p>
                      </div>
                    )}
                    {reply && (
                      <div className="border-l-4 border-red-300 pl-md mb-sm">
                        <p className="text-xs text-ls-secondary mb-[2px]">Reply</p>
                        <p className="text-sm text-ls-primary whitespace-pre-wrap">{reply.body}</p>
                        <p className="text-[10px] text-ls-secondary mt-[2px]">by {reply.authorName}</p>
                      </div>
                    )}
                  </div>
                </div>

                {r.status === "pending" && (
                  <div className="flex gap-sm mt-md pt-md border-t border-gray-100">
                    <button
                      onClick={() => setStatus(r, "dismissed")}
                      disabled={busy === r.id}
                      className="flex items-center gap-xs px-md py-xs text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                      <X size={14} /> Dismiss
                    </button>
                    <button
                      onClick={() => setStatus(r, "reviewed")}
                      disabled={busy === r.id}
                      className="flex items-center gap-xs px-md py-xs text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <Check size={14} /> Mark Reviewed
                    </button>
                    <button
                      onClick={() => deleteTarget(r)}
                      disabled={busy === r.id}
                      className="flex items-center gap-xs px-md py-xs text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 size={14} /> Delete {r.targetType}
                    </button>
                    <Link
                      href={`/admin/community/threads/${r.threadId}`}
                      className="ml-auto flex items-center gap-xs px-md py-xs text-sm font-medium text-ls-primary hover:underline"
                    >
                      <MessageCircle size={14} /> View thread
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
