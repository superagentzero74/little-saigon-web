import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Public-profile endpoint for share pages. Firestore rules require auth to read
// /users/{id}, but share links must work for anonymous visitors. This route
// reads via Admin SDK and returns only whitelisted public fields.

let _db: Firestore | null = null;
function db(): Firestore {
  if (!_db) {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: "little-saigon-c055a",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }
    _db = getFirestore();
  }
  return _db;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    const snap = await db().collection("users").doc(userId).get();
    if (!snap.exists) return NextResponse.json({ error: "not found" }, { status: 404 });

    const d = snap.data() || {};
    return NextResponse.json({
      displayName: d.displayName || "Little Saigon User",
      photoURL: d.photoURL || null,
      headline: d.headline || null,
      city: d.city || null,
      state: d.state || null,
      profileImages: d.profileImages || null,
      reviewCount: d.reviewCount || 0,
      checkInCount: d.checkInCount || 0,
      followerCount: d.followerCount || 0,
      followingCount: d.followingCount || 0,
      favoriteSpots: d.favoriteSpots || null,
    });
  } catch (e) {
    console.error("public-profile error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
