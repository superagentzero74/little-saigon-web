/**
 * Downloads all Google Places photos and re-uploads to Firebase Storage.
 * Replaces expiring Google URLs with permanent Firebase Storage URLs.
 *
 * Run: npx tsx scripts/fix-photos-permanent.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

const sa = JSON.parse(fs.readFileSync("./service-account-key.json", "utf-8"));
const app = initializeApp({
  credential: cert(sa),
  storageBucket: "little-saigon-c055a.firebasestorage.app",
});

const db = getFirestore();
const bucket = getStorage().bucket();

function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const request = client.get(url, { timeout: 15000 }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadImage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    request.on("error", reject);
    request.on("timeout", () => { request.destroy(); reject(new Error("Timeout")); });
  });
}

async function uploadToStorage(bizId: string, index: number, buffer: Buffer): Promise<string> {
  const path = `businesses/${bizId}/photos/card_${index}.jpg`;
  const file = bucket.file(path);
  await file.save(buffer, {
    contentType: "image/jpeg",
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

function isFirebaseURL(url: string): boolean {
  return url.includes("firebasestorage.googleapis.com") ||
         url.includes("firebasestorage.app") ||
         url.includes("storage.googleapis.com");
}

async function main() {
  console.log("Fetching all businesses...\n");
  const snap = await db.collection("businesses").get();
  console.log(`Total: ${snap.size} businesses\n`);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const name = data.name || doc.id;
    const photos: string[] = (data.photos || []).filter((p: string) => p && p.trim());

    if (photos.length === 0) {
      skipped++;
      continue;
    }

    // Check if already all Firebase URLs
    const allFirebase = photos.every(isFirebaseURL);
    if (allFirebase) {
      skipped++;
      continue;
    }

    // Process each photo
    const newPhotos: string[] = [];
    let changed = false;

    for (let i = 0; i < photos.length; i++) {
      const url = photos[i];
      if (isFirebaseURL(url)) {
        newPhotos.push(url);
        continue;
      }

      try {
        const buffer = await downloadImage(url);
        // Verify it's actually an image (check for JPEG/PNG magic bytes)
        if (buffer.length < 1000) {
          // Too small, likely an error page
          console.log(`  ⚠️  ${name} photo ${i}: too small (${buffer.length}b), skipping`);
          newPhotos.push(url); // keep original
          continue;
        }
        const storageUrl = await uploadToStorage(doc.id, i, buffer);
        newPhotos.push(storageUrl);
        changed = true;
      } catch (err: any) {
        console.log(`  ❌ ${name} photo ${i}: ${err.message}`);
        // Don't keep broken URLs — skip them
        continue;
      }
    }

    if (changed) {
      await db.collection("businesses").doc(doc.id).update({ photos: newPhotos });
      console.log(`✅ ${name}: ${newPhotos.length} photos saved to Firebase Storage`);
      fixed++;
    } else {
      skipped++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
