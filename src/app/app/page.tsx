import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get the Little Saigon Go app",
  description:
    "Download Little Saigon Go for iPhone. Find restaurants, cafés, events, and games — all in one place.",
};

const APP_STORE_URL = "https://apps.apple.com/app/id6759817166";

export default function AppLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-ls-surface flex flex-col items-center justify-center px-lg py-2xl">
      <div className="max-w-[420px] w-full text-center flex flex-col items-center">
        {/* Logo */}
        <Image
          src="/lso-logo.png"
          alt="Little Saigon Go"
          width={240}
          height={40}
          priority
          className="mb-xl"
        />

        {/* Greeting */}
        <h1 className="text-[28px] md:text-[32px] font-bold text-ls-primary leading-tight">
          Xin chào! 👋
        </h1>
        <p className="text-[15px] md:text-[16px] text-ls-secondary mt-sm">
          Welcome to Little Saigon Go — your guide to restaurants, cafés, events,
          and games in Little Saigon.
        </p>

        {/* Hero image */}
        <div className="relative w-full aspect-[4/3] mt-xl mb-xl rounded-card overflow-hidden bg-ls-surface">
          <Image
            src="/xin-chao-banner.png"
            alt="Little Saigon Go preview"
            fill
            sizes="(max-width: 768px) 90vw, 420px"
            className="object-cover"
            priority
          />
        </div>

        {/* Download CTAs */}
        <div className="w-full flex flex-col items-center gap-md">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download on the App Store"
            className="inline-block transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Image
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
              alt="Download on the App Store"
              width={200}
              height={66}
              unoptimized
            />
          </a>

          {/* Coming-soon Android badge — visually similar to Apple badge but
              disabled and labeled "coming soon" so the page reads as parallel. */}
          <div
            role="img"
            aria-label="Coming soon to Google Play"
            className="inline-flex items-center gap-sm bg-black/85 text-white rounded-[10px] px-md py-sm h-[66px] w-[200px] cursor-default select-none"
          >
            <svg viewBox="0 0 24 24" width={26} height={26} aria-hidden="true" fill="currentColor">
              <path d="M3.6 1.8a1 1 0 0 0-.5.9v18.6a1 1 0 0 0 .5.9l10.7-10.2L3.6 1.8zM15.4 12l3.3-3.1L5.6 1.6c-.1 0-.2-.1-.3-.1l10.1 10.5zM5.3 22.5c.1 0 .2 0 .3-.1l13.1-7.3-3.3-3.1L5.3 22.5zM20 8.5l-3 1.7 3 2.8 2-.8c.7-.3.7-1.3 0-1.6L20 8.5z"/>
            </svg>
            <div className="leading-tight text-left">
              <div className="text-[9px] uppercase tracking-wide opacity-80">Coming soon to</div>
              <div className="text-[18px] font-semibold -mt-[2px]">Google Play</div>
            </div>
          </div>
          <p className="text-[11px] text-ls-secondary mt-xs">
            Android coming soon. iOS available now.
          </p>
        </div>

        {/* Browse on web fallback */}
        <div className="mt-2xl pt-xl border-t border-ls-border w-full">
          <p className="text-[13px] text-ls-secondary mb-sm">
            Prefer to browse without installing?
          </p>
          <Link
            href="/"
            className="inline-block text-[14px] font-semibold text-ls-primary hover:underline"
          >
            Open littlesaigongo.com →
          </Link>
        </div>
      </div>
    </main>
  );
}
