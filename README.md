# Somnia Racing Game - Setup Guide

**🏆 Somnia Data Streams Mini Hackathon Entry**

This racing game showcases the power of Somnia Data Streams for real-time blockchain gaming experiences.

Check full game documentation in GAME_DOCUMENTATION.md

## Quick Start

This guide will help you get the Somnia Racing Game running locally in under 10 minutes.

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **MetaMask** browser extension - [Install here](https://metamask.io/) or Rabby wallet, personally I prefer rabby due to smooth user experience and bug free.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd my-somnia-game
```

Set up .env file with private key (optional for contract redeploment)

```bash
# WalletConnect Project ID

VITE_WALLETCONNECT_PROJECT_ID="WalletConnect Project ID"

# Network Configuration

VITE_SOMNIA_RPC_URL=https://dream-rpc.somnia.network/
VITE_SOMNIA_CHAIN_ID=50312

# Contract Addresses - Update these after deployment

VITE_RACING_CONTRACT_ADDRESS="new racing contract address"
VITE_RACING_TOKEN_ADDRESS="new token contract address"
VITE_TOURNAMENTS_CONTRACT_ADDRESS="new tournament contract address"
PRIVATE_KEY="your evm wallet private key without 0x prefix"
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including React, Vite, Hardhat, and Web3 libraries.

### Step 3: Configure Network

Add the Somnia Testnet to your MetaMask:

**Network Details:**

- Network Name: `Somnia Testnet`
- RPC URL: `https://dream-rpc.somnia.network/`
- Chain ID: `50312` (or auto-detect)
- Currency Symbol: `STT`

### Step 4: Get Test Tokens

1. Visit the Somnia Testnet faucet
2. Request test STT tokens for your wallet address
3. You'll need these tokens to interact with the game contracts

### Step 5: Deploy Contracts (Optional)

If you want to deploy fresh contracts:

```bash
# Compile contracts
npx hardhat compile

# Deploy to Somnia Testnet
npx hardhat run scripts/deploy-contracts.js --network somniaTestnet
```

**Note:** The game is already configured with pre-deployed contracts, so this step is optional. The script automatically updates the .env file with new contracts.

### Step 6: Start the Development Server

```bash
npm run dev
```

The game will be available at `http://localhost:5173` or any available port as at the time of deployment.

### Step 7: Connect Your Wallet

1. Open the game in your browser
2. Click "Connect Wallet"
3. Approve the MetaMask connection
4. It automatically connect to Somnia test network if you have it added in your wallet, if not, it will request approval to add the network.

### Step 8: Start Playing

1. **Mint your first car** - Click "mint starter racer on the welcome page" to purchase a starter car (0.01 STT)
2. **Enter a race** - Go to "Main Menu" and click "Start Race"
3. **Earn rewards** - Complete races to earn RACE tokens and XP
4. **Check leaderboard** - View your stats and compete with others
5. **Watch live races** - Try the Spectator Mode to see races happening in real-time

## 🚀 Somnia Data Streams Integration

This game integrates **Somnia Data Streams SDK** to provide real-time blockchain reactivity, transforming traditional blockchain gaming into a live, interactive experience.

### What is Somnia Data Streams?

Somnia Data Streams is a breakthrough SDK and protocol that turns on-chain data into live, structured, and reactive streams. Instead of waiting for updates or relying on oracles, the game gets instant data directly from the blockchain.

### How We Use Data Streams

#### 1. **Real-Time Race Broadcasting**
- Every race start is broadcasted instantly to all connected clients
- Lap completions are streamed live as they happen
- Race finishes trigger immediate updates across the network

#### 2. **Live Leaderboard Updates**
- Player statistics update in real-time as races complete
- Leaderboard positions change instantly without manual refresh
- Global rankings are always up-to-date

#### 3. **Spectator Mode**
- Watch other players' races in real-time
- See active races, lap times, and positions as they happen
- Live feed of all racing events across the network

#### 4. **Reactive UI**
- UI automatically updates when new data arrives
- No polling or manual refreshing required
- Instant feedback for better user experience

### Data Streams Architecture

```typescript
// Schema Definitions
- RaceStart: Broadcasts when a race begins
- RaceProgress: Streams lap completions and position updates
- RaceFinish: Publishes final results and rewards
- LeaderboardUpdate: Real-time player statistics

// Features Powered by Data Streams
✅ Live race broadcasting
✅ Real-time leaderboard synchronization
✅ Spectator mode for watching live races
✅ Instant race event notifications
✅ Reactive UI components
```

### Technical Implementation

The game uses the `@somnia-chain/streams` SDK to:

1. **Define structured schemas** for race events
2. **Publish race data** to on-chain streams
3. **Subscribe to live updates** from other players
4. **React to events** and update UI in real-time

**Key Files:**
- `/src/config/dataStreamsConfig.ts` - Data Streams SDK configuration
- `/src/services/dataStreamsSchemas.ts` - Schema definitions
- `/src/services/dataStreamsService.ts` - Publishing and subscription logic
- `/src/hooks/useDataStreams.ts` - React hooks for easy integration
- `/src/components/LiveRaceFeed.tsx` - Real-time race event display
- `/src/components/SpectatorMode.tsx` - Watch live races

### Why This Matters for Gaming

Traditional blockchain games suffer from:
- ❌ Delayed updates requiring page refreshes
- ❌ Polling blockchain for state changes
- ❌ No real-time player interactions
- ❌ Poor multiplayer experiences

With Somnia Data Streams:
- ✅ Instant race results and leaderboard updates
- ✅ Real-time spectator experiences
- ✅ Live competitive gaming
- ✅ Esports-ready infrastructure

### Demo Video

Watch the game in action with live Data Streams features:
[Link to demo video - to be added]

## Troubleshooting

### Common Issues

**"Wrong Network" Error:**

- Switch to Somnia Testnet in MetaMask or Rabby wallet.
- Refresh the page

**Transaction Fails:**

- Ensure you have enough STT for gas fees
- Try increasing gas limit in MetaMask

**Game Won't Load:**

- Clear browser cache
- Disable ad blockers
- Try a different browser

**Can't Connect Wallet:**

- Update MetaMask to latest version or use rabby wallet preferrably
- Check if MetaMask is unlocked
- Try refreshing the page

### Network Configuration Issues

If you can't connect to Somnia Testnet:

1. Manually add the network in MetaMask:

   - Settings → Networks → Add Network
   - Use the network details from Step 3

2. Import the network configuration:
   ```javascript
   {
     "chainId": "50312",
     "chainName": "Somnia Testnet",
     "rpcUrls": ["https://dream-rpc.somnia.network/"],
     "nativeCurrency": {
       "name": "STT",
       "symbol": "STT",
       "decimals": 18
     }
   }
   ```

## Advanced Setup

### Running Tests

```bash
# Run contract tests
npx hardhat test

# Run with coverage
npx hardhat coverage
```

### Building for Production

```bash
# Build the application
npm run build

# Preview the build
npm run preview
```

### Contract Verification

To verify contracts on Somnia explorer:

```bash
npx hardhat verify --network somniaTestnet <CONTRACT_ADDRESS>
```

## Support

If you encounter any issues during setup:

1. Check the browser console for error messages
2. Verify network configuration in MetaMask
3. Ensure you have sufficient test STT tokens
4. Try clearing browser cache and hard refresh

## Architecture Overview

The game consists of:

- **Frontend**: React + TypeScript + Vite
- **Smart Contracts**: Solidity contracts on Somnia Testnet
- **Web3 Integration**: Wagmi + Viem for blockchain interaction
- **Real-Time Data**: Somnia Data Streams SDK for live updates
- **3D Graphics**: Three.js for racing visualization

### Technology Stack

```
Frontend:
- React 19 + TypeScript
- Vite for fast development
- Wagmi + Viem for Web3
- Three.js for 3D racing

Blockchain:
- Somnia Testnet (EVM-compatible)
- Smart Contracts: Racing, Tokens, Tournaments
- Somnia Data Streams SDK (@somnia-chain/streams)

Real-Time Features:
- Live race broadcasting
- Real-time leaderboard updates
- Spectator mode
- Reactive UI components
```

## Hackathon Submission

**Event**: Somnia Data Streams Mini Hackathon
**Date**: November 4-15, 2025
**Category**: Real-Time Blockchain Gaming

### How This Project Meets the Criteria

✅ **Technical Excellence**:
- Well-architected Data Streams integration
- Proper schema design for race events
- Clean separation of concerns with services and hooks
- Type-safe implementation with TypeScript

✅ **Real-Time UX**:
- Instant race updates without page refresh
- Live leaderboard synchronization
- Spectator mode for watching races in real-time
- Reactive UI that responds to events immediately

✅ **Somnia Integration**:
- Deployed on Somnia Testnet
- Uses Somnia Data Streams SDK
- Leverages Somnia's high-performance blockchain

✅ **Potential Impact**:
- Demonstrates the future of blockchain gaming
- Shows how Data Streams enable esports experiences
- Provides reusable patterns for other games
- Creates engaging multiplayer interactions

Check full game documentation in GAME_DOCUMENTATION.md
Ready to race? Let's go! 🏎️
