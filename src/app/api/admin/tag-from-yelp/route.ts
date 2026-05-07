import { NextRequest, NextResponse } from "next/server";

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export async function POST(request: NextRequest) {
  try {
    const { placeNames, businesses: clientBusinesses } = await request.json();
    if (!placeNames?.length) return NextResponse.json({ error: "no search results provided" }, { status: 400 });
    if (!clientBusinesses?.length) return NextResponse.json({ error: "no businesses provided" }, { status: 400 });

    // Match search results to businesses by normalized name
    const matched: { id: string; name: string; sourceName: string }[] = [];
    const matchedIds = new Set<string>();
    const unmatched: { name: string; address: string }[] = [];

    for (const pr of placeNames as { name: string; address: string }[]) {
      const placeNorm = normalize(pr.name);
      const match = clientBusinesses.find((b: any) => {
        if (matchedIds.has(b.id)) return false;
        const bizNorm = normalize(b.name || "");
        return bizNorm === placeNorm ||
          bizNorm.includes(placeNorm) ||
          placeNorm.includes(bizNorm);
      });

      if (match) {
        matchedIds.add(match.id);
        matched.push({
          id: match.id,
          name: match.name,
          sourceName: pr.name,
        });
      } else {
        unmatched.push(pr);
      }
    }

    return NextResponse.json({ matched, unmatched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
