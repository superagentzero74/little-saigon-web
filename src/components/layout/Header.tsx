"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Compass, BookOpen, Gift, User, LogOut, Menu, X, LayoutDashboard, Building2 } from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import type { BusinessCategory } from "@/lib/types";

export default function Header() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const suggestedSearches = [
    "Phở", "Bánh Mì", "Bún Bò Huế", "Cơm Tấm", "Boba",
    "Coffee", "Chè", "Bánh Cuốn", "Bún Chả", "Gỏi Cuốn",
    "Bakery", "Nails", "Vegan", "Late Night", "Dessert",
  ];

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
    <>
    {/* Fixed header on its own stacking layer */}
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-ls-border" style={{ zIndex: 9999, isolation: "isolate" }}>
      <div className="ls-container flex items-center gap-md h-[56px]">
        {/* Logo — force hard navigation to home */}
        <button
          type="button"
          onClick={() => { window.location.href = "/"; }}
          className="shrink-0 block cursor-pointer bg-transparent border-0 p-0"
        >
          <Image
            src="/lso-logo.png"
            alt="Little Saigon Official"
            width={160}
            height={40}
            className="h-[40px] w-auto pointer-events-none"
          />
        </button>

        {/* Search bar — desktop */}
        <div className="hidden md:block relative flex-1 max-w-[420px]">
          <form
            onSubmit={handleSearch}
            className="flex items-center border border-ls-border rounded-full overflow-hidden bg-gray-100 focus-within:bg-white focus-within:border-ls-primary transition-colors"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Search restaurants, foods…"
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
          {searchFocused && !searchQuery && (
            <div className="absolute top-[44px] left-0 right-0 bg-white border border-ls-border rounded-card shadow-lg p-sm z-50">
              <p className="text-[11px] text-ls-secondary uppercase tracking-wider px-sm pb-xs">Suggested</p>
              <div className="flex flex-wrap gap-xs">
                {suggestedSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchQuery(term);
                      setSearchFocused(false);
                      router.push(`/explore?q=${encodeURIComponent(term)}`);
                    }}
                    className="px-md py-xs text-[13px] text-ls-primary bg-ls-surface hover:bg-ls-primary hover:text-white rounded-full transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-xl ml-auto">
          <Link href="/explore" className="flex items-center gap-xs text-meta text-ls-secondary hover:text-ls-primary transition-colors">
            <Compass size={16} /> Explore
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

          {/* Hamburger menu */}
          <div className="relative">
            <button
              onClick={() => setShowHamburger(!showHamburger)}
              className="p-sm text-ls-secondary hover:text-ls-primary transition-colors"
              aria-label="More"
            >
              <Menu size={20} />
            </button>
            {showHamburger && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHamburger(false)} />
                <div className="absolute right-0 top-[44px] z-50 bg-white border border-ls-border rounded-card w-[200px] py-sm shadow-lg">
                  <Link
                    href="/guide"
                    onClick={() => setShowHamburger(false)}
                    className="flex items-center gap-sm px-lg py-sm text-[14px] text-ls-primary hover:bg-ls-surface transition-colors"
                  >
                    <BookOpen size={16} /> Food Guide
                  </Link>
                  <Link
                    href="/rewards"
                    onClick={() => setShowHamburger(false)}
                    className="flex items-center gap-sm px-lg py-sm text-[14px] text-ls-primary hover:bg-ls-surface transition-colors"
                  >
                    <Gift size={16} /> Rewards
                  </Link>
                </div>
              </>
            )}
          </div>
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
      <div className="md:hidden border-t border-ls-border bg-white px-4 py-2 relative">
        <form onSubmit={handleSearch} className="flex items-center border border-ls-border rounded-full overflow-hidden bg-gray-100 focus-within:bg-white focus-within:border-ls-primary transition-colors">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search restaurants, foods…"
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
        {searchFocused && !searchQuery && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-ls-border shadow-lg p-sm z-50">
            <p className="text-[11px] text-ls-secondary uppercase tracking-wider px-sm pb-xs">Suggested</p>
            <div className="flex flex-wrap gap-xs">
              {suggestedSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchQuery(term);
                    setSearchFocused(false);
                    router.push(`/explore?q=${encodeURIComponent(term)}`);
                    setShowMobileNav(false);
                  }}
                  className="px-md py-xs text-[13px] text-ls-primary bg-ls-surface hover:bg-ls-primary hover:text-white rounded-full transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Nav Drawer */}
      {showMobileNav && (
        <div className="md:hidden border-t border-ls-border bg-white pb-lg">
          <nav className="ls-container flex flex-col gap-sm pt-md">
            <Link href="/guide" onClick={() => setShowMobileNav(false)} className="flex items-center gap-sm py-sm text-[15px] text-ls-primary">
              <BookOpen size={18} /> Food Guide
            </Link>
            <Link href="/explore" onClick={() => setShowMobileNav(false)} className="flex items-center gap-sm py-sm text-[15px] text-ls-primary">
              <Compass size={18} /> Explore
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

    {/* Category Nav Bar — desktop only */}
    {/* Category Nav Bar — desktop only */}
    <div
      className="hidden md:block fixed left-0 right-0 bg-white border-b border-ls-border"
      style={{ top: 56, zIndex: 9998 }}
    >
      <div className="ls-container">
        <nav className="flex items-center gap-0" style={{ scrollbarWidth: "none" }}>
          {(Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][]).map(([key, { label }]) => (
            <Link
              key={key}
              href={`/category/${key}`}
              className="px-md py-[10px] text-[13px] font-medium whitespace-nowrap transition-colors border-b-2 text-ls-secondary border-transparent hover:text-ls-primary hover:border-ls-primary"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>

    {/* Spacer to push content below the fixed header + category bar */}
    <div className="h-[56px] md:h-[96px]" />
    <div className="h-[52px] md:hidden" />
    </>
  );
}
