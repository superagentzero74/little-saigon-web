"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Milestone = {
  date: string;          // ISO date
  title: string;
  summary: string;
  details: string[];
  platforms?: ("iOS" | "Web" | "Backend" | "Spec")[];
};

const MILESTONES: Milestone[] = [
  {
    date: "2026-05-06",
    title: "Web UI mirror of iOS banner overhaul + Tiến Lên multiplayer landscape rework",
    summary:
      "Brought the new banner art set to web and rebuilt multiplayer Tiến Lên layout for landscape so the player hand stays visible.",
    platforms: ["Web", "iOS"],
    details: [
      "Web home overlay swapped from xin-chao-white.png to di-an-choi.svg (whitened via CSS filter).",
      "Web /explore now uses explore.svg; /games adds the Play! banner at top.",
      "Web /guide/[slug] gained a top-right share icon on the hero (Web Share API + clipboard fallback).",
      "iOS multiplayer Tiến Lên: side opponents anchored to top of a fixed-height row; Pass/Play action area locked at 100pt portrait / 60pt landscape.",
      "Landscape: scoreboard pill hidden; top opponent rendered compact; player hand centered when cards fit, scrolls when they exceed.",
      "Removed the portrait Tiến Lên watermark and the dealing-overlay logo so layout fits in landscape.",
    ],
  },
  {
    date: "2026-05-05",
    title: "iOS banner overhaul + Games hub redesign + Blackjack splash polish",
    summary:
      "Replaced legacy banners with a brush-script SVG set, added share buttons to game cards, and tightened the Blackjack splash.",
    platforms: ["iOS"],
    details: [
      "New banner asset set in Assets.xcassets: di_an_choi.svg (Home), explore.svg (Explore), my_page.svg (My Page), play.png (Games). All sized at 80% screen width, centered.",
      "Tiến Lên & Blackjack cards on the Games hub each got a top-right share button; share sheet now includes the game's icon image.",
      "Removed the inline 'Share with Friends' row from the Tiến Lên card.",
      "Tiến Lên start screen and lobby tagline: 'Southern Vietnamese Card Game' → 'Classic Vietnamese Card Game'.",
      "Blackjack splash: black hard background, felt at 50% opacity, dragon icon reduced 15%.",
      "Card deal + chip betting sounds wired up via AudioToolbox (sounds 1104 / 1306).",
      "Promo-banner row on Home tightened to 3pt outer + 3pt inter-banner gaps (was 16pt + 10pt).",
      "Multiplayer table watermark switched from tienlen_logo to tienlen_text for visual consistency with single player.",
    ],
  },
  {
    date: "2026-05-05",
    title: "Food guide page: admin-gated photo edit + share icon",
    summary:
      "Tightened the admin-only image controls and added a public share affordance.",
    platforms: ["iOS", "Web"],
    details: [
      "iOS MonVietDetailView: camera/edit button now visible only when authViewModel.currentUser?.role == 'admin'.",
      "iOS: replaced the full-width 'Share this dish' button with a compact top-right share icon on the hero.",
      "Web /guide/[slug]: added a matching top-right share button using navigator.share with clipboard fallback.",
      "Web admin Edit pill on the food page already had the role gate; left in place.",
    ],
  },
  {
    date: "2026-05-05",
    title: "iOS Profile / Rewards: duplicate header fix",
    summary:
      "Embedded RewardsView under the My Page tab no longer renders its own logo + hamburger.",
    platforms: ["iOS"],
    details: [
      "Added embedded: Bool param to RewardsView; LogoHeader is suppressed when embedded.",
      "ProfileView passes embedded: true when rendering RewardsView under the Rewards segment.",
    ],
  },
  {
    date: "2026-05-05",
    title: "iOS v1.27 build 1 to TestFlight",
    summary:
      "TestFlight build with the casino-style settlement engine and the early banner experiments.",
    platforms: ["iOS"],
    details: [
      "Marketing version snapshot at the time. Project has since advanced to MARKETING_VERSION 1.31.",
      "Subsequent builds (1.28 – 1.31) folded in the banner refresh and multiplayer layout work.",
    ],
  },
  {
    date: "2026-04",
    title: "gamekit-spec/ — single source of truth for Tiến Lên + Blackjack",
    summary:
      "Locked down rules, settlement, replenish, and compliance for both apps to share.",
    platforms: ["Spec"],
    details: [
      "Documents: README, firestore-schema, tienlen-rules, tienlen-settlement, blackjack-rules, xu-economy, compliance.",
      "Casino-style Tiến Lên settlement: perCard, sweep (tới trắng), heo (2♠ held), heoSmall, tuQuyHeld, sanhRongHeld, chap (mid-round bombs), bet (4th place ≤2 cards = doubled loss).",
      "Presets: Casual / Standard / Strict — locked at lobby per-table on gameRooms/{id}.houseRules.",
      "Xu economy: starting balance 10,000 (10× migration for existing users), 500 entry per Tiến Lên round, +5,000 from 5-question replenish (24h cooldown), at least 1 question/set in category: 'compliance'.",
      "Loss capping prevents negative balances; immutable ledger at gameRooms/{roomId}/rounds/{roundId}/ledger/{entryId}.",
    ],
  },
  {
    date: "2026-04",
    title: "Saigon Gameroom — fork plan",
    summary:
      "Standalone game app (iOS + Android) sharing Firebase / Xu / multiplayer with Little Saigon.",
    platforms: ["Spec"],
    details: [
      "Same Firebase project (little-saigon-c055a); single shared Xu wallet across both apps.",
      "Bundle ID planned: com.productsgo.saigongameroom. iOS first, Android later.",
      "Phase 1 (spec) ✅. Phase 2 (extract gamekit-swift Swift Package) on deck before forking the SG iOS shell.",
      "Hardening before launch: Firestore rules on gameRooms, Cloud Functions for awardSettlement / applyBlackjackOutcome / claimReplenish / migrateXuV2.",
    ],
  },
];

function platformBadge(p: NonNullable<Milestone["platforms"]>[number]) {
  const styles: Record<string, string> = {
    iOS: "bg-blue-100 text-blue-800",
    Web: "bg-emerald-100 text-emerald-800",
    Backend: "bg-purple-100 text-purple-800",
    Spec: "bg-amber-100 text-amber-800",
  };
  return styles[p] ?? "bg-gray-100 text-gray-700";
}

export default function BuildHistoryPage() {
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set([0]));
  const [allOpen, setAllOpen] = useState(false);

  const toggle = (idx: number) => {
    const next = new Set(openIdx);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setOpenIdx(next);
  };

  const toggleAll = () => {
    if (allOpen) {
      setOpenIdx(new Set());
      setAllOpen(false);
    } else {
      setOpenIdx(new Set(MILESTONES.map((_, i) => i)));
      setAllOpen(true);
    }
  };

  return (
    <div className="px-2xl py-2xl max-w-[920px]">
      <div className="flex items-start justify-between mb-xl gap-md">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary mb-xs">App Build History</h1>
          <p className="text-[13px] text-ls-secondary">
            Timeline of significant milestones. Add new entries to <code className="text-[12px] bg-gray-100 px-xs rounded">MILESTONES</code> in <code className="text-[12px] bg-gray-100 px-xs rounded">app/admin/build-history/page.tsx</code>.
          </p>
        </div>
        <button
          onClick={toggleAll}
          className="shrink-0 text-[12px] font-semibold text-ls-primary border border-ls-border rounded-btn px-md py-xs hover:bg-ls-surface transition-colors"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <ol className="relative border-l-2 border-ls-border ml-[6px]">
        {MILESTONES.map((m, idx) => {
          const open = openIdx.has(idx);
          return (
            <li key={`${m.date}-${idx}`} className="mb-lg ml-lg">
              <span className="absolute -left-[7px] mt-[6px] w-[12px] h-[12px] rounded-full bg-ls-primary border-2 border-white" />
              <button
                onClick={() => toggle(idx)}
                className="w-full text-left bg-white border border-ls-border rounded-card p-md hover:border-ls-primary/50 transition-colors"
              >
                <div className="flex items-start gap-sm">
                  <span className="mt-[2px] text-ls-secondary">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-sm mb-xs">
                      <time className="text-[11px] font-mono font-semibold text-ls-secondary uppercase tracking-wider">
                        {m.date}
                      </time>
                      {m.platforms?.map((p) => (
                        <span key={p} className={`text-[10px] font-semibold px-xs py-[1px] rounded ${platformBadge(p)}`}>
                          {p}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-[15px] font-semibold text-ls-primary leading-snug">
                      {m.title}
                    </h2>
                    <p className="text-[13px] text-ls-secondary mt-xs leading-relaxed">
                      {m.summary}
                    </p>
                    {open && (
                      <ul className="mt-md space-y-xs list-disc pl-md text-[13px] text-ls-secondary leading-relaxed">
                        {m.details.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-2xl text-[12px] text-ls-secondary/70">
        {MILESTONES.length} milestones logged.
      </p>
    </div>
  );
}
