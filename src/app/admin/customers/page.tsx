"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Phone, Mail, Calendar, AlertCircle, Store, Download } from "lucide-react";
import { listCustomers, searchCustomersByName } from "@/lib/services";
import { db } from "@/lib/firebase";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import type { Business, Customer, CustomerStatus } from "@/lib/types";

const STATUS_COLORS: Record<CustomerStatus, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  churned: "bg-red-100 text-red-700",
};

function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return null;
}

function followUpBucket(d: Date | null): "overdue" | "this-week" | "later" | "none" {
  if (!d) return "none";
  const now = new Date();
  if (d < now) return "overdue";
  const week = new Date();
  week.setDate(week.getDate() + 7);
  if (d <= week) return "this-week";
  return "later";
}

function csvField(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function isoOrEmpty(d: Date | null): string {
  return d ? d.toISOString() : "";
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  // BOM so Excel reads UTF-8 correctly (Vietnamese names with diacritics).
  const body = "﻿" + rows.map((r) => r.map(csvField).join(",")).join("\r\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CustomersListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businessMap, setBusinessMap] = useState<Map<string, Business>>(new Map());
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "">("");
  const [followUpFilter, setFollowUpFilter] = useState<"" | "overdue" | "this-week" | "later" | "none">("");
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const results = searchTerm.trim()
        ? await searchCustomersByName(searchTerm.trim())
        : await listCustomers({ status: statusFilter || undefined, limitCount: 200 });
      setCustomers(results);

      // Fetch only the first linked business per customer (what the column shows).
      const firstIds = Array.from(
        new Set(results.map((c) => c.businessIds?.[0]).filter((v): v is string => !!v))
      );
      const map = new Map<string, Business>();
      for (let i = 0; i < firstIds.length; i += 30) {
        const chunk = firstIds.slice(i, i + 30);
        const snap = await getDocs(query(collection(db, "businesses"), where(documentId(), "in", chunk)));
        snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Business));
      }
      setBusinessMap(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, searchTerm ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchTerm]);

  const filtered = useMemo(() => {
    if (!followUpFilter) return customers;
    return customers.filter((c) => followUpBucket(tsToDate(c.followUpSchedule?.nextFollowUp)) === followUpFilter);
  }, [customers, followUpFilter]);

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Make sure we have every linked business resolved (the column only fetches the first).
      const allIds = Array.from(
        new Set(filtered.flatMap((c) => c.businessIds || []).filter((v): v is string => !!v))
      );
      const missing = allIds.filter((id) => !businessMap.has(id));
      const fresh = new Map(businessMap);
      for (let i = 0; i < missing.length; i += 30) {
        const chunk = missing.slice(i, i + 30);
        const snap = await getDocs(query(collection(db, "businesses"), where(documentId(), "in", chunk)));
        snap.docs.forEach((d) => fresh.set(d.id, { id: d.id, ...d.data() } as Business));
      }
      setBusinessMap(fresh);

      const header = [
        "Customer ID",
        "Contact name",
        "Title",
        "Email",
        "Phone",
        "Businesses",
        "# businesses",
        "Interests",
        "Services interested",
        "Status",
        "Next follow-up (ISO)",
        "Follow-up type",
        "Created at (ISO)",
      ];
      const rows: (string | number | null | undefined)[][] = [header];
      for (const c of filtered) {
        const names = (c.businessIds || []).map((id) => fresh.get(id)?.name || id).join("; ");
        rows.push([
          c.id,
          c.contactPerson?.name || "",
          c.contactPerson?.title || "",
          c.contactPerson?.email || "",
          c.contactPerson?.phone || "",
          names,
          (c.businessIds || []).length,
          (c.interests || []).join("; "),
          (c.servicesInterested || []).join("; "),
          c.status,
          isoOrEmpty(tsToDate(c.followUpSchedule?.nextFollowUp)),
          c.followUpSchedule?.followUpType || "",
          isoOrEmpty(tsToDate(c.createdAt)),
        ]);
      }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`customers-${stamp}.csv`, rows);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-2xl">
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Customers</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">
            {filtered.length === customers.length
              ? `${customers.length} customers`
              : `${filtered.length} of ${customers.length} customers`}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className="flex items-center gap-sm text-[13px] font-semibold text-ls-primary border border-ls-border rounded-btn px-md py-[8px] hover:bg-ls-surface disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} /> {exporting ? "Exporting…" : "Export CSV"}
          </button>
          <Link href="/admin/customers/new" className="ls-btn flex items-center gap-sm text-[13px]">
            <Plus size={15} /> New Customer
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-md mb-xl">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
          <input
            type="text"
            placeholder="Search by contact name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-[38px] pr-md py-[9px] bg-white border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | "")}
          className="bg-white border border-ls-border rounded-btn px-md py-[9px] text-[14px] focus:outline-none focus:border-ls-primary"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="churned">Churned</option>
        </select>
        <select
          value={followUpFilter}
          onChange={(e) => setFollowUpFilter(e.target.value as any)}
          className="bg-white border border-ls-border rounded-btn px-md py-[9px] text-[14px] focus:outline-none focus:border-ls-primary"
        >
          <option value="">All follow-ups</option>
          <option value="overdue">Overdue</option>
          <option value="this-week">This week</option>
          <option value="later">Later</option>
          <option value="none">None scheduled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card border border-ls-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ls-border bg-gray-50">
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Contact</th>
                <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px] hidden md:table-cell">Email / Phone</th>
                <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Business</th>
                <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Next follow-up</th>
                <th className="text-center px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ls-border">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-lg py-md">
                        <div className="h-4 bg-ls-surface rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.map((c) => {
                const next = tsToDate(c.followUpSchedule?.nextFollowUp);
                const bucket = followUpBucket(next);
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-lg py-md">
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-ls-primary hover:underline">
                        {c.contactPerson?.name || "—"}
                      </Link>
                      {c.contactPerson?.title && (
                        <p className="text-[11px] text-ls-secondary">{c.contactPerson.title}</p>
                      )}
                    </td>
                    <td className="px-md py-md hidden md:table-cell">
                      <div className="flex flex-col gap-[2px]">
                        {c.contactPerson?.email && (
                          <span className="text-ls-body flex items-center gap-xs">
                            <Mail size={11} className="text-ls-secondary" /> {c.contactPerson.email}
                          </span>
                        )}
                        {c.contactPerson?.phone && (
                          <span className="text-ls-secondary flex items-center gap-xs text-[12px]">
                            <Phone size={11} /> {c.contactPerson.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-md py-md">
                      {(() => {
                        const ids = c.businessIds || [];
                        const first = ids[0] ? businessMap.get(ids[0]) : null;
                        const extra = Math.max(0, ids.length - 1);
                        if (!first && ids.length === 0) {
                          return <span className="text-ls-secondary text-[12px]">—</span>;
                        }
                        if (!first) {
                          return <span className="text-ls-secondary text-[12px]">{ids.length} linked</span>;
                        }
                        return (
                          <div className="flex items-start gap-xs max-w-[260px]">
                            <Store size={12} className="text-ls-secondary mt-[3px] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-ls-body text-[13px] truncate">{first.name}</p>
                              {first.address && (
                                <p className="text-[11px] text-ls-secondary truncate">{first.address}</p>
                              )}
                              {extra > 0 && (
                                <p className="text-[11px] text-ls-secondary">+{extra} more</p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-md py-md">
                      {next ? (
                        <span className={`inline-flex items-center gap-xs text-[12px] ${
                          bucket === "overdue" ? "text-red-600 font-semibold" :
                          bucket === "this-week" ? "text-amber-600 font-semibold" :
                          "text-ls-body"
                        }`}>
                          {bucket === "overdue" ? <AlertCircle size={12} /> : <Calendar size={12} />}
                          {next.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          <span className="text-ls-secondary capitalize">· {c.followUpSchedule?.followUpType}</span>
                        </span>
                      ) : (
                        <span className="text-ls-secondary text-[12px]">—</span>
                      )}
                    </td>
                    <td className="px-md py-md text-center">
                      <span className={`inline-block text-[11px] font-semibold px-sm py-[2px] rounded-full capitalize ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <p className="text-center py-2xl text-ls-secondary text-[14px]">
              {customers.length === 0 ? "No customers yet. Create one to get started." : "No customers match these filters."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
