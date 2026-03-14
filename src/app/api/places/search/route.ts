import { NextRequest, NextResponse } from "next/server";

// Center of Little Saigon area (Westminster / Garden Grove / Fountain Valley / Santa Ana)
const LITTLE_SAIGON_LAT = 33.7500;
const LITTLE_SAIGON_LNG = -117.9940;
const RADIUS_METERS = 4828; // ~3 miles

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${LITTLE_SAIGON_LAT},${LITTLE_SAIGON_LNG}&radius=${RADIUS_METERS}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data);
}
