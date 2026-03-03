import { NextRequest, NextResponse } from "next/server";
import type { PhotoTag } from "@/lib/types";

function labelsToTag(labels: string[]): PhotoTag {
  const lower = labels.map((l) => l.toLowerCase());
  // Order matters: check menu first (menus contain food labels too)
  if (lower.some((l) => /\bmenu\b|price list|signage/.test(l))) return "menu";
  if (lower.some((l) => /drink|beverage|coffee|tea|juice|beer|wine|cocktail|boba|bubble tea|smoothie/.test(l))) return "drinks";
  if (lower.some((l) => /food|dish|cuisine|meal|ingredient|recipe|plate|bowl|chopstick|noodle|soup|rice|bread|dessert|tableware|eating/.test(l))) return "food";
  if (lower.some((l) => /facade|exterior|building|architecture|street|sky|parking|outdoor|outside|storefront|sidewalk/.test(l))) return "outside";
  if (lower.some((l) => /interior|furniture|room|ceiling|chair|table|sofa|decor|indoor|restaurant interior|dining room/.test(l))) return "inside";
  return "other";
}

export async function POST(request: NextRequest) {
  const { urls } = await request.json() as { urls: string[] };
  if (!urls?.length) return NextResponse.json({ tags: [] });

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  // Batch all images in a single Vision API request
  const requests = urls.map((url) => ({
    image: { source: { imageUri: url } },
    features: [{ type: "LABEL_DETECTION", maxResults: 10 }],
  }));

  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      }
    );
    const data = await res.json();

    const tags: PhotoTag[] = (data.responses || []).map((r: any) => {
      const labels: string[] = (r.labelAnnotations || []).map((a: any) => a.description as string);
      return labelsToTag(labels);
    });

    return NextResponse.json({ tags });
  } catch {
    // If Vision API fails, return "other" for all
    return NextResponse.json({ tags: urls.map(() => "other") });
  }
}
