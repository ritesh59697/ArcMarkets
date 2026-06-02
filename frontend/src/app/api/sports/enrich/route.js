import { NextResponse } from "next/server";
import { enrichOnChainMatches } from "../../../../lib/sportsData";
import { getCryptoLogo } from "../../../../utils/marketAssets";

export const dynamic = "force-dynamic";
export const revalidate = 120;

export async function POST(request) {
  try {
    const body = await request.json();
    const matches = body.matches || [];
    const enriched = await enrichOnChainMatches(matches);

    const withImages = enriched.map((m) => ({
      ...m,
      homeImage: getCryptoLogo(m.homeTeam) || m.homeCrest || null,
      awayImage: getCryptoLogo(m.awayTeam) || m.awayCrest || null,
    }));

    return NextResponse.json({ matches: withImages, updatedAt: Date.now() });
  } catch (err) {
    console.error("enrich API:", err);
    return NextResponse.json({ matches: [], error: err.message }, { status: 500 });
  }
}
