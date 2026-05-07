import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as fs from "fs";

const sa = JSON.parse(fs.readFileSync("./service-account-key.json", "utf-8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
  const snap = await db.collection("businesses").get();
  const toUpdate: { id: string; name: string; currentSubs: string[] }[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const name = (data.name || "").toLowerCase();
    const subs: string[] = data.subcategories || [];

    if (name.includes("pho") && !subs.includes("pho")) {
      toUpdate.push({ id: doc.id, name: data.name, currentSubs: subs });
    }
  }

  console.log(`Found ${toUpdate.length} businesses with "pho" in name missing the "pho" subcategory:\n`);
  for (const b of toUpdate) {
    console.log(`  - ${b.name} (${b.id}) [current subs: ${b.currentSubs.join(", ") || "none"}]`);
  }

  if (toUpdate.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  console.log("\nUpdating...");
  for (const b of toUpdate) {
    await db.collection("businesses").doc(b.id).update({
      subcategories: FieldValue.arrayUnion("pho"),
    });
    console.log(`  ✓ Tagged: ${b.name}`);
  }
  console.log("\nDone!");
}

main().catch(console.error);
