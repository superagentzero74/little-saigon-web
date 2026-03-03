import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId");
  if (!placeId) return NextResponse.json({ error: "placeId required" }, { status: 400 });

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const fields = [
    "name", "formatted_address", "formatted_phone_number", "website",
    "rating", "user_ratings_total", "price_level",
    "geometry", "place_id", "opening_hours", "types",
  ].join(",");
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data);
}
