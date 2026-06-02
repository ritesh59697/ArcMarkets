// frontend/src/app/api/agent-analysis/route.js
import { NextResponse } from "next/server";

/**
 * POST /api/agent-analysis
 * Body: { matchIndex, homeTeam, awayTeam, riskLevel, budget, contractOdds }
 * Returns AI agent analysis for a given match.
 */
export async function POST(request) {
  const body = await request.json();
  const { matchIndex, homeTeam, awayTeam, riskLevel, budget, contractOdds } = body;

  try {
    // Dynamic import to keep ArcMarketsAgent server-side only
    const { getAgentAnalysis } = await import("../../../agent/ArcMarketsAgent.js");

    const analysis = await getAgentAnalysis(
      matchIndex ?? 0, homeTeam, awayTeam, riskLevel, Number(budget), contractOdds
    );
    return NextResponse.json({ success: true, analysis });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}