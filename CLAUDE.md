# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

ArcMarkets is a decentralized parimutuel prediction market deployed on the Arc Testnet (chain ID `5042002`), a network with a native-USDC gas model. It has two halves:

- **Root workspace** (`/`): Hardhat project — Solidity contracts, deploy/admin scripts.
- **`frontend/`**: Next.js 16 (App Router, React 19) DApp that reads/writes the contracts directly from the browser via ethers.js/wagmi/viem, plus a few server-side API routes.

Both are pnpm workspace packages (see `pnpm-workspace.yaml`); a single `pnpm install` at the repo root installs both.

## Commands

### Root (Hardhat / contracts)

```bash
pnpm install                 # installs root + frontend workspaces
npx hardhat compile          # compile contracts (also: pnpm compile)
npx hardhat node             # local Hardhat node (also: pnpm node)
pnpm deploy:local            # deploy to local Hardhat node
pnpm deploy:testnet          # deploy to Arc Testnet, writes deployment.json
```

There is no automated test suite (`pnpm test` in the root `package.json` is a stub that exits non-zero) and no lint script at the root — don't assume either exists.

Admin/operational scripts are run directly with `npx hardhat run scripts/<name>.js --network arcTestnet` (or `--network localhost`). Some take env vars, e.g.:

```bash
npx hardhat run scripts/check-contracts.js --network arcTestnet
npx hardhat run scripts/add-live-matches.js --network arcTestnet
AGENT=0xYourAgentAddress npx hardhat run scripts/authorize-agent.js --network arcTestnet
MATCH_INDEX=0 RESULT=1 npx hardhat run scripts/resolve-match.js --network arcTestnet
```

Other scripts worth knowing about: `create-match.js`, `resolve-all-live.js`, `fund-agent.js`, `check-matches.js`, `check-user-bets.js`, `check-min-bet.js`, `recreate-gold-match.js`, `seed-world-cup.js`.

### Frontend

```bash
cd frontend
pnpm dev      # Next.js dev server (turbopack) at http://localhost:3000
pnpm build
pnpm start
pnpm lint     # eslint (eslint-config-next core-web-vitals)
```

There is no frontend test suite either.

### Environment

Two separate env files are required and are gitignored:

- Root `.env`: `PRIVATE_KEY` (deployer), `USDC_ADDRESS`, optional `ARC_RPC_URL`.
- `frontend/.env.local`: `NEXT_PUBLIC_ARC_RPC_URL`, `NEXT_PUBLIC_USDC_ADDRESS`, `NEXT_PUBLIC_MARKET_ADDRESS`, `NEXT_PUBLIC_NFT_ADDRESS`, plus (for the server-side agent routes) `AGENT_PRIVATE_KEY`/`PRIVATE_KEY` and `CRON_SECRET`.

`frontend/src/utils/config.js` hardcodes the currently-deployed contract addresses as fallbacks (`DEPLOYED`), so the UI works even without `.env.local`. `deployment.json` at the repo root is the source of truth written by `scripts/deploy.js` and should be kept in sync with those fallbacks and with the README's "Deployed Contracts" table when a new deploy happens.

`/artifacts` and `/cache` at the repo root are Hardhat build output (gitignored) — never hand-edit them; they regenerate from `npx hardhat compile`.

## Contract architecture

Three Solidity contracts in `contracts/` (Solidity 0.8.20, optimizer + viaIR enabled):

- **`PredictionMarket.sol`** — the core contract. Owner-gated match lifecycle (`createMatch` → `lockMarket` → `resolveMarket`/`cancelMarket`), USDC parimutuel pools per match/outcome, bet placement/claiming, and an on-chain agent-delegation system (`authorizeAgent` (owner whitelists an agent wallet) → user calls `authorizeMyAgent` to escrow a USDC budget and grant that agent wallet spending rights → agent wallet calls `agentPlaceBet` on the user's behalf → user can `revokeAgent` any time to instantly reclaim the remaining escrow). Odds and payouts are computed from pool ratios (see `getOdds`/`getPotentialPayout`), not an order book. A 2% platform fee (`PLATFORM_FEE`/`BASIS_POINTS`) is taken from the pool at resolution.
- **`BetReceiptNFT.sol`** — ERC-721 minted on every bet (`mintReceipt`, called internally by `PredictionMarket._placeBet`); generates a fully on-chain, Base64-encoded SVG receipt — no off-chain metadata server.
- **`MockUSDT.sol`** — mock ERC-20 for local/Hardhat-node development only; production uses Arc's native USDC predeploy at `0x3600000000000000000000000000000000000000`.

Key invariant: all monetary values are USDC with 6 decimals (`MIN_BET = 1e4` = 0.01 USDC, `MAX_BET = 1000e6`). Odds/payout math uses basis points (`10000` = 1x).

## Frontend architecture

- **`src/utils/config.js` / `src/utils/contracts.js` / `src/utils/abis.js`** — single source of truth for network config, deployed addresses, and contract ABIs. Read from here rather than hardcoding addresses in components.
- **`src/utils/config.js`'s `getRpcProvider`/`runWithRpcFallback`** — all direct-RPC reads should go through this (or the `/api/rpc` proxy, see below) rather than constructing a raw `ethers.JsonRpcProvider` ad hoc, since it centralizes fallback/retry behavior.
- **`src/app/api/rpc/route.js`** — a server-side JSON-RPC proxy with a 3s in-memory cache for read-only calls (`eth_call`/`eth_blockNumber`) and RPC-endpoint fallback. Exists to dodge browser CORS and to batch/dedupe hook reads; when adding new read-heavy hooks, prefer routing through here rather than hitting the public RPC directly from the client.
- **`src/hooks/`** — the data layer for React components: `useWallet` (raw injected-provider wallet connection, wagmi-independent), `useMatches`, `useEnrichedMatches` (merges on-chain match data with live sports-API data), `useBetting`, `useUserBets`, `useLeaderboard`, `useAgent`, `useUSDT`.
- **`src/app/providers.js`** — the wagmi/RainbowKit wallet stack (separate from `hooks/useWallet.js`'s manual injected-provider approach — both exist; `WalletContext` from `providers.js` is the one wired into the app via `WalletBridge`). Defines the Arc Testnet chain for wagmi/viem.
- **`src/agent/ArcMarketsAgent.js`** — the Kelly Criterion / FIFA-rating-based betting engine used by the "delegated AI agent" flow. `analyzeMatch`/`computeRecommendation`/`runCycle` compute expected value per outcome from static `TEAM_RATINGS` and place bets via `agentPlaceBet`. Note there are currently two parallel implementations of this recommendation logic: this class (used by `api/agent-run`) and inline logic duplicated in `api/agent/route.js` (used by `api/agent`) — keep both in sync if you change the EV/Kelly/risk-profile math, or consolidate them.
- **API routes** (`src/app/api/`):
  - `agent/route.js` — on-demand single-user agent cycle triggered from the UI (verifies on-chain agent authorization, computes recommendations inline, executes bets).
  - `agent-run/route.js` — batch/cron-style agent cycle for multiple users, gated by an `x-cron-secret` header matching `CRON_SECRET`; delegates to `ArcMarketsAgent`.
  - `agent-analysis/route.js` — read-only analysis/recommendation preview (no tx execution).
  - `sports/fixtures`, `sports/enrich` — live sports fixture data used to enrich on-chain matches for display.
  - `leaderboard/route.js` — backs `useLeaderboard`/`src/lib/leaderboardIndex.js`, which reconstructs leaderboard stats by chunked `queryFilter` scans (9000-block chunks) over contract events rather than a database/indexer.
  - `rpc/route.js` — see above.
- **`src/docs/`** — Markdown copies of the root `README.md`/`HOW_IT_WORKS.md`/`WHITEPAPER.md`/`SUMMARY.md`, rendered in-app via `MarkdownRenderer.js` at `/docs` and `/whitepaper`. If you edit the root docs, check whether the copies under `src/docs/` need the same update (they are not symlinked/generated).

## Conventions to know

- No test suite exists in either package; don't assume `pnpm test` does anything meaningful, and don't add tests unless asked.
- The frontend has no `.js`/`.jsx` split convention beyond what's shown — components and hooks are plain `.js` files (not `.jsx`/`.tsx`), consistent with `jsconfig.json` (JS project, not TypeScript).
- Contract addresses/ABIs are duplicated in a few places (`utils/config.js`, `utils/contracts.js`, `deployment.json`, README, `.env.example`) because there's no shared config-generation step from `deployment.json` — update all of them together after a redeploy.
