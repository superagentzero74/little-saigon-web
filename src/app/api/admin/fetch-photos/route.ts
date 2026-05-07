import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const BUCKET = "little-saigon-c055a.firebasestorage.app";
const PROJECT = "little-saigon-c055a";

export async function POST(request: NextRequest) {
  try {
    const { businessId, placeId } = await request.json();
    if (!businessId || !placeId) {
      return NextResponse.json({ error: "businessId and placeId required" }, { status: 400 });
    }

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) {
      return NextResponse.json({ error: "Google Maps key not configured" }, { status: 500 });
    }

    // 1. Get place details with photo references
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${key}`
    );
    const detailsData = await detailsRes.json();
    const photoRefs = detailsData.result?.photos || [];

    if (photoRefs.length === 0) {
      return NextResponse.json({ error: "No photos from Google Places" }, { status: 404 });
    }

    // 2. Download 1-2 photos, upload via Storage REST API
    const maxPhotos = Math.min(photoRefs.length, 2);
    const urls: string[] = [];

    for (let i = 0; i < maxPhotos; i++) {
      const photoRef = photoRefs[i].photo_reference;
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photoreference=${photoRef}&key=${key}`;

      try {
        const imgRes = await fetch(photoUrl, { redirect: "follow" });
        if (!imgRes.ok) continue;

        const buffer = await imgRes.arrayBuffer();
        if (buffer.byteLength < 500) continue;

        // Upload to Firebase Storage via REST
        const storagePath = `businesses/${businessId}/photos/card_${i}.jpg`;
        const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storagePath)}`;

        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: new Uint8Array(buffer),
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          const token = uploadData.downloadTokens;
          urls.push(
            `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`
          );
        }
      } catch {
        continue;
      }
    }

    if (urls.length === 0) {
      return NextResponse.json({ error: "Could not upload photos" }, { status: 500 });
    }

    // 3. Update Firestore via REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/businesses/${businessId}?updateMask.fieldPaths=photos&updateMask.fieldPaths=active&key=${key}`;
    const firestoreBody = {
      fields: {
        photos: {
          arrayValue: {
            values: urls.map((u) => ({ stringValue: u })),
          },
        },
        active: {
          booleanValue: true,
        },
      },
    };

    await fetch(firestoreUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(firestoreBody),
    });

    return NextResponse.json({ success: true, count: urls.length, urls });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
