// ============================================
// Little Saigon Web — Type Definitions
// Matches Firestore schema from BLUEPRINT.md
// ============================================

// Legacy single-value category (kept for backward compat during migration)
export type LegacyBusinessCategory =
  | "restaurant"
  | "bakery"
  | "cafe"
  | "grocery"
  | "beauty"
  | "shopping"
  | "business";

// New 10 top-level categories
export type BusinessCategory =
  | "restaurant"
  | "coffee_tea"
  | "bakery_dessert"
  | "grocery"
  | "beauty"
  | "shopping"
  | "services"
  | "health"
  | "entertainment"
  | "community";

export type SubcategorySlug = string; // validated against subcategories collection

export interface CategoryInfo {
  slug: BusinessCategory;
  name: string;
  nameViet: string;
  icon: string;
  order: number;
  isActive: boolean;
}

export interface SubcategoryInfo {
  slug: string;
  name: string;
  parentSlug: BusinessCategory;
  description: string;
  order: number;
  isActive: boolean;
}

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

export const DAY_ABBREV: Record<DayOfWeek, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

export interface StructuredHourSlot {
  day: DayOfWeek;
  open: string;  // "HH:mm" 24h format
  close: string; // "HH:mm" 24h format
}

export interface Business {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating: number;
  totalRatings: number;
  priceLevel?: number;
  category: LegacyBusinessCategory; // legacy — kept for backward compat
  categories?: BusinessCategory[]; // new — up to 3
  subcategories?: SubcategorySlug[]; // new
  types?: string[];
  photos: string[];
  hours?: string[];
  structuredHours?: StructuredHourSlot[];
  description?: string;
  isOpen?: boolean;
  status?: string;
  claimed?: boolean;
  active?: boolean;
  latitude: number;
  longitude: number;
  placeId?: string;
  tags?: string[];
  ownerId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ClaimRequest {
  id: string;
  businessId: string;
  businessName: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: "pending" | "approved" | "denied";
  note?: string;
  createdAt?: any;
  reviewedAt?: any;
  reviewedBy?: string;
}

export interface BusinessPhoto {
  id: string;
  businessId: string;
  userId?: string;
  url: string;
  tag: PhotoTag;
  foodTags?: string[];
  description?: string;
  order?: number;
  createdAt?: any;
}

export type PhotoTag = "food" | "drinks" | "inside" | "menu" | "outside" | "other";

export interface Review {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  rating: number;
  text: string;
  pointsEarned?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  points: number;
  reviewCount: number;
  checkInCount: number;
  role?: "user" | "admin" | "business_owner";
  favorites?: string[];
  checkedDishes?: number[];
  ownedBusinessIds?: string[];
  lastActive?: any;
  createdAt?: any;
  // Extended profile
  firstName?: string;
  lastName?: string;
  nickname?: string;
  bio?: string;
  gender?: "male" | "female" | "other" | "prefer_not" | null;
  city?: string;
  state?: string;
  website?: string;
}

export interface CheckIn {
  id: string;
  userId: string;
  businessId: string;
  timestamp: any;
  pointsEarned: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  businessId?: string;
  active: boolean;
}

export interface Redemption {
  id: string;
  userId: string;
  rewardId: string;
  businessId?: string;
  redeemedAt: any;
}

export interface MonVietDish {
  id: string;
  rank: number;
  name: string;
  englishName: string;
  section: DishSection;
  sectionTitle: string;
  sectionTitleViet: string;
  shortDescription: string;
  description: string;
  history: string;
  pronunciation: string;
  photoURL?: string;
  searchQuery: string;
  isActive?: boolean;
}

export type DishSection =
  | "noodle_soups"
  | "dry_noodles"
  | "rice"
  | "banh"
  | "rolls"
  | "grilled"
  | "sides"
  | "sweets";

export interface DishSectionInfo {
  key: DishSection;
  title: string;
  titleViet: string;
  range: string;
}

export const DISH_SECTIONS: DishSectionInfo[] = [
  { key: "noodle_soups", title: "Noodle Soups", titleViet: "Mì & Bún Nước", range: "#1–10" },
  { key: "dry_noodles", title: "Dry Noodles", titleViet: "Bún & Mì Khô", range: "#11–15" },
  { key: "rice", title: "Rice Dishes", titleViet: "Cơm", range: "#16–20" },
  { key: "banh", title: "Cakes, Crepes & Breads", titleViet: "Bánh", range: "#21–29" },
  { key: "rolls", title: "Rolls & Wraps", titleViet: "Cuốn", range: "#30–34" },
  { key: "grilled", title: "Grilled, Braised & Stir-Fried", titleViet: "Nướng, Kho & Xào", range: "#35–42" },
  { key: "sides", title: "Sides & Street Food", titleViet: "Món Phụ & Ăn Vặt", range: "#43–46" },
  { key: "sweets", title: "Sweets & Drinks", titleViet: "Chè & Đồ Uống", range: "#47–50" },
];

export interface Pick {
  id: string;
  restaurantId: string;
  month: string;
  category: string;
  badge: "locals" | "editor" | "community";
  whyPick: string;
  knownFor: string;
  isNew: boolean;
  order: number;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const CATEGORIES: Record<BusinessCategory, { label: string; icon: string }> = {
  restaurant: { label: "Restaurants", icon: "🍜" },
  coffee_tea: { label: "Coffee & Tea", icon: "☕" },
  bakery_dessert: { label: "Bakery & Dessert", icon: "🥖" },
  grocery: { label: "Grocery & Markets", icon: "🛒" },
  beauty: { label: "Beauty & Wellness", icon: "💅" },
  shopping: { label: "Shopping & Retail", icon: "🛍️" },
  services: { label: "Services", icon: "🔧" },
  health: { label: "Health & Medical", icon: "🏥" },
  entertainment: { label: "Events & Entertainment", icon: "🎪" },
  community: { label: "Community & Education", icon: "🏛️" },
};

// Legacy mapping for backward compat during migration
export const LEGACY_CATEGORY_MAP: Record<LegacyBusinessCategory, BusinessCategory> = {
  restaurant: "restaurant",
  bakery: "bakery_dessert",
  cafe: "coffee_tea",
  grocery: "grocery",
  beauty: "beauty",
  shopping: "shopping",
  business: "services",
};

/** Resolve category info for a business (handles both legacy and new category fields) */
export function getCategoryInfo(business: { category?: string; categories?: string[] }): { label: string; icon: string } {
  // Prefer new categories array
  if (business.categories && business.categories.length > 0) {
    const cat = business.categories[0] as BusinessCategory;
    if (CATEGORIES[cat]) return CATEGORIES[cat];
  }
  // Fall back to legacy category field
  if (business.category) {
    const mapped = LEGACY_CATEGORY_MAP[business.category as LegacyBusinessCategory];
    if (mapped && CATEGORIES[mapped]) return CATEGORIES[mapped];
    // Direct match (e.g. "restaurant", "grocery" exist in both)
    if (CATEGORIES[business.category as BusinessCategory]) return CATEGORIES[business.category as BusinessCategory];
  }
  return { label: "Business", icon: "🏢" };
}

export interface DishFeaturedEntry {
  businessId: string;
  rank: number;
}

export interface DishFeatured {
  dishRank: number;
  entries: DishFeaturedEntry[];
  updatedAt?: any;
  updatedBy?: string;
}

export interface PromoBanner {
  id: string;
  imageURL: string;
  linkType: "search" | "food" | "category" | "url";
  linkValue: string;
  order: number;
  active: boolean;
}

export const POINTS = {
  REVIEW: 25,
  CHECK_IN: 10,
  PHOTO_UPLOAD: 15,
  DISH_CHECK: 5,
  CHALLENGE_BONUS: 50,
} as const;

// ============================================
// Promotions
// ============================================

export type OfferType = "percent_off" | "fixed_off" | "free_item" | "double_dong" | "bonus_dong" | "bogo";

export const OFFER_TYPES: Record<OfferType, { label: string; icon: string }> = {
  percent_off: { label: "% Off", icon: "Percent" },
  fixed_off: { label: "$ Off", icon: "DollarSign" },
  free_item: { label: "Free Item", icon: "Gift" },
  double_dong: { label: "2x Đồng", icon: "ArrowUpRight" },
  bonus_dong: { label: "Bonus Đồng", icon: "PlusCircle" },
  bogo: { label: "BOGO", icon: "Copy" },
};

export type PromotionStatus = "draft" | "active" | "paused" | "ended";

export type IssuanceTrigger =
  | "onInstall"
  | "onProfileComplete"
  | "onFirstReview"
  | "onReviewCount"
  | "onCheckinMilestone"
  | "onChallengeComplete"
  | "onReferral"
  | "onBirthday"
  | "adminManual"
  | "adminCampaign";

export const ISSUANCE_TRIGGERS: Record<IssuanceTrigger, string> = {
  onInstall: "New User Signup",
  onProfileComplete: "Profile Completed",
  onFirstReview: "First Review",
  onReviewCount: "Review Milestone",
  onCheckinMilestone: "Check-in Milestone",
  onChallengeComplete: "Challenge Complete",
  onReferral: "Referral",
  onBirthday: "Birthday",
  adminManual: "Manual (Admin)",
  adminCampaign: "Campaign (Bulk)",
};

export interface Promotion {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  description: string;
  termsAndConditions: string;
  type: OfferType;
  discountValue?: number | null;
  itemDescription?: string | null;
  dongBonus: number;
  issuanceTrigger: IssuanceTrigger;
  triggerParams?: Record<string, any> | null;
  validFrom?: any;
  validUntil?: any;
  usageLimitPerUser: number;
  usageLimitTotal?: number | null;
  status: PromotionStatus;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
  imageUrl?: string | null;
  badgeColor?: string | null;
}

export interface UserOffer {
  id: string;
  userOfferId: string;
  userId: string;
  promotionId: string;
  businessId: string;
  businessName: string;
  title: string;
  description: string;
  type: OfferType;
  status: "issued" | "saved" | "redeemed" | "expired";
  issuedAt?: any;
  issuedBy?: string;
  expiresAt?: any;
  redeemedAt?: any;
  redeemedAtBusinessId?: string | null;
  scannedByOwnerId?: string | null;
  qrPayload: string;
  qrNonce: string;
}
