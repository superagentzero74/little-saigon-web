"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const InstagramFeed = dynamic(() => import("./InstagramFeed"), { ssr: false });

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on admin pages — admin has its own layout
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-ls-border mt-3xl">
      {/* Instagram Feed */}
      <InstagramFeed />

      {/* App CTA */}
      <div className="bg-ls-primary text-white py-3xl">
        <div className="ls-container text-center">
          <h2 className="text-[22px] font-bold">
            Xin Chào! Get the Full Experience
          </h2>
          <p className="text-[15px] text-white/70 mt-sm max-w-md mx-auto">
            Check in, earn points, leave reviews, and discover curated picks.
            Download the Little Saigon app.
          </p>
          <div className="flex items-center justify-center gap-md mt-lg">
            <a
              href="https://apps.apple.com/us/app/little-saigon-go/id6759817166"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="Download on the App Store"
                className="h-[50px]"
              />
            </a>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="ls-container py-2xl">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-2xl text-meta text-ls-secondary">
          <div>
            <span className="font-bold text-ls-primary">Little Saigon</span>
            <p className="mt-xs">Vietnamese Community Guide</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2xl">
            <div className="flex flex-col gap-sm">
              <span className="font-semibold text-ls-primary text-tag uppercase tracking-wide">Explore</span>
              <Link href="/explore" className="hover:text-ls-primary transition-colors">
                All Businesses
              </Link>
              <Link href="/guide" className="hover:text-ls-primary transition-colors">
                Top 50 Món Việt
              </Link>
              <Link href="/category/restaurant" className="hover:text-ls-primary transition-colors">
                Categories
              </Link>
            </div>
            <div className="flex flex-col gap-sm">
              <span className="font-semibold text-ls-primary text-tag uppercase tracking-wide">Company</span>
              <Link href="/about" className="hover:text-ls-primary transition-colors">
                About
              </Link>
              <Link href="/support" className="hover:text-ls-primary transition-colors">
                Support
              </Link>
              <Link href="/support?claim=new&name=" className="hover:text-ls-primary transition-colors">
                List or Claim My Business
              </Link>
              <Link href="/suggest-business" className="hover:text-ls-primary transition-colors">
                Suggest a Business
              </Link>
            </div>
            <div className="flex flex-col gap-sm">
              <span className="font-semibold text-ls-primary text-tag uppercase tracking-wide">Legal</span>
              <Link href="/privacy" className="hover:text-ls-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-ls-primary transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
        <p className="text-center text-tag text-ls-secondary mt-2xl pt-lg border-t border-ls-border">
          © {new Date().getFullYear()} Little Saigon. Built for the Vietnamese diaspora in Southern California.
        </p>
      </div>
    </footer>
  );
}
