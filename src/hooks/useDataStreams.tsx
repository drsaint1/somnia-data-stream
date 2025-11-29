import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useMemo } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { initializeDataStreams } from '../config/dataStreamsConfig';
import { dataStreamsService } from '../services/dataStreamsService';

/**
 * React hook for Somnia Data Streams integration
 */
type DataStreamsContextValue = {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
  service: typeof dataStreamsService;
};

const DataStreamsContext = createContext<DataStreamsContextValue | undefined>(undefined);

const useProvideDataStreams = (): DataStreamsContextValue => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { data: walletClient } = useWalletClient();
  const { address, isConnected } = useAccount();

  // Initialize Data Streams SDK
  useEffect(() => {
    const initialize = async () => {
      if (isInitializing || isInitialized) return;

      try {
        setIsInitializing(true);
        setError(null);

        console.log('🔄 Initializing Data Streams...');
        console.log('  Wallet connected:', isConnected);
        console.log('  Wallet client available:', !!walletClient);
        console.log('  Address:', address);

        // Initialize SDK - wallet client is optional (only needed for broadcasting)
        // Subscriptions work with just the public WebSocket client
        const sdk = await initializeDataStreams(walletClient);

        if (!sdk) {
          throw new Error('Failed to initialize SDK');
        }

        console.log('✅ SDK instance created, initializing schemas...');

        // Initialize schemas - may fail but don't block initialization
        try {
          await dataStreamsService.initializeSchemas();
          console.log('✅ Event schemas initialized');
        } catch (schemaError) {
          console.warn('⚠️ Schema initialization failed (non-critical):', schemaError);
          // Continue anyway - events might work without explicit registration
        }

        setIsInitialized(true);
        console.log('✅ Data Streams initialized successfully');
        if (!walletClient) {
          console.log('ℹ️ Running in read-only mode (subscriptions only) - wallet client not available yet');
        }
      } catch (err) {
        console.error('❌ Data Streams initialization error:', err);
        console.error('Error details:', err instanceof Error ? err.message : String(err));
        setError(err instanceof Error ? err : new Error('Failed to initialize Data Streams'));
        // Don't throw - allow retry
      } finally {
        setIsInitializing(false);
      }
    };

    // Initialize as long as wallet is connected (wallet client is optional)
    // This allows Spectator Mode to work without wallet client
    if (isConnected && address && !isInitializing && !isInitialized) {
      console.log('🔄 Starting Data Streams initialization...');
      initialize();
    }
  }, [isConnected, address, walletClient, isInitializing, isInitialized]);

  // Upgrade SDK with wallet client once it becomes available
  useEffect(() => {
    if (!isInitialized || !walletClient) return;

    const upgrade = async () => {
      try {
        console.log('🔁 Upgrading Data Streams SDK with wallet client support...');
        await initializeDataStreams(walletClient);
        await dataStreamsService.initializeSchemas();
      } catch (err) {
        console.error('⚠️ Failed to upgrade Data Streams SDK with wallet client:', err);
      }
    };

    upgrade();
  }, [isInitialized, walletClient]);

  return {
    isInitialized,
    isInitializing,
    error,
    service: dataStreamsService,
  };
};

export const DataStreamsProvider = ({ children }: { children: ReactNode }) => {
  const { isInitialized, isInitializing, error, service } = useProvideDataStreams();
  const memoizedValue = useMemo(
    () => ({ isInitialized, isInitializing, error, service }),
    [isInitialized, isInitializing, error, service]
  );

  return (
    <DataStreamsContext.Provider value={memoizedValue}>
      {children}
    </DataStreamsContext.Provider>
  );
};

export const useDataStreams = (): DataStreamsContextValue => {
  const context = useContext(DataStreamsContext);
  if (!context) {
    throw new Error('useDataStreams must be used within a DataStreamsProvider');
  }
  return context;
};

/**
 * Hook for subscribing to live races
 */
export const useLiveRaces = () => {
  const [liveRaces, setLiveRaces] = useState<any[]>([]);
  const { isInitialized, service } = useDataStreams();

  useEffect(() => {
    if (!isInitialized) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const events = await service.fetchLatestRaceEvents();
        if (cancelled || !events.length) return;
        setLiveRaces((prev) => {
          const raceMap = new Map<string, any>();
          for (const race of prev) {
            if (race.raceId) {
              raceMap.set(String(race.raceId).toLowerCase(), race);
            }
          }

          for (const event of events) {
            const raceId = event.raceId ? String(event.raceId).toLowerCase() : null;
            if (raceId) {
              const existing = raceMap.get(raceId) || {};
              raceMap.set(raceId, { ...existing, ...event });
            }
          }

          const merged = Array.from(raceMap.values()).sort((a, b) => {
            const timeA = typeof a.timestamp === 'bigint' ? Number(a.timestamp) : Number(a.timestamp ?? 0);
            const timeB = typeof b.timestamp === 'bigint' ? Number(b.timestamp) : Number(b.timestamp ?? 0);
            return timeB - timeA;
          });

          return merged.slice(0, 50);
        });
      } catch (error) {
        console.error('Failed to fetch live races:', error);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isInitialized, service]);

  return { liveRaces };
};

/**
 * Hook for subscribing to leaderboard updates
 */
export const useLiveLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const { isInitialized, service } = useDataStreams();

  useEffect(() => {
    if (!isInitialized) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const events = await service.fetchLatestLeaderboardEvents();
        if (cancelled || !events.length) return;
        setLeaderboard((prev) => {
          const playerMap = new Map<string, any>();
          for (const player of prev) {
            if (player.player) {
              playerMap.set(String(player.player).toLowerCase(), player);
            }
          }

          for (const event of events) {
            const playerKey = event.player ? String(event.player).toLowerCase() : null;
            if (playerKey) {
              const existing = playerMap.get(playerKey) || {};
              playerMap.set(playerKey, { ...existing, ...event });
            }
          }

          return Array.from(playerMap.values()).sort((a, b) => {
            const xpA = typeof a.totalXP === 'bigint' ? Number(a.totalXP) : Number(a.totalXP ?? 0);
            const xpB = typeof b.totalXP === 'bigint' ? Number(b.totalXP) : Number(b.totalXP ?? 0);
            return xpB - xpA;
          });
        });
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      }
    };

    poll();
    const interval = setInterval(poll, 6000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isInitialized, service]);

  return { leaderboard };
};

/**
 * Hook for broadcasting race events
 */
export const useRaceBroadcaster = () => {
  const { isInitialized, service } = useDataStreams();
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const broadcastRaceStart = useCallback(
    async (player: `0x${string}`, carId: bigint, trackName: string) => {
      if (!isInitialized) {
        console.warn('⚠️ Data Streams not initialized, skipping broadcast');
        return null;
      }

      try {
        setIsBroadcasting(true);
        const raceId = await service.broadcastRaceStart({
          player,
          carId,
          trackName,
        });
        console.log('✅ Race start broadcast initiated:', raceId);
        return raceId;
      } catch (error) {
        console.error('❌ Failed to broadcast race start:', error);
        if (error instanceof Error && error.message.includes('Wallet client required')) {
          console.log('ℹ️ Broadcasts require wallet connection. Subscriptions still work in read-only mode.');
        }
        return null;
      } finally {
        setIsBroadcasting(false);
      }
    },
    [isInitialized, service]
  );

  const broadcastRaceProgress = useCallback(
    async (
      raceId: `0x${string}`,
      player: `0x${string}`,
      carId: bigint,
      lapNumber: number,
      lapTime: bigint,
      currentPosition: number
    ) => {
      if (!isInitialized) return;

      try {
        await service.broadcastRaceProgress({
          raceId,
          player,
          carId,
          lapNumber,
          lapTime,
          currentPosition,
        });
      } catch (error) {
        console.error('Failed to broadcast race progress:', error);
      }
    },
    [isInitialized, service]
  );

  const broadcastRaceFinish = useCallback(
    async (
      raceId: `0x${string}`,
      player: `0x${string}`,
      carId: bigint,
      finalPosition: number,
      totalTime: bigint,
      totalLaps: number,
      rewardsEarned: bigint
    ) => {
      if (!isInitialized) return;

      try {
        setIsBroadcasting(true);
        await service.broadcastRaceFinish({
          raceId,
          player,
          carId,
          finalPosition,
          totalTime,
          totalLaps,
          rewardsEarned,
        });
      } catch (error) {
        console.error('Failed to broadcast race finish:', error);
      } finally {
        setIsBroadcasting(false);
      }
    },
    [isInitialized, service]
  );

  const broadcastLeaderboardUpdate = useCallback(
    async (
      player: `0x${string}`,
      totalXP: bigint,
      totalRaces: number,
      totalWins: number,
      rank: number
    ) => {
      if (!isInitialized) return;

      try {
        await service.broadcastLeaderboardUpdate({
          player,
          totalXP,
          totalRaces,
          totalWins,
          rank,
        });
      } catch (error) {
        console.error('Failed to broadcast leaderboard update:', error);
      }
    },
    [isInitialized, service]
  );

  return {
    broadcastRaceStart,
    broadcastRaceProgress,
    broadcastRaceFinish,
    broadcastLeaderboardUpdate,
    isBroadcasting,
  };
};
