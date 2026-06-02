import { NextResponse } from "next/server";
import { buildOnChainLeaderboard } from "../../../lib/leaderboardIndex";

export const dynamic = "force-dynamic";

let cache = { data: null, at: 0 };
const TTL = 60_000;

export async function GET(request) {
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") || 50), 100);
  const now = Date.now();

  if (cache.data && now - cache.at < TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const payload = await buildOnChainLeaderboard(limit);
    cache = { data: payload, at: now };
    return NextResponse.json(payload);
  } catch (err) {
    console.error("leaderboard API:", err);
    return NextResponse.json(
      { rows: [], error: err.message, updatedAt: now },
      { status: 500 }
    );
  }
}
