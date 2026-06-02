import { NextResponse } from "next/server";
import { getUpcomingFixtures } from "../../../../lib/sportsData";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  try {
    const fixtures = await getUpcomingFixtures(28);
    return NextResponse.json({
      fixtures,
      source: process.env.FOOTBALL_DATA_API_KEY
        ? "openligadb+football-data.org+thesportsdb"
        : "openligadb+thesportsdb",
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error("fixtures API:", err);
    return NextResponse.json({ fixtures: [], error: err.message }, { status: 500 });
  }
}
