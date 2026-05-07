import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as fs from "fs";

const sa = JSON.parse(fs.readFileSync("./service-account-key.json", "utf-8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function main() {
  // 1. Load all Mon Viet dishes from Firestore
  const foodsSnap = await db.collection("foods").get();
  const dishes = foodsSnap.docs.map((d) => {
    const data = d.data();
    return {
      name: data.vietnameseName || data.name || "",
      englishName: data.englishName || "",
      searchQuery: data.searchQuery || "",
    };
  });

  console.log(`Loaded ${dishes.length} Mon Viet dishes:\n`);
  for (const d of dishes) {
    console.log(`  - ${d.name} (${d.englishName})`);
  }

  // 2. Build keyword map: normalized search terms -> dish display name
  // Each dish gets both its Vietnamese name and English name as tags
  const keywordMap: { keywords: string[]; tags: string[] }[] = [];
  for (const d of dishes) {
    const keywords: string[] = [];
    const tags: string[] = [];

    if (d.name) {
      keywords.push(normalize(d.name));
      tags.push(d.name);
    }
    if (d.englishName) {
      tags.push(d.englishName);
    }
    // searchQuery often has the ascii-friendly version (e.g. "banh xeo")
    if (d.searchQuery) {
      keywords.push(normalize(d.searchQuery));
    }

    if (keywords.length > 0) {
      keywordMap.push({ keywords, tags });
    }
  }

  // 3. Load all restaurant/food businesses
  const bizSnap = await db.collection("businesses").get();
  const foodCategories = ["restaurant", "bakery_dessert", "coffee_tea", "bakery", "cafe"];

  let updated = 0;
  let skipped = 0;

  for (const doc of bizSnap.docs) {
    const data = doc.data();
    const category = data.category || "";
    if (!foodCategories.includes(category)) continue;

    const bizName = normalize(data.name || "");
    const currentTags: string[] = data.tags || [];
    const newTags: string[] = [];

    for (const entry of keywordMap) {
      for (const kw of entry.keywords) {
        // Check if business name contains the dish keyword
        // Use word-ish matching: "pho" should match "Pho 79" but not "phosphate"
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b|^${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s|\\s${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
        if (regex.test(bizName)) {
          for (const tag of entry.tags) {
            if (!currentTags.includes(tag) && !newTags.includes(tag)) {
              newTags.push(tag);
            }
          }
          break;
        }
      }
    }

    if (newTags.length === 0) {
      skipped++;
      continue;
    }

    console.log(`\n  ${data.name} (${doc.id})`);
    console.log(`    Current tags: [${currentTags.join(", ")}]`);
    console.log(`    Adding: [${newTags.join(", ")}]`);

    await db.collection("businesses").doc(doc.id).update({
      tags: FieldValue.arrayUnion(...newTags),
    });
    updated++;
  }

  console.log(`\n\nDone! Updated ${updated} businesses, skipped ${skipped} (no matches).`);
}

main().catch(console.error);
