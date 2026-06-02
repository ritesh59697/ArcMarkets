// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./BetReceiptNFT.sol";

/**
 * @title ArcMarkets Prediction Market
 * @notice Sports and crypto prediction markets deployed on Arc Testnet.
 * @dev Users bet USDC on match outcomes; AI agent can bet on behalf of users.
 */
contract PredictionMarket is Ownable, ReentrancyGuard {

    IERC20 public immutable usdc;
    BetReceiptNFT public immutable betNFT;

    uint256 public constant MIN_BET = 1e4;        // 0.01 USDC (6 decimals)
    uint256 public constant MAX_BET = 1000e6;     // 1000 USDC
    uint256 public constant PLATFORM_FEE = 200;   // 2% (basis points)
    uint256 public constant BASIS_POINTS = 10000;

    enum Outcome { NONE, HOME_WIN, DRAW, AWAY_WIN }
    enum MarketStatus { OPEN, LOCKED, RESOLVED, CANCELLED }

    struct Match {
        string homeTeam;
        string awayTeam;
        string matchId;        // External ID from football API
        uint256 kickoffTime;
        uint256 totalPool;
        uint256[4] outcomePools; // indexed by Outcome enum
        Outcome result;
        MarketStatus status;
    }

    struct Bet {
        address bettor;
        uint256 matchIndex;
        Outcome outcome;
        uint256 amount;
        bool claimed;
        uint256 timestamp;
        bool isAgentBet;       // placed by AI agent
    }

    Match[] public matches;
    Bet[] public bets;

    // matchIndex => user => betIds
    mapping(uint256 => mapping(address => uint256[])) public userMatchBets;
    // authorized AI agents
    mapping(address => bool) public authorizedAgents;
    // user => agent address they've authorized
    mapping(address => address) public userAgent;
    // user => agent budget in USDC
    mapping(address => uint256) public agentBudget;

    uint256 public totalFeesCollected;

    /* ─────────────────── Events ─────────────────── */
    event MatchCreated(uint256 indexed matchIndex, string homeTeam, string awayTeam, uint256 kickoffTime);
    event BetPlaced(uint256 indexed betId, address indexed bettor, uint256 matchIndex, Outcome outcome, uint256 amount, bool isAgentBet);
    event MarketLocked(uint256 indexed matchIndex);
    event MarketResolved(uint256 indexed matchIndex, Outcome result);
    event WinningsClaimed(address indexed bettor, uint256 betId, uint256 payout);
    event AgentAuthorized(address indexed user, address indexed agent, uint256 budget);
    event AgentBudgetUpdated(address indexed user, uint256 newBudget);

    /* ─────────────────── Constructor ─────────────────── */
    constructor(address _usdc, address _betNFT) Ownable() {
        usdc = IERC20(_usdc);
        betNFT = BetReceiptNFT(_betNFT);
    }

    /* ─────────────────── Admin ─────────────────── */

    function createMatch(
        string calldata homeTeam,
        string calldata awayTeam,
        string calldata matchId,
        uint256 kickoffTime
    ) external onlyOwner returns (uint256) {
        require(kickoffTime > block.timestamp, "Kickoff must be in future");
        uint256[4] memory pools;
        matches.push(Match({
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            matchId: matchId,
            kickoffTime: kickoffTime,
            totalPool: 0,
            outcomePools: pools,
            result: Outcome.NONE,
            status: MarketStatus.OPEN
        }));
        uint256 idx = matches.length - 1;
        emit MatchCreated(idx, homeTeam, awayTeam, kickoffTime);
        return idx;
    }

    function lockMarket(uint256 matchIndex) external onlyOwner {
        Match storage m = matches[matchIndex];
        require(m.status == MarketStatus.OPEN, "Not open");
        m.status = MarketStatus.LOCKED;
        emit MarketLocked(matchIndex);
    }

    function resolveMarket(uint256 matchIndex, Outcome result) external onlyOwner {
        require(result != Outcome.NONE, "Invalid result");
        Match storage m = matches[matchIndex];
        require(m.status == MarketStatus.LOCKED, "Not locked");
        m.result = result;
        m.status = MarketStatus.RESOLVED;

        // Collect platform fee
        uint256 fee = (m.totalPool * PLATFORM_FEE) / BASIS_POINTS;
        totalFeesCollected += fee;

        emit MarketResolved(matchIndex, result);
    }

    function cancelMarket(uint256 matchIndex) external onlyOwner {
        Match storage m = matches[matchIndex];
        require(m.status == MarketStatus.OPEN || m.status == MarketStatus.LOCKED, "Cannot cancel");
        m.status = MarketStatus.CANCELLED;
    }

    function authorizeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = true;
    }

    function withdrawFees(address to) external onlyOwner {
        uint256 amount = totalFeesCollected;
        totalFeesCollected = 0;
        require(usdc.transfer(to, amount), "Transfer failed");
    }

    /* ─────────────────── User: Agent Setup ─────────────────── */

    /**
     * @notice Authorize an AI agent to bet on your behalf
     * @param agent The agent wallet address
     * @param budget Max USDC the agent can spend (must pre-approve contract)
     */
    function authorizeMyAgent(address agent, uint256 budget) external {
        require(authorizedAgents[agent], "Not a valid agent");
        require(budget >= MIN_BET, "Budget too low");
        userAgent[msg.sender] = agent;
        agentBudget[msg.sender] = budget;
        // Transfer budget to contract escrow
        require(usdc.transferFrom(msg.sender, address(this), budget), "Budget transfer failed");
        emit AgentAuthorized(msg.sender, agent, budget);
    }

    function updateAgentBudget(uint256 additionalBudget) external {
        require(userAgent[msg.sender] != address(0), "No agent set");
        agentBudget[msg.sender] += additionalBudget;
        require(usdc.transferFrom(msg.sender, address(this), additionalBudget), "Transfer failed");
        emit AgentBudgetUpdated(msg.sender, agentBudget[msg.sender]);
    }

    function revokeAgent() external {
        address agent = userAgent[msg.sender];
        require(agent != address(0), "No agent set");
        uint256 remaining = agentBudget[msg.sender];
        userAgent[msg.sender] = address(0);
        agentBudget[msg.sender] = 0;
        if (remaining > 0) {
            require(usdc.transfer(msg.sender, remaining), "Refund failed");
        }
    }

    /* ─────────────────── Betting ─────────────────── */

    function placeBet(
        uint256 matchIndex,
        Outcome outcome,
        uint256 amount
    ) external nonReentrant returns (uint256 betId) {
        betId = _placeBet(msg.sender, matchIndex, outcome, amount, false);
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }

    /**
     * @notice Called by AI agent on behalf of user
     * @param user The user whose budget to use
     */
    function agentPlaceBet(
        address user,
        uint256 matchIndex,
        Outcome outcome,
        uint256 amount
    ) external nonReentrant returns (uint256 betId) {
        require(authorizedAgents[msg.sender], "Not authorized agent");
        require(userAgent[user] == msg.sender, "Not user's agent");
        require(agentBudget[user] >= amount, "Insufficient agent budget");

        agentBudget[user] -= amount;
        betId = _placeBet(user, matchIndex, outcome, amount, true);
        // Funds already in contract (deposited during authorizeMyAgent)
    }

    function _placeBet(
        address bettor,
        uint256 matchIndex,
        Outcome outcome,
        uint256 amount,
        bool isAgentBet
    ) internal returns (uint256 betId) {
        require(matchIndex < matches.length, "Invalid match");
        require(outcome != Outcome.NONE, "Invalid outcome");
        require(amount >= MIN_BET && amount <= MAX_BET, "Invalid amount");

        Match storage m = matches[matchIndex];
        require(m.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp < m.kickoffTime, "Kickoff passed");

        m.totalPool += amount;
        m.outcomePools[uint256(outcome)] += amount;

        betId = bets.length;
        bets.push(Bet({
            bettor: bettor,
            matchIndex: matchIndex,
            outcome: outcome,
            amount: amount,
            claimed: false,
            timestamp: block.timestamp,
            isAgentBet: isAgentBet
        }));

        userMatchBets[matchIndex][bettor].push(betId);

        // Mint NFT receipt
        betNFT.mintReceipt(
            bettor,
            betId,
            m.homeTeam,
            m.awayTeam,
            uint8(outcome),
            amount,
            m.kickoffTime
        );

        emit BetPlaced(betId, bettor, matchIndex, outcome, amount, isAgentBet);
    }

    /* ─────────────────── Claiming ─────────────────── */

    function claimWinnings(uint256 betId) external nonReentrant {
        Bet storage bet = bets[betId];
        require(bet.bettor == msg.sender, "Not your bet");
        require(!bet.claimed, "Already claimed");

        Match storage m = matches[bet.matchIndex];
        require(m.status == MarketStatus.RESOLVED || m.status == MarketStatus.CANCELLED, "Not resolved");

        uint256 payout;
        if (m.status == MarketStatus.CANCELLED) {
            payout = bet.amount;
        } else {
            require(bet.outcome == m.result, "Losing bet");
            uint256 winningPool = m.outcomePools[uint256(m.result)];
            uint256 netPool = m.totalPool - (m.totalPool * PLATFORM_FEE / BASIS_POINTS);
            payout = (bet.amount * netPool) / winningPool;
        }

        bet.claimed = true;
        require(usdc.transfer(msg.sender, payout), "Payout failed");
        emit WinningsClaimed(msg.sender, betId, payout);
    }

    function claimAll(uint256 matchIndex) external nonReentrant {
        uint256[] storage betIds = userMatchBets[matchIndex][msg.sender];
        for (uint256 i = 0; i < betIds.length; i++) {
            Bet storage bet = bets[betIds[i]];
            if (bet.claimed) continue;
            Match storage m = matches[bet.matchIndex];
            if (m.status != MarketStatus.RESOLVED && m.status != MarketStatus.CANCELLED) continue;
            if (m.status == MarketStatus.RESOLVED && bet.outcome != m.result) continue;

            uint256 payout;
            if (m.status == MarketStatus.CANCELLED) {
                payout = bet.amount;
            } else {
                uint256 winningPool = m.outcomePools[uint256(m.result)];
                uint256 netPool = m.totalPool - (m.totalPool * PLATFORM_FEE / BASIS_POINTS);
                payout = (bet.amount * netPool) / winningPool;
            }
            bet.claimed = true;
            require(usdc.transfer(msg.sender, payout), "Payout failed");
            emit WinningsClaimed(msg.sender, betIds[i], payout);
        }
    }

    /* ─────────────────── Views ─────────────────── */

    function getMatch(uint256 idx) external view returns (Match memory) {
        return matches[idx];
    }

    function getMatchCount() external view returns (uint256) {
        return matches.length;
    }

    function getBet(uint256 betId) external view returns (Bet memory) {
        return bets[betId];
    }

    function getUserBetsForMatch(uint256 matchIndex, address user)
        external view returns (uint256[] memory)
    {
        return userMatchBets[matchIndex][user];
    }

    function getOdds(uint256 matchIndex) external view returns (
        uint256 homeOdds, uint256 drawOdds, uint256 awayOdds
    ) {
        Match storage m = matches[matchIndex];
        uint256 total = m.totalPool;
        if (total == 0) return (20000, 30000, 20000); // default 2x, 3x, 2x

        uint256 homePool = m.outcomePools[uint256(Outcome.HOME_WIN)];
        uint256 drawPool = m.outcomePools[uint256(Outcome.DRAW)];
        uint256 awayPool = m.outcomePools[uint256(Outcome.AWAY_WIN)];

        // Odds in basis points (10000 = 1x, 20000 = 2x)
        homeOdds = homePool > 0 ? (total * 10000) / homePool : 30000;
        drawOdds = drawPool > 0 ? (total * 10000) / drawPool : 50000;
        awayOdds = awayPool > 0 ? (total * 10000) / awayPool : 30000;
    }

    function getPotentialPayout(uint256 matchIndex, Outcome outcome, uint256 amount)
        external view returns (uint256)
    {
        Match storage m = matches[matchIndex];
        uint256 newPool = m.totalPool + amount;
        uint256 newOutcomePool = m.outcomePools[uint256(outcome)] + amount;
        uint256 netPool = newPool - (newPool * PLATFORM_FEE / BASIS_POINTS);
        return (amount * netPool) / newOutcomePool;
    }
}
