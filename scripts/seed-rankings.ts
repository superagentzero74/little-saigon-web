/**
 * Seed business rankings.
 * Run: npx tsx scripts/seed-rankings.ts
 *
 * Sets isFeatured and seedScore for known top businesses.
 * All others default to isFeatured: false, seedScore: 50 (no update needed).
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

const sa = JSON.parse(fs.readFileSync("./service-account-key.json", "utf-8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Featured businesses — always float to top
const FEATURED: { name: string; seedScore: number }[] = [
  { name: "Brodard Restaurant", seedScore: 95 },
  { name: "Brodard Chateau", seedScore: 93 },
  { name: "Lee's Sandwiches", seedScore: 90 },
  { name: "Quan Hy", seedScore: 88 },
  { name: "Banh Mi Che Cali", seedScore: 87 },
  { name: "Garlic & Chives", seedScore: 92 },
  { name: "Phở 79", seedScore: 89 },
  { name: "Pho Quang Trung", seedScore: 86 },
  { name: "Thạch Chè Hiển Khánh", seedScore: 85 },
];

// High-ranked but not featured (seedScore 70-84)
const HIGH_RANK: { name: string; seedScore: number }[] = [
  { name: "Phởholic", seedScore: 82 },
  { name: "Pho Lovers 3", seedScore: 78 },
  { name: "Bánh Mì Chè Cali", seedScore: 80 },
  { name: "Song Long Restaurant", seedScore: 75 },
  { name: "Com Tam Thuan Kieu", seedScore: 76 },
  { name: "Golden Deli", seedScore: 77 },
  { name: "Hương Huế Cuisine", seedScore: 74 },
  { name: "Quán Nhà Hai Lúa", seedScore: 73 },
  { name: "Hong Kong Express", seedScore: 72 },
  { name: "Seafood Cove 2", seedScore: 71 },
];

async function main() {
  console.log("Loading all businesses...");
  const snap = await db.collection("businesses").get();
  const byName = new Map<string, string>(); // lowercase name → doc id
  snap.docs.forEach((d) => {
    const name = (d.data().name || "").toLowerCase().trim();
    byName.set(name, d.id);
  });
  console.log(`Found ${snap.size} businesses\n`);

  const batch = db.batch();
  let count = 0;

  // Set featured businesses
  for (const entry of FEATURED) {
    const id = byName.get(entry.name.toLowerCase().trim());
    if (id) {
      batch.update(db.collection("businesses").doc(id), {
        isFeatured: true,
        seedScore: entry.seedScore,
      });
      console.log(`⭐ ${entry.name} → featured, score ${entry.seedScore}`);
      count++;
    } else {
      console.log(`⚠️  ${entry.name} — NOT FOUND`);
    }
  }

  // Set high-ranked businesses
  for (const entry of HIGH_RANK) {
    const id = byName.get(entry.name.toLowerCase().trim());
    if (id) {
      batch.update(db.collection("businesses").doc(id), {
        isFeatured: false,
        seedScore: entry.seedScore,
      });
      console.log(`📊 ${entry.name} → score ${entry.seedScore}`);
      count++;
    } else {
      console.log(`⚠️  ${entry.name} — NOT FOUND`);
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`\n✅ Updated ${count} businesses`);
  } else {
    console.log("\n⚠️  No businesses matched");
  }
}

main().catch(console.error);
