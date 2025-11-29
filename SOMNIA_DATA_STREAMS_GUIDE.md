# Somnia Data Streams Integration Guide

## Overview

This racing game integrates **Somnia Data Streams SDK** for real-time blockchain data publishing and subscriptions. This document explains the implementation, current status, and next steps.

## What is Somnia Data Streams?

Somnia Data Streams is a protocol that enables:
- **Real-time blockchain reactivity** without polling or indexers
- **Structured data storage** with schema-based validation
- **WebSocket subscriptions** for live updates
- **Publisher-subscriber model** for efficient event distribution

## Current Implementation Status

### ✅ Completed Features

#### 1. SDK Initialization
- **Location**: `src/config/dataStreamsConfig.ts`
- Properly configured with public and wallet clients
- Graceful handling of wallet connection states
- Automatic upgrade when wallet becomes available

#### 2. Schema Definitions
- **Location**: `src/services/dataStreamsSchemas.ts`
- Four schemas defined:
  - `RaceStartData` - Race initiation events
  - `RaceProgressData` - Lap completion tracking
  - `RaceFinishData` - Race completion with rewards
  - `LeaderboardUpdateData` - Player statistics

#### 3. Schema Registration
- **Location**: `src/services/dataStreamsService.ts:326`
- New `registerSchemas()` method
- Registers all schemas with `zeroHash` parent
- Uses `ignoreRegisteredSchemas: true` to avoid duplicate registration errors

#### 4. Data Publishing Methods
- `broadcastRaceStart()` - Publishes race start to Data Streams
- `broadcastRaceProgress()` - Publishes lap completions
- `broadcastRaceFinish()` - Publishes race results
- `broadcastLeaderboardUpdate()` - Publishes player stats

All methods now use the correct `sdk.streams.set()` API

#### 5. Data Reading Methods
- `fetchPublisherData()` - Reads data for specific schema/publisher
- `fetchLatestRaceEvents()` - Polls event logs (fallback method)
- `fetchLatestLeaderboardEvents()` - Polls leaderboard updates

#### 6. React Integration
- **Location**: `src/hooks/useDataStreams.tsx`
- `DataStreamsProvider` - Context provider for SDK access
- `useDataStreams()` - Main hook for SDK access
- `useLiveRaces()` - Subscribes to race events (polling)
- `useLiveLeaderboard()` - Subscribes to leaderboard (polling)
- `useRaceBroadcaster()` - Broadcasting hooks

#### 7. UI Components
- **Location**: `src/components/`
- `LiveRaceFeed.tsx` - Real-time race event display
- `SpectatorMode.tsx` - Watch live races
- Both components use data streams for updates

### 🔄 Implementation Status

#### ✅ Schema Registration (FIXED)
**Implementation**: Now follows official Somnia tutorial pattern
- Checks `isDataSchemaRegistered()` before registering
- Only registers unregistered schemas
- Verifies registration succeeded after transaction
**Status**: Ready for testing

#### 🔄 Polling vs WebSocket
**Current**: Using HTTP polling every 5-6 seconds
**Impact**: Higher latency, more RPC calls
**Better Solution**: Use `sdk.streams.subscribe()` for WebSocket subscriptions
**Status**: Polling works reliably; WebSocket is optional optimization

## How to Use

### 1. Initialize Data Streams

The SDK initializes automatically when wallet connects:

```typescript
import { DataStreamsProvider } from './hooks/useDataStreams';

function App() {
  return (
    <DataStreamsProvider>
      <YourGameComponents />
    </DataStreamsProvider>
  );
}
```

### 2. Broadcast Race Events

```typescript
import { useRaceBroadcaster } from './hooks/useDataStreams';

function RaceComponent() {
  const { broadcastRaceStart, broadcastRaceFinish } = useRaceBroadcaster();

  const startRace = async () => {
    const raceId = await broadcastRaceStart(
      playerAddress,
      carId,
      'Somnia Circuit'
    );
  };
}
```

### 3. Subscribe to Live Updates

```typescript
import { useLiveRaces } from './hooks/useDataStreams';

function SpectatorComponent() {
  const { liveRaces } = useLiveRaces();

  return (
    <div>
      {liveRaces.map(race => (
        <RaceCard key={race.raceId} race={race} />
      ))}
    </div>
  );
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       React Components                       │
│  (LiveRaceFeed, SpectatorMode, EnhancedCarRaceGame)         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    React Hooks Layer                         │
│  (useDataStreams, useLiveRaces, useRaceBroadcaster)         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                 DataStreamsService                           │
│  - Schema Management                                         │
│  - Data Publishing (set)                                     │
│  - Data Reading (getAllPublisherDataForSchema)              │
│  - Event Log Polling                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│            @somnia-chain/streams SDK                         │
│  - Schema Registration                                       │
│  - Data Storage                                              │
│  - Event Emission                                            │
│  - WebSocket Subscriptions                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Somnia Testnet Blockchain                       │
│  Contract: 0x6AB397FF662e42312c003175DCD76EfF69D048Fc       │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

### 1. Test Schema Registration ✅ PRIORITY

**Test**: Start the game and check console for:
```
🔄 Registering data schemas with Somnia Data Streams...
✅ Schema registration transaction: 0x...
```

**If Successful**: Schemas are registered, data publishing should work
**If Failed**: Check wallet permissions/testnet tokens

### 2. Implement WebSocket Subscriptions

Replace HTTP polling with real-time WebSocket:

```typescript
// In dataStreamsService.ts
async subscribeToRaceEvents(onData: (data: any) => void) {
  const sdk = getDataStreamsSDK();

  const { subscriptionId, unsubscribe } = await sdk.streams.subscribe({
    somniaStreamsEventId: 'RaceStart',
    onData: (result) => {
      console.log('Live race event:', result);
      onData(result);
    },
    onError: (error) => {
      console.error('Subscription error:', error);
    }
  });

  return unsubscribe;
}
```

### 3. Optimize Data Structure

Consider using `setAndEmitEvents()` to combine storage + notifications:

```typescript
await sdk.streams.setAndEmitEvents(
  [{ id: raceId, schemaId, data: encodedData }],
  [{ id: 'RaceStart', argumentTopics: [raceId], data: '0x' }]
);
```

### 4. Add Error Recovery

Implement retry logic for failed publications:

```typescript
async broadcastWithRetry(data: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sdk.streams.set([data]);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * (i + 1));
    }
  }
}
```

## Troubleshooting

### Error: "Cannot read properties of undefined"
**Cause**: Schemas not registered before calling `set()`
**Solution**: Ensure `registerSchemas()` completes successfully

### Error: "Wallet client required"
**Cause**: Trying to publish without wallet connection
**Solution**: Publishing requires wallet, but reading works without it

### No Live Updates Appearing
**Possible Causes**:
1. Polling interval too slow (current: 5-6 seconds)
2. No races being published by other players
3. Event log range too narrow

**Solutions**:
1. Switch to WebSocket subscriptions
2. Test with multiple browser windows
3. Increase polling block range

## API Reference

### DataStreamsService Methods

#### `registerSchemas(): Promise<boolean>`
Registers all race game schemas with Somnia Data Streams.
**Returns**: `true` if successful, `false` otherwise

#### `broadcastRaceStart(data): Promise<string | null>`
Publishes race start event to blockchain.
**Returns**: Race ID if successful, `null` if failed

#### `broadcastRaceFinish(data): Promise<void>`
Publishes race completion with results and rewards.

#### `fetchPublisherData(schemaName, publisher): Promise<any[]>`
Fetches all data published by a specific address under a schema.

### React Hooks

#### `useDataStreams()`
```typescript
const { isInitialized, isInitializing, error, service } = useDataStreams();
```

#### `useLiveRaces()`
```typescript
const { liveRaces } = useLiveRaces();
// Returns array of live race events
```

#### `useRaceBroadcaster()`
```typescript
const {
  broadcastRaceStart,
  broadcastRaceProgress,
  broadcastRaceFinish,
  isBroadcasting
} = useRaceBroadcaster();
```

## Resources

- **Somnia Docs**: https://docs.somnia.network/somnia-data-streams
- **SDK Package**: `@somnia-chain/streams`
- **Discord**: discord.gg/Somnia
- **Testnet Faucet**: https://testnet.somnia.network/

## File Structure

```
src/
├── config/
│   └── dataStreamsConfig.ts          # SDK initialization
├── services/
│   ├── dataStreamsSchemas.ts         # Schema definitions
│   └── dataStreamsService.ts         # Core service logic
├── hooks/
│   └── useDataStreams.tsx            # React hooks
├── components/
│   ├── LiveRaceFeed.tsx              # Live race display
│   └── SpectatorMode.tsx             # Watch live races
└── providers/
    └── Web3Provider.tsx              # Wallet integration
```

## Summary

The Somnia Data Streams integration provides:
- ✅ Schema-based structured data storage
- ✅ Real-time race event broadcasting
- ✅ Spectator mode for watching live races
- ✅ Leaderboard synchronization
- 🔄 WebSocket subscriptions (pending)
- 🔄 Schema registration (implemented, needs testing)

The foundation is solid. Main improvements needed:
1. **Test schema registration** with wallet
2. **Implement WebSocket subscriptions** to replace polling
3. **Add retry logic** for failed publications

This creates a truly real-time blockchain gaming experience!
