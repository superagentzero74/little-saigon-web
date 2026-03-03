import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  // Restrict results to California
  const caQuery = /california|,\s*ca\b/i.test(query) ? query : `${query}, California`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(caQuery)}&components=country:us&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  return NextResponse.json(data);
}
