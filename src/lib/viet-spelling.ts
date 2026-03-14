/**
 * Vietnamese spelling correction dictionary.
 * Maps romanized/ASCII text → correct Vietnamese with diacritics.
 * Used for inline suggestions in admin text fields.
 */

// Each entry: [ascii pattern (lowercase), correct Vietnamese form]
const VIET_DICTIONARY: [string, string][] = [
  // ── Food & Cuisine ──
  ["pho", "Phở"],
  ["pho bo", "Phở Bò"],
  ["pho ga", "Phở Gà"],
  ["bun bo hue", "Bún Bò Huế"],
  ["bun bo", "Bún Bò"],
  ["bun", "Bún"],
  ["bun cha", "Bún Chả"],
  ["bun rieu", "Bún Riêu"],
  ["bun thit nuong", "Bún Thịt Nướng"],
  ["hu tieu", "Hủ Tiếu"],
  ["hu tieu nam vang", "Hủ Tiếu Nam Vang"],
  ["mi quang", "Mì Quảng"],
  ["banh canh", "Bánh Canh"],
  ["banh mi", "Bánh Mì"],
  ["banh xeo", "Bánh Xèo"],
  ["banh cuon", "Bánh Cuốn"],
  ["banh khot", "Bánh Khọt"],
  ["banh beo", "Bánh Bèo"],
  ["banh bao", "Bánh Bao"],
  ["banh trang", "Bánh Tráng"],
  ["banh tet", "Bánh Tét"],
  ["banh chung", "Bánh Chưng"],
  ["banh flan", "Bánh Flan"],
  ["banh da", "Bánh Đa"],
  ["banh", "Bánh"],
  ["com tam", "Cơm Tấm"],
  ["com ga", "Cơm Gà"],
  ["com suon", "Cơm Sườn"],
  ["com chien", "Cơm Chiên"],
  ["com", "Cơm"],
  ["goi cuon", "Gỏi Cuốn"],
  ["cha gio", "Chả Giò"],
  ["cha", "Chả"],
  ["nem nuong", "Nem Nướng"],
  ["nem", "Nem"],
  ["nuong", "Nướng"],
  ["thit nuong", "Thịt Nướng"],
  ["bo nuong", "Bò Nướng"],
  ["ga nuong", "Gà Nướng"],
  ["lau", "Lẩu"],
  ["lau thai", "Lẩu Thái"],
  ["hai san", "Hải Sản"],
  ["tom", "Tôm"],
  ["cua", "Cua"],
  ["ca", "Cá"],
  ["muc", "Mực"],
  ["chao", "Cháo"],
  ["xoi", "Xôi"],
  ["bo kho", "Bò Kho"],
  ["ca ri", "Cà Ri"],
  ["ca phe", "Cà Phê"],
  ["ca phe sua da", "Cà Phê Sữa Đá"],
  ["ca phe trung", "Cà Phê Trứng"],
  ["tra da", "Trà Đá"],
  ["tra", "Trà"],
  ["che", "Chè"],
  ["sinh to", "Sinh Tố"],
  ["nuoc mia", "Nước Mía"],
  ["nuoc", "Nước"],
  ["sua", "Sữa"],
  ["da", "Đá"],
  ["rau muong", "Rau Muống"],
  ["rau", "Rau"],
  ["dau hu", "Đậu Hũ"],
  ["dau", "Đậu"],
  ["mi xao", "Mì Xào"],
  ["mi", "Mì"],
  ["chay", "Chay"],
  ["nuoc mam", "Nước Mắm"],
  ["tuong", "Tương"],
  ["ot", "Ớt"],
  ["bo", "Bò"],
  ["ga", "Gà"],
  ["heo", "Heo"],
  ["vit", "Vịt"],
  ["trung", "Trứng"],

  // ── Business & Places ──
  ["nha hang", "Nhà Hàng"],
  ["quan", "Quán"],
  ["quan an", "Quán Ăn"],
  ["tiem", "Tiệm"],
  ["tiem banh", "Tiệm Bánh"],
  ["tiem pho", "Tiệm Phở"],
  ["cho", "Chợ"],
  ["sieu thi", "Siêu Thị"],
  ["nha thuoc", "Nhà Thuốc"],
  ["nha tho", "Nhà Thờ"],
  ["chua", "Chùa"],
  ["truong", "Trường"],
  ["benh vien", "Bệnh Viện"],
  ["phong kham", "Phòng Khám"],
  ["tham my", "Thẩm Mỹ"],
  ["lam dep", "Làm Đẹp"],
  ["toc", "Tóc"],
  ["mong", "Móng"],

  // ── Common Vietnamese words ──
  ["viet nam", "Việt Nam"],
  ["viet", "Việt"],
  ["sai gon", "Sài Gòn"],
  ["ha noi", "Hà Nội"],
  ["hue", "Huế"],
  ["da nang", "Đà Nẵng"],
  ["da lat", "Đà Lạt"],
  ["duong", "Đường"],
  ["phuoc loc tho", "Phước Lộc Thọ"],
  ["tet", "Tết"],
  ["ao dai", "Áo Dài"],
  ["vo thuat", "Võ Thuật"],
  ["du lich", "Du Lịch"],
  ["dich vu", "Dịch Vụ"],
  ["cong dong", "Cộng Đồng"],
  ["giao duc", "Giáo Dục"],
  ["suc khoe", "Sức Khỏe"],
  ["giai tri", "Giải Trí"],
  ["mua sam", "Mua Sắm"],
  ["thao duoc", "Thảo Dược"],
  ["cham cuu", "Châm Cứu"],
  ["nha khoa", "Nha Khoa"],
  ["xin chao", "Xin Chào"],
  ["cam on", "Cảm Ơn"],

  // ── Category names ──
  ["nha hang", "Nhà Hàng"],
  ["ca phe & tra", "Cà Phê & Trà"],
  ["banh & trang mieng", "Bánh & Tráng Miệng"],
  ["cho & sieu thi", "Chợ & Siêu Thị"],
  ["lam dep & suc khoe", "Làm Đẹp & Sức Khỏe"],
];

// Normalize: strip diacritics and lowercase
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

// Build lookup index (sorted by length descending for longest-match-first)
const SORTED_DICT = [...VIET_DICTIONARY].sort((a, b) => b[0].length - a[0].length);

/**
 * Given an input string, return Vietnamese spelling suggestions.
 * Returns array of { match: string, suggestion: string, startIndex: number }
 */
export function getVietSuggestions(input: string): { match: string; suggestion: string }[] {
  if (!input || input.length < 2) return [];

  const normalized = normalize(input);
  const suggestions: { match: string; suggestion: string }[] = [];
  const seen = new Set<string>();

  for (const [ascii, viet] of SORTED_DICT) {
    // Check if the normalized input contains this ASCII pattern
    if (normalized.includes(ascii) && !seen.has(viet)) {
      // Only suggest if the input doesn't already have the correct Vietnamese
      if (!input.includes(viet)) {
        // Find the original text that matches
        const idx = normalized.indexOf(ascii);
        const originalMatch = input.substring(idx, idx + ascii.length);
        // Don't suggest if they already typed it correctly with diacritics
        if (normalize(originalMatch) === ascii && originalMatch !== viet) {
          suggestions.push({ match: originalMatch, suggestion: viet });
          seen.add(viet);
        }
      }
    }
  }

  return suggestions.slice(0, 5); // limit to 5 suggestions
}

/**
 * Apply a suggestion by replacing the matched text with the Vietnamese form.
 */
export function applySuggestion(input: string, match: string, suggestion: string): string {
  // Case-insensitive replace of the first occurrence
  const idx = normalize(input).indexOf(normalize(match));
  if (idx === -1) return input;
  return input.substring(0, idx) + suggestion + input.substring(idx + match.length);
}
