import { NextRequest, NextResponse } from "next/server";

// Center of Little Saigon area (Westminster / Garden Grove / Fountain Valley / Santa Ana).
// Radius covers the broader Vietnamese-American footprint in OC: Westminster, Garden
// Grove, Fountain Valley, Santa Ana, Anaheim, Orange, Tustin, Fullerton, Huntington
// Beach, Costa Mesa, Irvine, Brea, Stanton.
const LITTLE_SAIGON_LAT = 33.7500;
const LITTLE_SAIGON_LNG = -117.9940;
const RADIUS_METERS = 20000; // ~12.4 miles

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  const pageToken = request.nextUrl.searchParams.get("pagetoken");
  if (!query && !pageToken) return NextResponse.json({ error: "query required" }, { status: 400 });

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const params = pageToken
    ? `pagetoken=${pageToken}&key=${key}`
    : `query=${encodeURIComponent(query!)}&location=${LITTLE_SAIGON_LAT},${LITTLE_SAIGON_LNG}&radius=${RADIUS_METERS}&key=${key}`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data);
}
