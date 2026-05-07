import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";

const sa = JSON.parse(fs.readFileSync("./service-account-key.json", "utf-8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Manual corrections for 'business' and 'services' category businesses
const FIXES: Record<string, { category: string; subcategories: string[] }> = {
  // From 'business' category
  "ChIJ116D-1sp3YARB2tFgLBm_lk": { category: "community", subcategories: ["community_center", "non_profit"] },
  "ChIJ47fOF6cn3YARieWzqjwNoho": { category: "community", subcategories: ["non_profit"] },
  "ChIJ80tnELcp3YARoR-ZPH8pYME": { category: "beauty", subcategories: ["nail_salon"] },
  "ChIJ8RnLeLcn3YAR7-Wzd3S1XsY": { category: "shopping", subcategories: ["shopping_center"] },
  "ChIJPwR6FeMn3YARw9Il0_KxM28": { category: "community", subcategories: ["school"] },
  "ChIJSaa9rrcn3YARchQVEiZGIBY": { category: "services", subcategories: ["notary"] },
  "ChIJfXEYtTMn3YARw1JjL6KX46Y": { category: "coffee_tea", subcategories: ["cafe"] },
  "ChIJlyUttfwn3YAR2afxOok0MU0": { category: "grocery", subcategories: ["specialty_food"] },
  "ChIJz1dMjg8n3YARThUc4lHsbL8": { category: "services", subcategories: ["shipping"] },
  "ChIJzfO6mrUn3YARRkVeK_HtS3Q": { category: "grocery", subcategories: ["produce_market"] },
  "H4ePYrY6ScM2S8mc0Jy2": { category: "health", subcategories: ["pharmacy"] },
  "IDB7deDFCoPIDA8xGJjL": { category: "coffee_tea", subcategories: ["boba"] },
  "IaPCuMMsRYxNHERicurr": { category: "services", subcategories: ["financial"] },
  "MqlfpK3C1msYweYiHhte": { category: "grocery", subcategories: ["herb_shop"] },
  "OV2ERITTgpv3pTmEDMUz": { category: "grocery", subcategories: ["produce_market"] },
  "SjdUwEIwVT5Fg2Dyy5Yd": { category: "shopping", subcategories: ["clothing"] },
  "U5Ira9wgPWNMaeVOHs40": { category: "grocery", subcategories: ["specialty_food"] },
  "YOuPNwTFc208fgwBnCQx": { category: "health", subcategories: ["pharmacy"] },
  "Z4rYQWHV485QJiHOkY6T": { category: "restaurant", subcategories: ["foodtogo"] },
  "nPUxVGbp8byi4sjuXJaB": { category: "grocery", subcategories: ["specialty_food"] },
  "o9dUeoy9guWBJVPnFRfM": { category: "coffee_tea", subcategories: ["cafe"] },
  "v5Ks6t7nlWPl2JOApjdb": { category: "grocery", subcategories: ["produce_market"] },
  "xENT4n3v25yAUDKgo5Jx": { category: "community", subcategories: ["school"] },

  // From 'services' category
  "QImJ3vgDWuHbsLTa68EH": { category: "restaurant", subcategories: [] }, // Trang Chiều Tím
  "V0foWbWpsp1xzrT5zFZD": { category: "coffee_tea", subcategories: ["boba"] }, // Tastea Goldenwest
  "VjjUOmebPS0zfLFAO2WY": { category: "restaurant", subcategories: [] }, // Duc Thanh
  "h8UaaazAbfWvP4ie33kP": { category: "shopping", subcategories: ["jewelry"] }, // Dung Thai
  "rT5uU2nRmfwZp6RULRrw": { category: "community", subcategories: ["temple"] }, // Chùa Viên Minh
};

async function main() {
  let updated = 0;
  for (const [id, fix] of Object.entries(FIXES)) {
    const ref = db.collection("businesses").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      console.log(`⚠️  ${id} not found, skipping`);
      continue;
    }
    const name = doc.data()?.name || id;
    await ref.update({
      category: fix.category,
      subcategories: fix.subcategories,
    });
    console.log(`✅ ${name} → ${fix.category} [${fix.subcategories.join(", ")}]`);
    updated++;
  }
  console.log(`\nDone! Fixed ${updated} businesses.`);
}

main().catch(console.error);
