import {
  LayoutDashboard, Store, Users, Star, BookOpen, Building2, FolderTree, Settings, Image, Ticket, Calendar, ScanLine, Bell, Tags, Coins, Flag, Camera, FileText, Activity, Trophy, ThumbsUp, Gamepad2, TrendingUp, Heart, UtensilsCrossed, Inbox, History, KeyRound, Search, MessageSquare, RotateCcw, Handshake,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  description?: string;
};
export type NavGroup = { group: string; items: NavItem[] };

export const HOME: NavItem = { href: "/admin", label: "Home", icon: LayoutDashboard, exact: true };

/// Stable kebab-case slug for nav group landing routes (`/admin/group/{slug}`).
export function navGroupSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const NAV: (NavItem | NavGroup)[] = [
  { group: "Analytics & Tracking", items: [
    { href: "/admin/analytics", label: "Analytics", icon: Activity, description: "Cross-site engagement, sessions, and key event metrics." },
    { href: "/admin/login-attempts", label: "Login Attempts", icon: KeyRound, description: "Sign-in audit trail with failure error codes." },
    { href: "/admin/search-queries", label: "Search Queries", icon: Search, description: "What users are searching for in the app." },
    { href: "/admin/popular", label: "Popular", icon: TrendingUp, description: "Trending businesses, dishes, and pages." },
    { href: "/admin/game-stats", label: "Game Stats", icon: Gamepad2, description: "Tiến Lên and Blackjack engagement stats." },
    { href: "/admin/tienlen-redeals", label: "TL Redeals", icon: RotateCcw, description: "Manual redeal events when auto-rematch stalls." },
    { href: "/admin/votes", label: "Votes", icon: ThumbsUp, description: "Community votes and rankings." },
    { href: "/admin/search-terms", label: "Search Terms", icon: Tags, description: "Curated search-term mappings for discoverability." },
    { href: "/admin/reports", label: "Reports", icon: Flag, description: "User-submitted content reports for moderation." },
  ]},
  { group: "Content", items: [
    { href: "/admin/businesses", label: "Businesses", icon: Store, description: "Directory of local Vietnamese businesses." },
    { href: "/admin/categories", label: "Categories", icon: FolderTree, description: "Top-level + subcategory taxonomy for listings." },
    { href: "/admin/guide", label: "Food Guide", icon: BookOpen, description: "Top 50 Món Việt — featured dishes and curation." },
    { href: "/admin/blog", label: "Blog", icon: FileText, description: "Editorial posts published to the public site." },
    { href: "/admin/recipes", label: "Recipes", icon: UtensilsCrossed, description: "Recipe collection." },
    { href: "/admin/photo-audit", label: "Photo Manager", icon: Camera, description: "Audit & upload listing photos." },
    { href: "/admin/photo-replacement-queue", label: "Replacement Queue", icon: Camera, description: "Scraped photos pending review/replacement." },
    { href: "/admin/photo-feed", label: "Photo Feed", icon: Heart, description: "Public LS Feed — user-uploaded photos." },
  ]},
  { group: "Promotions & Events", items: [
    { href: "/admin/promotions", label: "Promotions", icon: Ticket, description: "Discount offers + business promotions." },
    { href: "/admin/rewards", label: "Rewards", icon: Coins, description: "Đồng points rules and redemptions." },
    { href: "/admin/challenges", label: "Challenges", icon: Trophy, description: "Time-limited engagement challenges." },
    { href: "/admin/events", label: "Events", icon: Calendar, description: "Community events listing." },
    { href: "/admin/tickets", label: "Tickets", icon: ScanLine, description: "Event ticket scanning + redemption." },
    { href: "/admin/banners", label: "Promo Banners", icon: Image, description: "Home page banner rotation." },
  ]},
  { group: "Users & Comms", items: [
    { href: "/admin/users", label: "Users", icon: Users, description: "User accounts, roles, and profile inspection." },
    { href: "/admin/reviews", label: "Reviews", icon: Star, description: "Business reviews moderation." },
    { href: "/admin/notifications", label: "Notifications", icon: Bell, description: "Send broadcast push notifications." },
    { href: "/admin/claims", label: "Claims", icon: Building2, description: "Business ownership claim requests." },
    { href: "/admin/inbox", label: "Inbox", icon: Inbox, description: "User feedback + business suggestions." },
    { href: "/admin/community/reports", label: "Forum Reports", icon: MessageSquare, description: "Community post & comment reports." },
  ]},
  { group: "CMS", items: [
    { href: "/admin/customers", label: "Customers", icon: Handshake, description: "Sales pipeline + CRM profiles for business contacts." },
    { href: "/admin/customers/from-claims", label: "From Claims", icon: Building2, description: "Business owners who submitted claims — convert them into customers." },
  ]},
  { group: "Settings", items: [
    { href: "/admin/settings", label: "Page Settings", icon: Settings, description: "Per-page config + feature flags." },
  ]},
  { group: "About", items: [
    { href: "/admin/build-history", label: "Build History", icon: History, description: "Site deploy log and version history." },
  ]},
];

/// v2 key — the v1 key stored "collapsed" groups but the logic was flipped
/// to track expanded groups. A new key avoids inheriting the inverted state.
export const EXPANDED_GROUPS_KEY = "admin.nav.expandedGroups.v2";
