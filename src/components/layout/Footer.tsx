import Link from "next/link";
import InstagramFeed from "./InstagramFeed";

export default function Footer() {
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
            Check in, earn Đồng, leave reviews, and discover curated picks.
            Download the Little Saigon app.
          </p>
          <div className="flex items-center justify-center gap-md mt-lg">
            {/* Placeholder for App Store button */}
            <span className="inline-block bg-white text-ls-primary rounded-btn px-6 py-3 text-[14px] font-semibold">
              Download on the App Store
            </span>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="ls-container py-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-lg text-meta text-ls-secondary">
          <div className="flex items-center gap-sm">
            <span className="font-bold text-ls-primary">Little Saigon</span>
            <span>·</span>
            <span>Vietnamese Community Guide</span>
          </div>
          <div className="flex items-center gap-xl">
            <Link href="/explore" className="hover:text-ls-primary transition-colors">
              Explore
            </Link>
            <Link href="/guide" className="hover:text-ls-primary transition-colors">
              Top 50 Món Việt
            </Link>
            <Link href="/category/restaurant" className="hover:text-ls-primary transition-colors">
              Categories
            </Link>
          </div>
        </div>
        <p className="text-center text-tag text-ls-secondary mt-lg">
          © {new Date().getFullYear()} Little Saigon. Built for the Vietnamese diaspora in Southern California.
        </p>
      </div>
    </footer>
  );
}
