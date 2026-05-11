/**
 * WebP helper — routes a URL to its `.webp` sibling produced by the
 * `onImageUpload` Cloud Function in our Firebase Storage bucket.
 *
 * The transform is conservative: it only swaps the extension when the URL
 * points at our own bucket, where we know a sibling .webp exists (or will
 * shortly after upload). Foreign URLs (Shopify CDN, Google Places photos,
 * placehold.co, etc.) are returned unchanged.
 */

const FIREBASE_STORAGE_HOST_SUFFIXES = [
  "storage.googleapis.com",
  "firebasestorage.googleapis.com",
  "firebasestorage.app",
];

const SUPPORTED_EXTS = new Set(["jpg", "jpeg", "png", "heic", "heif"]);

/**
 * Returns a `.webp` sibling URL if the input points at our Firebase bucket
 * and has a swappable extension; otherwise returns the input unchanged.
 *
 * @example
 *   webpIfFirebase("https://storage.googleapis.com/.../foo.jpg")
 *   // → "https://storage.googleapis.com/.../foo.webp"
 *
 *   webpIfFirebase("https://cdn.shopify.com/.../foo.jpg")
 *   // → "https://cdn.shopify.com/.../foo.jpg" (unchanged)
 */
export function webpIfFirebase(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.host.toLowerCase();
  const isOurs = FIREBASE_STORAGE_HOST_SUFFIXES.some((s) => host.endsWith(s));
  if (!isOurs) return url;

  const lastDot = parsed.pathname.lastIndexOf(".");
  if (lastDot === -1) return url;
  const ext = parsed.pathname.slice(lastDot + 1).toLowerCase();
  if (!SUPPORTED_EXTS.has(ext)) return url;

  parsed.pathname = parsed.pathname.slice(0, lastDot) + ".webp";
  return parsed.toString();
}
