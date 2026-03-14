import type { Business, StructuredHourSlot } from "./types";
import { isOpenStructured } from "./hours-utils";

/**
 * Generate a URL-friendly slug from a business name + id
 * e.g. "Phở 79" → "pho-79-abc123"
 */
export function businessSlug(business: Business): string {
  const nameSlug = business.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics for URL
    .replace(/[đ]/g, "d")
    .replace(/[Đ]/g, "D")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  // Use double-dash to separate name from full ID for reliable extraction
  return `${nameSlug}--${business.id}`;
}

/**
 * Extract business ID from a slug
 */
export function idFromSlug(slug: string): string {
  // The last segment after the final dash is the first 8 chars of the ID
  // We'll need to query by this prefix — or store full slugs in Firestore
  // For now, return the last segment
  const parts = slug.split("-");
  return parts[parts.length - 1];
}

/**
 * Generate a dish slug from rank and name
 * e.g. rank 1, "Phở Bò" → "1-pho-bo"
 */
export function dishSlug(rank: number, name: string): string {
  const nameSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${rank}-${nameSlug}`;
}

/**
 * Check if a business is currently open based on hours array
 * Hours format from Google Places: "Monday: 8:00 AM – 9:00 PM"
 */
export function isCurrentlyOpen(hours?: string[], structuredHours?: StructuredHourSlot[]): boolean | null {
  if (structuredHours && structuredHours.length > 0) return isOpenStructured(structuredHours);
  if (!hours || hours.length === 0) return null;

  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = days[now.getDay()];

  const todayHours = hours.find((h) => h.startsWith(today));
  if (!todayHours) return null;
  if (todayHours.includes("Closed")) return false;
  if (todayHours.includes("Open 24 hours")) return true;

  // Parse time range
  const match = todayHours.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
  if (!match) return null;

  const parseTime = (str: string): number => {
    const [time, period] = str.trim().split(/\s+/);
    let [h, m] = time.split(":").map(Number);
    if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
    if (period?.toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const openMin = parseTime(match[1]);
  const closeMin = parseTime(match[2]);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (closeMin > openMin) {
    return nowMin >= openMin && nowMin <= closeMin;
  } else {
    // Wraps past midnight
    return nowMin >= openMin || nowMin <= closeMin;
  }
}

/**
 * Format rating as display string
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Format price level as $ signs
 */
export function formatPriceLevel(level?: number): string {
  if (!level) return "";
  return "$".repeat(level);
}

/**
 * Get a Google Maps static image URL for a business location
 */
export function getStaticMapUrl(lat: number, lng: number, zoom = 15, size = "400x200"): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=color:black%7C${lat},${lng}&style=feature:all%7Csaturation:-100&key=${key}`;
}

/**
 * Get Google Maps directions URL
 */
export function getDirectionsUrl(business: Business): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}&destination_place_id=${business.placeId || ""}`;
}
