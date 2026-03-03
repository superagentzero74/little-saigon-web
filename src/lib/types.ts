// ============================================
// Little Saigon Web — Type Definitions
// Matches Firestore schema from BLUEPRINT.md
// ============================================

export type BusinessCategory =
  | "restaurant"
  | "bakery"
  | "cafe"
  | "grocery"
  | "beauty"
  | "shopping"
  | "business";

export interface Business {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating: number;
  totalRatings: number;
  priceLevel?: number;
  category: BusinessCategory;
  types?: string[];
  photos: string[];
  hours?: string[];
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
  restaurant: { label: "Restaurant", icon: "🍜" },
  bakery: { label: "Bakery", icon: "🥐" },
  cafe: { label: "Cafe", icon: "☕" },
  grocery: { label: "Grocery", icon: "🛒" },
  beauty: { label: "Beauty & Nails", icon: "✨" },
  shopping: { label: "Shopping", icon: "🛍️" },
  business: { label: "Business", icon: "🏢" },
};

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

export const POINTS = {
  REVIEW: 25,
  CHECK_IN: 10,
  PHOTO_UPLOAD: 15,
  DISH_CHECK: 5,
  CHALLENGE_BONUS: 50,
} as const;
