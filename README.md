# ApexMarkets: Decentralized Prediction Markets Built on Arc Network

[![Live App](https://img.shields.io/badge/Live_App-arc--markets--nine.vercel.app-00d4ff?style=flat-square&logo=vercel)](https://arc-markets-nine.vercel.app)
[![Demo Video](https://img.shields.io/badge/Demo_Video-YouTube-ff0000?style=flat-square&logo=youtube)](https://youtu.be/2w3pnFuFAhI)
[![Network](https://img.shields.io/badge/Network-Arc_Network_Testnet-7b2ff7?style=flat-square)](https://rpc.testnet.arc.network)
[![Gas Token](https://img.shields.io/badge/Gas-USDC_Native-00d4ff?style=flat-square)](https://testnet.arcscan.app)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)
[![Hardhat](https://img.shields.io/badge/Built_with-Hardhat-f0d060?style=flat-square)](https://hardhat.org)

ApexMarkets is a fully on-chain, peer-to-peer prediction protocol built on **Arc Network**. By leveraging Arc Network's native USDC gas model, participants can deposit funds, place wagers, and settle transaction fees entirely in USDC — eliminating the traditional onboarding friction associated with maintaining a separate native gas token.

---

## 🔗 Links & Resources

- 🌐 **Live DApp**: [https://arc-markets-nine.vercel.app](https://arc-markets-nine.vercel.app)
- 🎬 **Demo Video**: [Watch Walkthrough on YouTube](https://youtu.be/2w3pnFuFAhI)
- 📄 **Whitepaper**: [WHITEPAPER.md](./WHITEPAPER.md)

---

## Table of Contents

- [Links & Resources](#-links--resources)
- [Key Innovations](#key-innovations)
- [How it Works](#how-it-works)
- [Architecture Overview](#architecture-overview)
- [Deployed Contracts](#deployed-contracts)
- [Quick Start](#quick-start)
- [Hardhat Scripts Reference](#hardhat-scripts-reference)
- [Interaction Flows](#interaction-flows)
- [Technical Documentation](#technical-documentation)

---

## Key Innovations

### Dynamic Parimutuel Pooling

All wagers on a given event consolidate into a single unified on-chain liquidity pool. Odds adjust continuously in real time based on the distribution of capital across outcomes:

$$\text{Odds}_i = \frac{\text{Total Pool} \times (1 - \text{Fee})}{\text{Outcome Pool}_i}$$

This eliminates the need for direct counterparties and ensures that every participant competes against the aggregate market rather than a house edge.

### Escrowed AI Agent Delegation

Users escrow a USDC budget directly on-chain and authorize an off-chain AI agent to analyze live sports fixtures using FIFA strength ratings. The agent autonomously identifies positive expected-value opportunities and sizes wagers using the **Kelly Criterion** — without ever requiring access to user private keys. Budget revocation is instant and fully user-controlled.

### 100% On-Chain SVG NFT Receipts

Every confirmed wager mints an ERC-721 token containing a fully on-chain SVG receipt generated directly by the smart contract. Bet amount, teams, prediction outcome, and transaction timestamp are Base64-encoded on-chain — ensuring permanent, decentralized visual provenance for every prediction.

---

## How it Works

Participating in ApexMarkets is designed to be seamless. You can make predictions manually or delegate to the AI Betting Agent to place trades automatically.

### Option A: Manual Predictions
1. **Connect Wallet**: Click **Connect Wallet** in the top right to link your Web3 wallet (configured for Arc Network Testnet).
2. **Select a Match**: Browse the **Markets** tab to view list of active sports fixtures or price matchups.
3. **Choose an Outcome**:
   * For Sports: Select **Home**, **Draw**, or **Away**.
   * For Crypto: Select **Yes** (above benchmark price) or **No** (below benchmark price).
4. **Enter Wager**: Input the amount of USDC you wish to bet. The dynamic odds and potential payout will update automatically based on current pool distributions.
5. **Confirm and Claim**: Approve the transaction. You will instantly be minted an **on-chain SVG NFT Receipt** containing your receipt data. Once the match finishes, return to your **Portfolio** to claim your share of the pool if your prediction was correct.

### Option B: Escrowed AI Agent Prediction (Delegated Mode)
1. **Authorize Agent**: Navigate to the **AI Agent** tab and authorize the delegated AI Betting Agent contract to place wagers on your behalf.
2. **Fund Escrow**: Deposit a USDC budget into the prediction market escrow contract. The agent can only bet using this balance.
3. **Set Risk Profile**: Select your risk preference:
   * **Conservative**: Smaller wagers, highly selective EV threshold.
   * **Moderate**: Standard Kelly Criterion fraction sizing.
   * **Aggressive**: Maximum Kelly sizing for higher returns.
4. **Autonomous Execution**: The AI Agent runs 24/7, fetching live FIFA strength ratings and historical stats to find positive expected-value opportunities. It executes bets and logs every transaction in the client console in real time.
5. **Revoke Anytime**: You retain full sovereignty. You can revoke authorization or withdraw your remaining escrow budget instantly at any time.

---

## Architecture Overview

```
ArcMarkets/
├── contracts/
│   ├── PredictionMarket.sol     # Core parimutuel pooling and USDC budget escrow
│   ├── BetReceiptNFT.sol        # On-chain dynamic SVG receipt ERC-721 generator
│   └── MockUSDT.sol             # Mock ERC-20 token for local development and testing
├── scripts/
│   ├── deploy.js                # Contract compilation and deployment
│   ├── create-match.js          # Admin: create a new match fixture
│   ├── resolve-match.js         # Admin: resolve match outcome and trigger payouts
│   ├── add-live-matches.js      # Seed live fixture data for testing
│   ├── resolve-all-live.js      # Batch settlement utility for seeded fixtures
│   ├── authorize-agent.js       # Whitelist an AI agent wallet address
│   ├── fund-agent.js            # Fund an agent's escrow balance
│   ├── check-contracts.js       # Validate deployment state and addresses
│   └── check-min-bet.js         # Validate betting limit configurations
├── frontend/
│   ├── src/
│   │   ├── agent/               # ArcMarketsAgent.js — Kelly Criterion client engine
│   │   ├── app/                 # Next.js layout, API routes, and page views
│   │   ├── hooks/               # Custom React hooks: useMatches, useWallet, useAgent
│   │   └── utils/               # ethers.js client configs and contract ABIs
│   └── package.json
├── hardhat.config.js            # Hardhat configuration with Arc Testnet network settings
├── WHITEPAPER.md                # In-depth mathematical and engineering specification
└── package.json                 # Root Hardhat workspace configuration
```

---

## Deployed Contracts

All contracts are live on the **Arc Testnet** (Chain ID: `5042002`):

| Contract | Address | Explorer |
|---|---|---|
| **PredictionMarket** | `0xbE2bf8f1c34a0517Dfd8732d4b8A82056DB539B4` | [View on Arcscan](https://testnet.arcscan.app/address/0xbE2bf8f1c34a0517Dfd8732d4b8A82056DB539B4) |
| **BetReceiptNFT** | `0xEfDdb2C5788E426d0AE18a62B74a84A8c86972dE` | [View on Arcscan](https://testnet.arcscan.app/address/0xEfDdb2C5788E426d0AE18a62B74a84A8c86972dE) |
| **USDC Predeploy** | `0x3600000000000000000000000000000000000000` | [View on Arcscan](https://testnet.arcscan.app/address/0x3600000000000000000000000000000000000000) |

---

## Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **MetaMask** or any EIP-1193-compatible wallet configured for Arc Testnet
- Testnet USDC from the [Circle Faucet](https://faucet.circle.com/) (select Arc Testnet)

### 1. Install Dependencies

```bash
# Install all workspace dependencies at once (both Root and Frontend)
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
PRIVATE_KEY=your_deployer_private_key_here
USDC_ADDRESS=0x3600000000000000000000000000000000000000
```

Create `frontend/.env.local` for the client DApp:

```env
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_MARKET_ADDRESS=0xbE2bf8f1c34a0517Dfd8732d4b8A82056DB539B4
NEXT_PUBLIC_NFT_ADDRESS=0xEfDdb2C5788E426d0AE18a62B74a84A8c86972dE
```

### 3. Launch the DApp

```bash
cd frontend
pnpm dev
```

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## Hardhat Scripts Reference

```bash
# Compile all smart contracts
npx hardhat compile

# Deploy contracts to Arc Testnet (updates deployment.json)
npx hardhat run scripts/deploy.js --network arcTestnet

# Verify deployment addresses and configuration
npx hardhat run scripts/check-contracts.js --network arcTestnet

# Seed initial match fixtures
npx hardhat run scripts/add-live-matches.js --network arcTestnet

# Authorize an AI agent wallet address
AGENT=0xYourAgentAddress npx hardhat run scripts/authorize-agent.js --network arcTestnet

# Resolve a match and distribute payouts
MATCH_INDEX=0 RESULT=1 npx hardhat run scripts/resolve-match.js --network arcTestnet
```

---

## Interaction Flows

### Standard Betting Flow

```mermaid
sequenceDiagram
    actor User as User Wallet
    participant Contract as PredictionMarket (On-Chain)
    participant NFT as BetReceiptNFT (On-Chain)

    User->>Contract: placeBet(matchIndex, outcome, amount)
    Note over User,Contract: Requires prior USDC ERC-20 approval
    Contract->>Contract: Update parimutuel pool allocation
    Contract->>NFT: mintReceipt(user, betId, matchDetails)
    NFT-->>User: Transfer BetReceipt NFT
```

### AI Agent Delegation Flow

```mermaid
sequenceDiagram
    actor User as User Wallet
    participant Contract as PredictionMarket (On-Chain)
    participant Agent as ApexMarketsAgent (Client)

    User->>Contract: authorizeMyAgent(agentWallet, budget)
    Note over User,Contract: USDC transferred to on-chain escrow
    loop Match Analysis Cycle
        Agent->>Contract: getMatch() & getOdds()
        Agent->>Agent: Compute Kelly sizing via FIFA EV model
    end
    Agent->>Contract: agentPlaceBet(user, matchIndex, outcome, amount)
    Contract->>Contract: Validate agent, deduct budget, register bet
    Contract-->>User: Mint BetReceipt NFT
```

---

## Brand & Infrastructure Notice

**ApexMarkets** is an independent prediction market application built on top of **Arc Network**. Arc Network is blockchain infrastructure developed by Circle. ApexMarkets is not affiliated with, endorsed by, or sponsored by Circle or the Arc Network team. All brand assets, logos, and network names are used purely to describe the underlying infrastructure supporting the protocol.

---

*Built on Arc Network.*
