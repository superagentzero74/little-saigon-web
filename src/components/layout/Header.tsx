"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Compass, BookOpen, Gift, User, LogOut, Menu, X, LayoutDashboard, Building2 } from "lucide-react";

export default function Header() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/explore?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/explore");
    }
    setShowMobileNav(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-ls-border">
      <div className="ls-container flex items-center gap-md h-[56px]">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/lso-logo.png"
            alt="Little Saigon Official"
            width={160}
            height={40}
            className="h-[40px] w-auto"
          />
        </Link>

        {/* Search bar — desktop */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex items-center flex-1 max-w-[420px] border border-ls-border rounded-full overflow-hidden bg-gray-100 focus-within:bg-white focus-within:border-ls-primary transition-colors"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search restaurants, dishes…"
            className="flex-1 min-w-0 px-lg py-[7px] text-[14px] text-ls-primary placeholder:text-ls-secondary outline-none bg-transparent"
          />
          <button
            type="submit"
            className="shrink-0 h-[36px] w-[42px] flex items-center justify-center bg-ls-primary hover:bg-ls-primary/90 transition-colors"
            aria-label="Search"
          >
            <Search size={17} className="text-white" />
          </button>
        </form>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-xl ml-auto">
          <Link href="/explore" className="flex items-center gap-xs text-meta text-ls-secondary hover:text-ls-primary transition-colors">
            <Compass size={16} /> Explore
          </Link>
          <Link href="/guide" className="flex items-center gap-xs text-meta text-ls-secondary hover:text-ls-primary transition-colors">
            <BookOpen size={16} /> Top 50 Món Việt
          </Link>
          <Link href="/rewards" className="flex items-center gap-xs text-meta text-ls-secondary hover:text-ls-primary transition-colors">
            <Gift size={16} /> Rewards
          </Link>

          {loading ? (
            <div className="w-[32px] h-[32px] rounded-full bg-ls-surface animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-sm"
              >
                <div className="w-[32px] h-[32px] rounded-full bg-ls-primary flex items-center justify-center">
                  <span className="text-[13px] font-semibold text-white">
                    {user.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-[13px] font-semibold text-ls-primary leading-tight">
                    {user.displayName}
                  </p>
                  <p className="text-[11px] text-ls-secondary leading-tight">
                    {user.points} Đồng
                  </p>
                </div>
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-[44px] z-50 bg-white border border-ls-border rounded-card w-[200px] py-sm">
                    <Link
                      href="/profile"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-sm px-lg py-sm text-[14px] text-ls-primary hover:bg-ls-surface transition-colors"
                    >
                      <User size={16} /> Profile
                    </Link>
                    {user?.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-sm px-lg py-sm text-[14px] text-ls-primary hover:bg-ls-surface transition-colors"
                      >
                        <LayoutDashboard size={16} /> Admin Panel
                      </Link>
                    )}
                    {user?.role === "business_owner" && user.ownedBusinessIds && user.ownedBusinessIds.length > 0 && (
                      <Link
                        href={`/my-business/${user.ownedBusinessIds[0]}/edit`}
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-sm px-lg py-sm text-[14px] text-ls-primary hover:bg-ls-surface transition-colors"
                      >
                        <Building2 size={16} /> My Business
                      </Link>
                    )}
                    <Link
                      href="/rewards"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-sm px-lg py-sm text-[14px] text-ls-primary hover:bg-ls-surface transition-colors"
                    >
                      <Gift size={16} /> Rewards
                    </Link>
                    <hr className="my-xs border-ls-border" />
                    <button
                      onClick={() => { logout(); setShowMenu(false); }}
                      className="flex items-center gap-sm px-lg py-sm text-[14px] text-ls-secondary hover:text-ls-primary hover:bg-ls-surface transition-colors w-full"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className="ls-btn text-[13px] py-sm px-lg">
              Sign In
            </Link>
          )}
        </nav>

        {/* Mobile: hamburger */}
        <button
          className="md:hidden p-sm ml-auto"
          onClick={() => setShowMobileNav(!showMobileNav)}
          aria-label="Menu"
        >
          {showMobileNav ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile search bar — always visible below the header row */}
      <div className="md:hidden border-t border-ls-border bg-white px-4 py-2">
        <form onSubmit={handleSearch} className="flex items-center border border-ls-border rounded-full overflow-hidden bg-gray-100 focus-within:bg-white focus-within:border-ls-primary transition-colors">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search restaurants, dishes…"
            className="flex-1 min-w-0 px-lg py-[7px] text-[14px] text-ls-primary placeholder:text-ls-secondary outline-none bg-transparent"
          />
          <button
            type="submit"
            className="shrink-0 h-[36px] w-[42px] flex items-center justify-center bg-ls-primary hover:bg-ls-primary/90 transition-colors"
            aria-label="Search"
          >
            <Search size={17} className="text-white" />
          </button>
        </form>
      </div>

      {/* Mobile Nav Drawer */}
      {showMobileNav && (
        <div className="md:hidden border-t border-ls-border bg-white pb-lg">
          <nav className="ls-container flex flex-col gap-sm pt-md">
            <Link href="/explore" onClick={() => setShowMobileNav(false)} className="flex items-center gap-sm py-sm text-[15px] text-ls-primary">
              <Compass size={18} /> Explore
            </Link>
            <Link href="/guide" onClick={() => setShowMobileNav(false)} className="flex items-center gap-sm py-sm text-[15px] text-ls-primary">
              <BookOpen size={18} /> Top 50 Món Việt
            </Link>
            <Link href="/rewards" onClick={() => setShowMobileNav(false)} className="flex items-center gap-sm py-sm text-[15px] text-ls-primary">
              <Gift size={18} /> Rewards
            </Link>
            <hr className="border-ls-border" />
            {user ? (
              <>
                <Link href="/profile" onClick={() => setShowMobileNav(false)} className="flex items-center gap-sm py-sm text-[15px] text-ls-primary">
                  <User size={18} /> Profile · {user.points} Đồng
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin" onClick={() => setShowMobileNav(false)} className="flex items-center gap-sm py-sm text-[15px] text-ls-primary">
                    <LayoutDashboard size={18} /> Admin Panel
                  </Link>
                )}
                {user?.role === "business_owner" && user.ownedBusinessIds && user.ownedBusinessIds.length > 0 && (
                  <Link
                    href={`/my-business/${user.ownedBusinessIds[0]}/edit`}
                    onClick={() => setShowMobileNav(false)}
                    className="flex items-center gap-sm py-sm text-[15px] text-ls-primary"
                  >
                    <Building2 size={18} /> My Business
                  </Link>
                )}
                <button
                  onClick={() => { logout(); setShowMobileNav(false); }}
                  className="flex items-center gap-sm py-sm text-[15px] text-ls-secondary"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setShowMobileNav(false)} className="ls-btn text-center mt-sm">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
