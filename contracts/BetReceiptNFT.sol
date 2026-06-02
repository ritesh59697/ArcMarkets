// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BetReceiptNFT
 * @notice On-chain SVG NFT minted for every ArcMarkets bet.
 */
contract BetReceiptNFT is ERC721, Ownable {
    using Strings for uint256;

    address public predictionMarket;

    struct Receipt {
        string homeTeam;
        string awayTeam;
        uint8 outcome;      // 1=Home, 2=Draw, 3=Away
        uint256 amount;     // in USDC (6 decimals)
        uint256 kickoffTime;
        uint256 betId;
    }

    mapping(uint256 => Receipt) public receipts;
    uint256 private _tokenIdCounter;

    string[4] private outcomeLabels = ["", "HOME WIN", "DRAW", "AWAY WIN"];
    string[4] private outcomeEmojis = ["", "[GOAL]", "[DRAW]", "[GOAL]"];

    modifier onlyMarket() {
        require(msg.sender == predictionMarket, "Only market");
        _;
    }

    constructor() ERC721("ArcMarkets Receipt", "ARCM") Ownable() {}

    function setPredictionMarket(address market) external onlyOwner {
        predictionMarket = market;
    }

    function mintReceipt(
        address to,
        uint256 betId,
        string calldata homeTeam,
        string calldata awayTeam,
        uint8 outcome,
        uint256 amount,
        uint256 kickoffTime
    ) external onlyMarket returns (uint256 tokenId) {
        tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        receipts[tokenId] = Receipt({
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            outcome: outcome,
            amount: amount,
            kickoffTime: kickoffTime,
            betId: betId
        });
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        Receipt memory r = receipts[tokenId];

        string memory amountStr = _formatAmount(r.amount);
        string memory svg = _buildSVG(r, amountStr);
        string memory json = _buildJSON(tokenId, r, amountStr, svg);

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function _formatAmount(uint256 amount) internal pure returns (string memory) {
        return string(abi.encodePacked(
            (amount / 1e6).toString(), ".",
            ((amount % 1e6) / 1e4).toString(), " USDC"
        ));
    }

    function _buildJSON(
        uint256 tokenId,
        Receipt memory r,
        string memory amountStr,
        string memory svg
    ) internal view returns (string memory) {
        return Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"ArcMarkets Receipt #', tokenId.toString(),
            '","description":"Arc Testnet prediction market receipt","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[',
            '{"trait_type":"Home Team","value":"', r.homeTeam, '"},',
            '{"trait_type":"Away Team","value":"', r.awayTeam, '"},',
            '{"trait_type":"Prediction","value":"', outcomeLabels[r.outcome], '"},',
            '{"trait_type":"Amount","value":"', amountStr, '"},',
            '{"trait_type":"Bet ID","value":"', r.betId.toString(), '"}',
            ']}'
        ))));
    }

    function _buildSVGHeader() internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
            '<defs>',
            '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#0a0a0a"/>',
            '<stop offset="100%" style="stop-color:#1a1a2e"/>',
            '</linearGradient>',
            '<linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">',
            '<stop offset="0%" style="stop-color:#00d4ff"/>',
            '<stop offset="100%" style="stop-color:#7b2ff7"/>',
            '</linearGradient>',
            '</defs>',
            '<rect width="400" height="400" fill="url(#bg)" rx="16"/>',
            '<rect x="1" y="1" width="398" height="398" fill="none" stroke="url(#accent)" stroke-width="2" rx="16"/>',
            '<text x="200" y="50" font-family="monospace" font-size="14" fill="#00d4ff" text-anchor="middle" font-weight="bold">ARCMARKETS RECEIPT</text>',
            '<line x1="30" y1="65" x2="370" y2="65" stroke="#333" stroke-width="1"/>'
        ));
    }

    function _buildSVGTeams(string memory homeTeam, string memory awayTeam) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="200" y="105" font-family="monospace" font-size="22" fill="white" text-anchor="middle" font-weight="bold">',
            homeTeam,
            '</text>',
            '<text x="200" y="130" font-family="monospace" font-size="13" fill="#888" text-anchor="middle">vs</text>',
            '<text x="200" y="160" font-family="monospace" font-size="22" fill="white" text-anchor="middle" font-weight="bold">',
            awayTeam,
            '</text>'
        ));
    }

    function _buildSVGPrediction(uint8 outcome) internal view returns (string memory) {
        return string(abi.encodePacked(
            '<rect x="80" y="185" width="240" height="50" fill="#1a1a3e" rx="8"/>',
            '<text x="200" y="206" font-family="monospace" font-size="11" fill="#888" text-anchor="middle">PREDICTION</text>',
            '<text x="200" y="226" font-family="monospace" font-size="18" fill="#00d4ff" text-anchor="middle" font-weight="bold">',
            outcomeEmojis[outcome], ' ', outcomeLabels[outcome],
            '</text>'
        ));
    }

    function _buildSVGFooter(string memory amountStr, uint256 betId) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="200" y="270" font-family="monospace" font-size="13" fill="#888" text-anchor="middle">AMOUNT BET</text>',
            '<text x="200" y="300" font-family="monospace" font-size="24" fill="white" text-anchor="middle" font-weight="bold">',
            amountStr,
            '</text>',
            '<line x1="30" y1="330" x2="370" y2="330" stroke="#333" stroke-width="1"/>',
            '<text x="200" y="355" font-family="monospace" font-size="11" fill="#555" text-anchor="middle">ARC TESTNET | ARCMARKETS | BET #', betId.toString(), '</text>',
            '<text x="200" y="380" font-family="monospace" font-size="10" fill="#444" text-anchor="middle">Sports + Crypto Markets</text>',
            '</svg>'
        ));
    }

    function _buildSVG(Receipt memory r, string memory amountStr)
        internal view returns (string memory)
    {
        return string(abi.encodePacked(
            _buildSVGHeader(),
            _buildSVGTeams(r.homeTeam, r.awayTeam),
            _buildSVGPrediction(r.outcome),
            _buildSVGFooter(amountStr, r.betId)
        ));
    }
}
