import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Games",
  description: "Play Vietnamese card games on Little Saigon Go — Tiến Lên and Blackjack. Play for fun, earn Xu coins.",
};

export default function GamesPage() {
  return (
    <div className="ls-container py-2xl px-lg">
      {/* Top banner */}
      <div className="flex justify-center mb-xl">
        <Image
          src="/images/play-banner.png"
          alt="Play!"
          width={1200}
          height={300}
          priority
          className="w-[80%] h-auto"
        />
      </div>

      {/* Header */}
      <div className="text-center mb-2xl">
        <h1 className="text-[28px] font-bold text-ls-primary">Games</h1>
        <p className="text-[15px] text-ls-secondary mt-sm">
          Vietnamese card games — play for fun, earn Xu coins
        </p>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl max-w-[800px] mx-auto">

        {/* Tiến Lên */}
        <div className="bg-gradient-to-br from-[#0d5a26] to-[#0a3d1a] rounded-[20px] overflow-hidden shadow-lg">
          <div className="p-xl">
            <div className="flex items-center gap-lg mb-lg">
              <Image
                src="/images/tienlen-icon.png"
                alt="Tiến Lên"
                width={80}
                height={80}
                className="rounded-2xl"
              />
              <div>
                <h2 className="text-[22px] font-bold text-white">Tiến Lên</h2>
                <p className="text-[13px] text-white/60">Classic Vietnamese Card Game</p>
              </div>
            </div>
            <p className="text-[14px] text-white/80 leading-relaxed mb-lg">
              The classic Vietnamese card game. Play against AI opponents in single player,
              or create a room and invite friends for multiplayer action. AI fills empty seats
              so you can always play.
            </p>
            <div className="flex flex-wrap gap-sm mb-lg">
              <span className="px-md py-xs text-[11px] font-semibold text-white/90 bg-white/15 rounded-full">Single Player</span>
              <span className="px-md py-xs text-[11px] font-semibold text-yellow-300 bg-white/15 rounded-full">Multiplayer</span>
              <span className="px-md py-xs text-[11px] font-semibold text-white/70 bg-white/10 rounded-full">4 Players</span>
              <span className="px-md py-xs text-[11px] font-semibold text-white/70 bg-white/10 rounded-full">Earn Xu</span>
            </div>
            <ul className="text-[13px] text-white/70 space-y-sm mb-lg">
              <li>Play the 3 of Spades to start</li>
              <li>Beat the current play or pass</li>
              <li>First to empty your hand wins</li>
              <li>1st Place earns 125 Xu</li>
            </ul>
            <Link
              href="/games/tien-len"
              className="inline-block bg-yellow-400 text-black font-bold text-[14px] px-xl py-sm rounded-full hover:bg-yellow-300 transition-colors"
            >
              Play Now
            </Link>
          </div>
        </div>

        {/* Blackjack */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-[20px] overflow-hidden shadow-lg">
          <div className="p-xl">
            <div className="flex items-center gap-lg mb-lg">
              <Image
                src="/images/blackjack-icon.png"
                alt="Blackjack"
                width={80}
                height={80}
                className="rounded-2xl"
              />
              <div>
                <h2 className="text-[22px] font-bold text-white">Blackjack</h2>
                <p className="text-[13px] text-white/60">Xì Dách — Classic 21</p>
              </div>
            </div>
            <p className="text-[14px] text-white/80 leading-relaxed mb-lg">
              Beat dealer Linh to 21. Hit, stand, double down, or split pairs.
              Featuring a live dealer with reactions, card counting tips, and
              realistic casino gameplay.
            </p>
            <div className="flex flex-wrap gap-sm mb-lg">
              <span className="px-md py-xs text-[11px] font-semibold text-white/90 bg-white/15 rounded-full">Single Player</span>
              <span className="px-md py-xs text-[11px] font-semibold text-white/70 bg-white/10 rounded-full">Live Dealer</span>
              <span className="px-md py-xs text-[11px] font-semibold text-white/70 bg-white/10 rounded-full">Split & Double</span>
              <span className="px-md py-xs text-[11px] font-semibold text-white/70 bg-white/10 rounded-full">Earn Xu</span>
            </div>
            <ul className="text-[13px] text-white/70 space-y-sm mb-lg">
              <li>Get as close to 21 without going over</li>
              <li>Blackjack pays 3:2</li>
              <li>Tip the dealer for bonus reactions</li>
              <li>Card counting hints included</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Xu Economy */}
      <div className="max-w-[600px] mx-auto mt-2xl text-center">
        <h3 className="text-[18px] font-bold text-ls-primary mb-sm">About Xu Coins</h3>
        <p className="text-[13px] text-ls-secondary leading-relaxed">
          Xu are virtual coins used exclusively for in-app game play. They hold no monetary value,
          cannot be exchanged for real currency, goods, or services, and are not redeemable for any
          rewards, prizes, or benefits. All games are intended for entertainment purposes only.
        </p>
      </div>

      {/* Download CTA */}
      <div className="max-w-[500px] mx-auto mt-2xl text-center">
        <p className="text-[15px] font-semibold text-ls-primary mb-md">Available on the iOS app</p>
        <a
          href="https://apps.apple.com/app/id6759817166"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          <Image
            src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
            alt="Download on the App Store"
            width={160}
            height={54}
          />
        </a>
      </div>
    </div>
  );
}
