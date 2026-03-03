import { NextResponse } from "next/server";

export const revalidate = 3600; // Cache for 1 hour

export interface InstagramPost {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string;
}

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const fields = "id,media_url,thumbnail_url,permalink,media_type,timestamp";
    const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=12&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.error("Instagram API error:", res.status, await res.text());
      return NextResponse.json({ posts: [] });
    }

    const data = await res.json();
    const posts: InstagramPost[] = (data.data || []).map((p: any) => ({
      id: p.id,
      media_url: p.media_url || p.thumbnail_url || "",
      thumbnail_url: p.thumbnail_url,
      permalink: p.permalink,
      media_type: p.media_type,
      timestamp: p.timestamp,
    }));

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("Instagram fetch failed:", err);
    return NextResponse.json({ posts: [] });
  }
}
