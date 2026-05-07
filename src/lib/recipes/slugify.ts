/**
 * Converts a Vietnamese string to a URL-safe slug.
 * Strips diacritics: "Phở Bò Miền Nam" → "pho-bo-mien-nam"
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")                   // decompose accented characters
    .replace(/[\u0300-\u036f]/g, "")    // strip combining diacritical marks
    .replace(/đ/g, "d")                 // Vietnamese đ → d
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")      // remove non-alphanumeric chars
    .replace(/[\s_]+/g, "-")            // spaces/underscores → hyphens
    .replace(/-+/g, "-")               // collapse multiple hyphens
    .replace(/^-|-$/g, "");            // trim leading/trailing hyphens
}
