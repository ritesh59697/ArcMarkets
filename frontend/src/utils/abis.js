// ─── PredictionMarket ABI ─────────────────────────────────────────────────────
export const PREDICTION_MARKET_ABI = [
  // Read
  "function getMatchCount() view returns (uint256)",
  "function getMatch(uint256 idx) view returns (tuple(string homeTeam, string awayTeam, string matchId, uint256 kickoffTime, uint256 totalPool, uint256[4] outcomePools, uint8 result, uint8 status))",
  "function getBet(uint256 betId) view returns (tuple(address bettor, uint256 matchIndex, uint8 outcome, uint256 amount, bool claimed, uint256 timestamp, bool isAgentBet))",
  "function getUserBetsForMatch(uint256 matchIndex, address user) view returns (uint256[])",
  "function getOdds(uint256 matchIndex) view returns (uint256 homeOdds, uint256 drawOdds, uint256 awayOdds)",
  "function getPotentialPayout(uint256 matchIndex, uint8 outcome, uint256 amount) view returns (uint256)",
  "function agentBudget(address user) view returns (uint256)",
  "function userAgent(address user) view returns (address)",
  "function authorizedAgents(address agent) view returns (bool)",

  // Write
  "function placeBet(uint256 matchIndex, uint8 outcome, uint256 amount) returns (uint256)",
  "function agentPlaceBet(address user, uint256 matchIndex, uint8 outcome, uint256 amount) returns (uint256)",
  "function claimWinnings(uint256 betId)",
  "function claimAll(uint256 matchIndex)",
  "function authorizeMyAgent(address agent, uint256 budget)",
  "function updateAgentBudget(uint256 additionalBudget)",
  "function revokeAgent()",

  // Events
  "event BetPlaced(uint256 indexed betId, address indexed bettor, uint256 matchIndex, uint8 outcome, uint256 amount, bool isAgentBet)",
  "event WinningsClaimed(address indexed bettor, uint256 betId, uint256 payout)",
  "event MarketResolved(uint256 indexed matchIndex, uint8 result)",
  "event AgentAuthorized(address indexed user, address indexed agent, uint256 budget)",
];

// ─── BetReceiptNFT ABI ────────────────────────────────────────────────────────
export const BET_RECEIPT_NFT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function receipts(uint256 tokenId) view returns (tuple(string homeTeam, string awayTeam, uint8 outcome, uint256 amount, uint256 kickoffTime, uint256 betId))",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

// ─── ERC20 (USDC) ABI ─────────────────────────────────────────────────────────
export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];
