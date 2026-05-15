"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { NAV, navGroupSlug, type NavGroup } from "../../_nav";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminGroupLandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const group = useMemo<NavGroup | null>(() => {
    for (const entry of NAV) {
      if ("group" in entry && navGroupSlug(entry.group) === slug) return entry;
    }
    return null;
  }, [slug]);

  if (loading) return <div className="p-2xl text-ls-secondary">Loading…</div>;
  if (!user || user.role !== "admin") {
    router.replace("/");
    return null;
  }

  if (!group) {
    return (
      <div className="p-2xl">
        <div className="flex items-center gap-sm mb-xs">
          <Link href="/admin" className="text-meta text-ls-secondary hover:text-ls-primary">Admin</Link>
          <ChevronRight size={12} className="text-ls-secondary" />
          <span className="text-meta text-ls-body">Unknown group</span>
        </div>
        <h1 className="text-page-title text-ls-primary mt-md">Group not found</h1>
        <p className="text-body text-ls-secondary mt-xs">
          No nav group matches the slug “{slug}”.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-xs text-[13px] text-ls-primary hover:underline mt-lg"
        >
          <ArrowLeft size={14} /> Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="p-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-sm mb-xs">
        <Link href="/admin" className="text-meta text-ls-secondary hover:text-ls-primary">Admin</Link>
        <ChevronRight size={12} className="text-ls-secondary" />
        <span className="text-meta text-ls-body">{group.group}</span>
      </div>
      <h1 className="text-page-title text-ls-primary mt-xs">{group.group}</h1>
      <p className="text-body text-ls-secondary mt-xs">
        {group.items.length} section{group.items.length === 1 ? "" : "s"} in this group.
      </p>

      {/* Sub-category pills — quick header navigation */}
      <div className="flex flex-wrap gap-sm mt-lg mb-2xl">
        {group.items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-xs text-[12px] font-semibold bg-ls-surface text-ls-primary px-md py-[6px] rounded-badge hover:bg-ls-primary hover:text-white transition-colors"
          >
            <Icon size={13} />
            {label}
          </Link>
        ))}
      </div>

      {/* Full card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
        {group.items.map(({ href, label, icon: Icon, description }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white border border-ls-border rounded-card p-lg hover:border-ls-primary hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-md">
              <div className="w-[40px] h-[40px] rounded-card bg-ls-primary/10 flex items-center justify-center shrink-0 group-hover:bg-ls-primary group-hover:text-white transition-colors">
                <Icon size={20} className="text-ls-primary group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-ls-primary truncate">{label}</h2>
                {description && (
                  <p className="text-[12px] text-ls-secondary mt-[2px] line-clamp-2">{description}</p>
                )}
              </div>
              <ChevronRight size={16} className="text-ls-secondary group-hover:text-ls-primary transition-colors shrink-0 mt-xs" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
