/**
 * Run with: npx ts-node --esm scripts/categorize-services.ts
 * Or: npx tsx scripts/categorize-services.ts
 *
 * This script reads all businesses in the "services" category and
 * assigns subcategories based on keyword matching in the business name and types.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

// Initialize Firebase Admin
const serviceAccountPath = "./service-account-key.json";
if (fs.existsSync(serviceAccountPath)) {
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
  initializeApp({ credential: cert(sa) });
} else {
  initializeApp({ projectId: "little-saigon-c055a" });
}

const db = getFirestore();

// Subcategory keyword mapping for services
const SERVICE_SUBCATS: Record<string, string[]> = {
  auto_repair: ["auto", "car", "mechanic", "tire", "oil change", "body shop", "collision", "automotive", "smog", "transmission", "brake"],
  insurance: ["insurance", "allstate", "state farm", "geico", "farmers"],
  tax_accounting: ["tax", "accounting", "cpa", "bookkeeping", "payroll"],
  legal: ["law", "attorney", "lawyer", "legal", "notary", "immigration"],
  real_estate: ["real estate", "realtor", "realty", "mortgage", "property", "loan"],
  dental: ["dental", "dentist", "orthodont"],
  medical: ["medical", "doctor", "clinic", "physician", "health care", "chiropractic", "acupuncture", "optometry", "eye care"],
  pharmacy: ["pharmacy", "rx", "drugstore", "thuốc"],
  printing: ["printing", "print", "copy", "sign", "banner"],
  cleaning: ["cleaning", "laundry", "dry clean", "wash"],
  shipping: ["shipping", "freight", "courier", "ups", "fedex", "postal", "mail"],
  travel: ["travel", "airline", "tour", "visa"],
  education: ["tutoring", "tutor", "school", "academy", "learning", "education", "driving school"],
  financial: ["bank", "credit union", "financial", "money transfer", "remittance", "western union"],
  repair: ["repair", "fix", "phone repair", "computer repair", "electronic"],
  photography: ["photo", "photography", "studio", "portrait", "video"],
  pet: ["pet", "veterinar", "vet ", "grooming", "animal"],
  funeral: ["funeral", "mortuary", "cemetery", "cremation"],
  religious: ["church", "temple", "pagoda", "chùa", "nhà thờ", "mosque"],
};

async function main() {
  console.log("Fetching services businesses...");

  const snap = await db.collection("businesses")
    .where("category", "==", "services")
    .get();

  const snap2 = await db.collection("businesses")
    .where("categories", "array-contains", "services")
    .get();

  const bizMap = new Map<string, any>();
  for (const d of [...snap.docs, ...snap2.docs]) {
    if (!bizMap.has(d.id)) bizMap.set(d.id, { id: d.id, ...d.data() });
  }

  const businesses = Array.from(bizMap.values());
  console.log(`Found ${businesses.length} services businesses\n`);

  let updated = 0;
  let skipped = 0;

  for (const biz of businesses) {
    const name = (biz.name || "").toLowerCase();
    const types = (biz.types || []).map((t: string) => t.toLowerCase());
    const searchText = [name, ...types].join(" ");

    const matchedSubs: string[] = [];

    for (const [subSlug, keywords] of Object.entries(SERVICE_SUBCATS)) {
      for (const kw of keywords) {
        if (searchText.includes(kw.toLowerCase())) {
          matchedSubs.push(subSlug);
          break;
        }
      }
    }

    if (matchedSubs.length > 0) {
      const existing = biz.subcategories || [];
      const merged = Array.from(new Set([...existing, ...matchedSubs]));

      if (merged.length !== existing.length || !merged.every((s: string) => existing.includes(s))) {
        console.log(`✅ ${biz.name} → [${merged.join(", ")}]`);
        await db.collection("businesses").doc(biz.id).update({ subcategories: merged });
        updated++;
      } else {
        skipped++;
      }
    } else {
      console.log(`⚠️  ${biz.name} → no match (types: ${types.join(", ")})`);
      skipped++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch(console.error);
