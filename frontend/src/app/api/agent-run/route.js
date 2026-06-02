// frontend/src/app/api/agent-run/route.js
import { NextResponse } from "next/server";

/**
 * POST /api/agent-run
 * Secured with CRON_SECRET header
 * Body: { users: [{ address, riskLevel, budget }] }
 *
 * Dynamically imports the betting agent at runtime (server-side only).
 */
export async function POST(request) {
  // Security: only allow calls with the secret
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { users } = body;

  if (!Array.isArray(users) || !users.length) {
    return NextResponse.json({ error: "users array required" }, { status: 400 });
  }

  const agentKey = process.env.AGENT_PRIVATE_KEY;
  const marketAddr = process.env.NEXT_PUBLIC_MARKET_ADDRESS;
  const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";

  if (!agentKey || !marketAddr) {
    return NextResponse.json({ error: "Agent not configured (missing env vars)" }, { status: 500 });
  }

  try {
    // Dynamic import to avoid bundling heavy server-only code into the client
    const { ArcMarketsAgent } = await import("../../../agent/ArcMarketsAgent.js");
    const { PREDICTION_MARKET_ABI } = await import("../../../utils/abis.js");

    const agent = new ArcMarketsAgent(rpcUrl, agentKey, marketAddr, PREDICTION_MARKET_ABI);

    const userProfiles = users.map((u) => ({
      address: u.address,
      riskLevel: u.riskLevel || "moderate",
      budget: Number(u.budget) || 0,
      maxBetPercent: u.riskLevel === "aggressive" ? 0.2 : u.riskLevel === "conservative" ? 0.05 : 0.1,
    }));

    const actions = await agent.runCycle(userProfiles);

    const betsPlaced = actions.filter(a => a.type === "BET_PLACED").length;
    const skipped = actions.filter(a => a.type === "SKIPPED").length;
    const errors = actions.filter(a => a.type === "ERROR").length;

    return NextResponse.json({
      success: true,
      summary: { betsPlaced, skipped, errors, total: actions.length },
      actions,
    });

  } catch (err) {
    console.error("Agent run error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
