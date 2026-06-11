# How it Works

Participating in ArcMarkets is designed to be seamless and user-friendly. The platform supports two primary prediction modes: manual betting and delegated autonomous AI agent betting.

---

## 1. Manual Predictions (Web3 Mode)

For users who want to analyze markets and place wagers manually:

### Step 1: Connect Your Web3 Wallet
Click the **Connect Wallet** button in the top-right corner of the DApp. Ensure your wallet (e.g., MetaMask, Rabby, or Coinbase Wallet) is configured for the **Arc Testnet** network.
* **Network Name**: Arc Testnet
* **Gas Token**: USDC (Arc Network uses a native USDC gas model, meaning transaction fees are paid directly in USDC!)

### Step 2: Browse the Markets
Navigate to the **Markets** tab. Here, you will find active prediction categories:
* **Sports Matchups**: Upcoming international sports fixtures (e.g., soccer matches) with live outcomes.
* **Crypto Price Prediction**: Directional predictions on asset prices relative to a specific strike/benchmark price (e.g., "Will ETH be above $3,500?").

### Step 3: Choose Your Outcome & Check the Odds
Select the outcome you want to wager on:
* **Sports**: Home win, Away win, or Draw.
* **Crypto**: Yes (above benchmark) or No (below benchmark).

Wagers are consolidated into a **Dynamic Parimutuel Pool**. Odds are not fixed; they adjust continuously in real time based on the total capital placed on each outcome:

$$\text{Odds}_i = \frac{\text{Total Pool} \times (1 - \text{Fee})}{\text{Outcome Pool}_i}$$

### Step 4: Confirm and Lock in Your Wager
Input your wager amount in USDC. The interface will display your estimated odds and potential payout. Click **Approve & Place Bet** to submit the transaction.
* **Instant Receipt**: Once confirmed, the smart contract automatically mints you a **100% on-chain SVG NFT Bet Receipt**. This NFT permanently stores your wager amount, outcome, and timestamp directly in its metadata.

### Step 5: Claim Your Winnings
Once the fixture finishes and is resolved on-chain, head to your **Portfolio** tab. If your prediction was correct, you can claim your share of the total parimutuel pool directly to your wallet!

---

## 2. Escrowed AI Agent Prediction (Delegated Mode)

For users who prefer an automated, hands-off approach using autonomous prediction strategies:

### Step 1: Authorize the AI Betting Agent
Navigate to the **AI Agent** tab. Click **Authorize Agent** to grant permission to the ArcMarkets smart contract to allow the AI Agent to execute wagers on your behalf.
* **Zero Private Key Sharing**: The agent *never* has access to your private keys or seed phrase. All authorization is handled securely on-chain.

### Step 2: Fund Your Escrow Budget
Deposit the USDC amount you want to allocate for automated predictions into the on-chain Escrow contract. The AI Agent can only place bets using this escrowed balance, protecting the rest of your wallet.

### Step 3: Select Your Risk Profile
Customize how the AI Agent sizes and triggers wagers by choosing a risk preference:
* 🟢 **Conservative**: Smaller bet sizes, higher positive expected-value (EV) threshold required to trigger a trade.
* 🟡 **Moderate**: Standard Kelly Criterion fraction sizing for optimized long-term capital growth.
* 🔴 **Aggressive**: Maximum Kelly sizing for higher volatility and maximum potential returns.

### Step 4: Automated 24/7 Execution
The AI Agent operates autonomously in the background:
1. **FIFA Strength Analysis**: It fetches live team statistics, historical performance, and FIFA strength ratings.
2. **EV Calculation**: It compares the real-time contract odds with its calculated probability model to identify positive expected-value opportunities.
3. **Kelly Criterion Sizing**: It sizes each bet dynamically based on your selected risk profile and remaining escrow budget.
4. **Execution**: It calls the contract's delegation function (`agentPlaceBet`) to submit the wager. The console log on the AI Agent tab will show live execution logs.

### Step 5: Instant Revocation & Withdrawal
You retain complete control at all times. If you want to stop the automated betting or adjust your strategy:
* Click **Revoke Agent** to instantly disable the agent's ability to place bets on your account.
* Click **Withdraw Escrow** to return any remaining USDC budget from the escrow contract directly back to your wallet.
