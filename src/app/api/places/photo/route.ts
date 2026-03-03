import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const maxwidth = request.nextUrl.searchParams.get("maxwidth") || "800";
  if (!ref) return NextResponse.json({ error: "ref required" }, { status: 400 });

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${ref}&key=${key}`;
  // Google Places Photo API redirects to the actual CDN image URL
  const res = await fetch(url, { redirect: "follow" });
  return NextResponse.json({ url: res.url });
}
