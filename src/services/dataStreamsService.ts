import { getDataStreamsCapabilities, getDataStreamsPublicClient, getDataStreamsSDK } from '../config/dataStreamsConfig';
import {
  createSchemaEncoders,
  RACE_START_DATA_SCHEMA,
  RACE_PROGRESS_DATA_SCHEMA,
  RACE_FINISH_DATA_SCHEMA,
  LEADERBOARD_UPDATE_DATA_SCHEMA,
  RaceStartData,
  RaceProgressData,
  RaceFinishData,
  LeaderboardUpdateData,
  generateRaceId,
} from './dataStreamsSchemas';
import type { SDK } from '@somnia-chain/streams';
import { Hex, type AbiEvent, getAddress, pad, toHex, zeroHash } from 'viem';

/**
 * Data Streams Service
 * Handles all interactions with Somnia Data Streams for the racing game
 */

class DataStreamsService {
  private encoders = createSchemaEncoders();
  private schemaIds: Map<string, Hex> = new Map();
  private dataSchemaDefinitions = [
    { name: 'RaceStartData', schema: RACE_START_DATA_SCHEMA },
    { name: 'RaceProgressData', schema: RACE_PROGRESS_DATA_SCHEMA },
    { name: 'RaceFinishData', schema: RACE_FINISH_DATA_SCHEMA },
    { name: 'LeaderboardUpdateData', schema: LEADERBOARD_UPDATE_DATA_SCHEMA },
  ];
  private eventAbis: Record<string, AbiEvent> = {
    RaceStart: {
      type: 'event',
      name: 'RaceStart',
      inputs: [
        { name: 'raceId', type: 'bytes32', indexed: true },
        { name: 'player', type: 'address', indexed: true },
        { name: 'timestamp', type: 'uint64', indexed: false },
        { name: 'carId', type: 'uint256', indexed: false },
        { name: 'trackName', type: 'string', indexed: false },
      ],
    },
    RaceProgress: {
      type: 'event',
      name: 'RaceProgress',
      inputs: [
        { name: 'raceId', type: 'bytes32', indexed: true },
        { name: 'player', type: 'address', indexed: false },
        { name: 'timestamp', type: 'uint64', indexed: false },
        { name: 'carId', type: 'uint256', indexed: false },
        { name: 'lapNumber', type: 'uint8', indexed: false },
        { name: 'lapTime', type: 'uint64', indexed: false },
        { name: 'currentPosition', type: 'uint32', indexed: false },
      ],
    },
    RaceFinish: {
      type: 'event',
      name: 'RaceFinish',
      inputs: [
        { name: 'raceId', type: 'bytes32', indexed: true },
        { name: 'player', type: 'address', indexed: true },
        { name: 'timestamp', type: 'uint64', indexed: false },
        { name: 'carId', type: 'uint256', indexed: false },
        { name: 'finalPosition', type: 'uint32', indexed: false },
        { name: 'totalTime', type: 'uint64', indexed: false },
        { name: 'totalLaps', type: 'uint32', indexed: false },
        { name: 'rewardsEarned', type: 'uint256', indexed: false },
      ],
    },
    LeaderboardUpdate: {
      type: 'event',
      name: 'LeaderboardUpdate',
      inputs: [
        { name: 'player', type: 'address', indexed: true },
        { name: 'timestamp', type: 'uint64', indexed: false },
        { name: 'totalXP', type: 'uint256', indexed: false },
        { name: 'totalRaces', type: 'uint32', indexed: false },
        { name: 'totalWins', type: 'uint32', indexed: false },
        { name: 'rank', type: 'uint32', indexed: false },
      ],
    },
  };
  private lastPolledBlocks: Record<string, bigint | null> = {
    RaceStart: null,
    RaceProgress: null,
    RaceFinish: null,
    LeaderboardUpdate: null,
  };
  private streamsContractAddress: `0x${string}` | null = null;
  private emitterDisabledReason: string | null = null;

  private async ensureDataSchemas(sdk: any) {
    console.log('🔄 Computing schema IDs for Data Streams...');

    await Promise.all(
      this.dataSchemaDefinitions.map(async (definition) => {
        try {
          const schemaId = (await sdk.streams.computeSchemaId(definition.schema)) as Hex | null;
          if (schemaId) {
            this.schemaIds.set(definition.name, schemaId);
            console.log(`✅ Schema ID computed for ${definition.name}:`, schemaId);
          } else {
            console.warn(`⚠️ Schema ID is null for ${definition.name}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to compute schema ID for ${definition.name}:`, error);
        }
      })
    );

    console.log('📋 All computed schema IDs:', Object.fromEntries(this.schemaIds));
  }
  private decodeTopicAddress(topic?: Hex): `0x${string}` | undefined {
    if (!topic) return undefined;
    try {
      const normalized = topic.toLowerCase();
      const withoutPrefix = normalized.startsWith('0x') ? normalized.slice(2) : normalized;
      const address = `0x${withoutPrefix.slice(-40)}` as `0x${string}`;
      return getAddress(address);
    } catch {
      return undefined;
    }
  }

  private decodeEventData(
    key: keyof ReturnType<typeof createSchemaEncoders>,
    data: Hex
  ): Record<string, unknown> | null {
    if (!data || data === '0x') return null;
    try {
      const decodedItems = this.encoders[key].decode(data);
      return decodedItems.reduce<Record<string, unknown>>((acc, item) => {
        const rawValue = (item.value as any)?.value ?? item.value;
        acc[item.name] = rawValue;
        return acc;
      }, {});
    } catch (error) {
      console.warn(`⚠️ Failed to decode ${key} payload:`, error);
      return null;
    }
  }

  private toBigInt(value: unknown): bigint | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(Math.trunc(value));
    if (typeof value === 'string' && value !== '') {
      try {
        return BigInt(value);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private toNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string' && value !== '') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private formatEventPayload(
    eventId: string,
    result: { topics: Hex[]; data: Hex; args?: Record<string, unknown> }
  ): any {
    const base = {
      eventId,
      rawTopics: result.topics,
      rawData: result.data,
    };

    switch (eventId) {
      case 'RaceStart': {
        const [, raceIdTopic, playerTopic] = result.topics;
        const decoded = result.args ?? this.decodeEventData('raceStart', result.data);
        return {
          ...base,
          raceId: raceIdTopic as `0x${string}` | undefined,
          player: this.decodeTopicAddress(playerTopic),
          timestamp: this.toBigInt(decoded?.timestamp),
          carId: this.toBigInt(decoded?.carId),
          trackName: decoded?.trackName as string | undefined,
        };
      }
      case 'RaceProgress': {
        const [, raceIdTopic] = result.topics;
        const decoded = result.args ?? this.decodeEventData('raceProgress', result.data);
        return {
          ...base,
          raceId: raceIdTopic as `0x${string}` | undefined,
          player: (decoded?.player as `0x${string}` | undefined) ?? undefined,
          carId: this.toBigInt(decoded?.carId),
          lapNumber: this.toNumber(decoded?.lapNumber),
          lapTime: this.toBigInt(decoded?.lapTime),
          currentPosition: this.toNumber(decoded?.currentPosition),
          timestamp: this.toBigInt(decoded?.timestamp),
        };
      }
      case 'RaceFinish': {
        const [, raceIdTopic, playerTopic] = result.topics;
        const decoded = result.args ?? this.decodeEventData('raceFinish', result.data);
        return {
          ...base,
          raceId: raceIdTopic as `0x${string}` | undefined,
          player: this.decodeTopicAddress(playerTopic),
          timestamp: this.toBigInt(decoded?.timestamp),
          carId: this.toBigInt(decoded?.carId),
          finalPosition: this.toNumber(decoded?.finalPosition),
          totalTime: this.toBigInt(decoded?.totalTime),
          totalLaps: this.toNumber(decoded?.totalLaps),
          rewardsEarned: this.toBigInt(decoded?.rewardsEarned),
        };
      }
      case 'LeaderboardUpdate': {
        const [, playerTopic] = result.topics;
        const decoded = result.args ?? this.decodeEventData('leaderboardUpdate', result.data);
        return {
          ...base,
          player: this.decodeTopicAddress(playerTopic),
          timestamp: this.toBigInt(decoded?.timestamp),
          totalXP: this.toBigInt(decoded?.totalXP),
          totalRaces: this.toNumber(decoded?.totalRaces),
          totalWins: this.toNumber(decoded?.totalWins),
          rank: this.toNumber(decoded?.rank),
        };
      }
      default:
        return base;
    }
  }

  private async getStreamsContractAddress(sdk: SDK) {
    if (this.streamsContractAddress) {
      return this.streamsContractAddress;
    }
    const info = await sdk.streams.getSomniaDataStreamsProtocolInfo();
    if (!info || info instanceof Error || !info.address) {
      throw new Error('Unable to determine Somnia Streams contract address');
    }
    this.streamsContractAddress = info.address as `0x${string}`;
    return this.streamsContractAddress;
  }

  private canEmitEvents(eventLabel: string): boolean {
    if (this.emitterDisabledReason) {
      console.log(`ℹ️ Skipping ${eventLabel} broadcast: ${this.emitterDisabledReason}`);
      return false;
    }
    return true;
  }

  private disableEmitEventsIfNeeded(error: unknown) {
    if (this.emitterDisabledReason) return;
    const message = error instanceof Error ? error.message : String(error);
    if (!message) return;
    const normalized = message.toLowerCase();
    if (
      normalized.includes('cannot read properties of undefined') ||
      normalized.includes('reverted') ||
      normalized.includes('esstores')
    ) {
      this.emitterDisabledReason =
        'Data Streams publishing unavailable (may require schema registration or wallet permissions). Spectator mode continues with read-only access.';
      console.warn(`⚠️ Event broadcasting disabled: ${this.emitterDisabledReason}`);
      console.info(`ℹ️ To enable publishing:
        1. Ensure schemas are registered with the Somnia Data Streams contract
        2. Check wallet permissions/allowlist status
        3. Contact Somnia support: discord.gg/Somnia`);
    }
  }

  private handleEmitError(eventLabel: string, error: unknown) {
    console.error(`❌ Failed to emit ${eventLabel}:`, error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    this.disableEmitEventsIfNeeded(error);
  }

  private async fetchEventLogs(eventId: keyof DataStreamsService['eventAbis']) {
    const sdk = getDataStreamsSDK();
    if (!sdk) {
      throw new Error('Data Streams SDK not initialized');
    }
    const publicClient = getDataStreamsPublicClient();
    if (!publicClient) {
      throw new Error('Public client not initialized');
    }

    const contractAddress = await this.getStreamsContractAddress(sdk);
    const latestBlock = await publicClient.getBlockNumber();
    const defaultWindow = 200n;
    const fromBlock =
      this.lastPolledBlocks[eventId] ??
      (latestBlock > defaultWindow ? latestBlock - defaultWindow : 0n);

    const eventAbi = this.eventAbis[eventId];
    const logs = await publicClient.getLogs({
      address: contractAddress,
      event: eventAbi,
      fromBlock,
      toBlock: latestBlock,
    });

    this.lastPolledBlocks[eventId] = latestBlock + 1n;

    return logs.map((log) =>
      this.formatEventPayload(eventId, {
        topics: log.topics as Hex[],
        data: log.data as Hex,
        args: log.args as Record<string, unknown>,
      })
    );
  }

  /**
   * Register data schemas with Somnia Data Streams
   * REQUIRED before publishing data with set()
   * Following official Somnia tutorial pattern
   */
  async registerSchemas(): Promise<boolean> {
    const sdk = getDataStreamsSDK();
    if (!sdk) {
      console.warn('Data Streams SDK not initialized');
      return false;
    }

    const { hasWalletClient } = getDataStreamsCapabilities();
    if (!hasWalletClient) {
      console.log('ℹ️ Skipping schema registration - wallet client required');
      return false;
    }

    try {
      console.log('🔄 Checking schema registration status...');

      // Define all schemas to register
      const schemas = [
        { id: 'RaceStartData', schema: RACE_START_DATA_SCHEMA },
        { id: 'RaceProgressData', schema: RACE_PROGRESS_DATA_SCHEMA },
        { id: 'RaceFinishData', schema: RACE_FINISH_DATA_SCHEMA },
        { id: 'LeaderboardUpdateData', schema: LEADERBOARD_UPDATE_DATA_SCHEMA },
      ];

      // Check which schemas need registration
      const schemasToRegister = [];
      for (const { id, schema } of schemas) {
        const schemaId = await sdk.streams.computeSchemaId(schema);

        // Check if schema is already registered (per official tutorial)
        const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaId);

        if (isRegistered) {
          console.log(`✅ Schema "${id}" already registered (${schemaId})`);
        } else {
          console.log(`⏳ Schema "${id}" needs registration (${schemaId})`);
          schemasToRegister.push({
            id,
            schema,
            parentSchemaId: zeroHash as Hex,
          });
        }
      }

      // Register any unregistered schemas
      if (schemasToRegister.length === 0) {
        console.log('✅ All schemas already registered');
        return true;
      }

      console.log(`🔄 Registering ${schemasToRegister.length} schema(s)...`);

      // Register with ignoreRegisteredSchemas=true for safety
      const txHash = await sdk.streams.registerDataSchemas(schemasToRegister, true);

      if (txHash && txHash !== null && typeof txHash !== 'object') {
        console.log('✅ Schema registration transaction:', txHash);

        // Verify registration succeeded by checking again
        let allRegistered = true;
        for (const { id, schema } of schemasToRegister) {
          const schemaId = await sdk.streams.computeSchemaId(schema);
          const isNowRegistered = await sdk.streams.isDataSchemaRegistered(schemaId);

          if (isNowRegistered) {
            console.log(`✅ Verified "${id}" registration successful`);
          } else {
            console.error(`❌ Schema "${id}" registration failed verification`);
            allRegistered = false;
          }
        }

        return allRegistered;
      } else if (txHash instanceof Error) {
        console.error('❌ Schema registration failed:', txHash.message);
        return false;
      } else {
        console.log('ℹ️ Registration returned unexpected result:', txHash);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to register schemas:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      return false;
    }
  }

  /**
   * Initialize Data Streams schemas
   * Computes schema IDs and optionally registers them
   */
  async initializeSchemas(): Promise<void> {
    const sdk = getDataStreamsSDK();
    if (!sdk) throw new Error('Data Streams SDK not initialized');

    try {
      console.log('🔄 Initializing Data Streams schemas...');

      // First, compute schema IDs
      await this.ensureDataSchemas(sdk);

      // Then, attempt to register schemas (optional, gracefully fails)
      const { hasWalletClient } = getDataStreamsCapabilities();
      if (hasWalletClient) {
        console.log('🔄 Attempting to register schemas...');
        const registered = await this.registerSchemas();
        if (registered) {
          console.log('✅ Schemas registered successfully');
        } else {
          console.warn('⚠️ Schema registration skipped or failed - data publishing may not work');
        }
      } else {
        console.log('ℹ️ Wallet client not available - skipping schema registration');
        console.log('ℹ️ Read-only mode: can fetch data but not publish');
      }
    } catch (error) {
      console.error('❌ Failed to initialize schemas:', error);
      console.warn('⚠️ Continuing without schema initialization - publishing may fail');
      // Don't throw - allow read-only operations
    }
  }

  /**
   * Broadcast race start event using Somnia Data Streams
   * Uses set() method to publish data to the blockchain
   */
  async broadcastRaceStart(data: Omit<RaceStartData, 'raceId' | 'timestamp'>): Promise<string | null> {
    const sdk = getDataStreamsSDK();
    if (!sdk) {
      console.error('❌ Data Streams SDK not initialized');
      throw new Error('Data Streams SDK not initialized');
    }

    try {
      if (!this.canEmitEvents('race start')) {
        return null;
      }

      const raceId = generateRaceId(data.player, Date.now());
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      const raceData: RaceStartData = {
        ...data,
        raceId,
        timestamp,
      };

      console.log('📡 Publishing race start event to Data Streams:', {
        raceId,
        player: data.player,
        carId: data.carId.toString(),
        trackName: data.trackName,
      });

      // Get the schema ID for RaceStartData
      const schemaId = this.schemaIds.get('RaceStartData');
      if (!schemaId) {
        console.warn('⚠️ RaceStartData schema ID not found, skipping broadcast');
        return raceId;
      }

      // Encode the data according to the schema
      const encodedData = this.encoders.raceStart.encode([
        { name: 'trackName', value: raceData.trackName, type: 'string' },
        { name: 'carId', value: raceData.carId.toString(), type: 'uint256' },
        { name: 'timestamp', value: raceData.timestamp.toString(), type: 'uint64' },
      ]);

      // Use set() method as per official Somnia documentation
      await sdk.streams.set([
        {
          id: raceData.raceId,
          schemaId: schemaId,
          data: encodedData,
        },
      ]);

      console.log('✅ Race start event published successfully:', raceId);
      return raceId;
    } catch (error) {
      this.handleEmitError('race start', error);
      return null;
    }
  }

  /**
   * Broadcast race progress (lap completions)
   */
  async broadcastRaceProgress(data: Omit<RaceProgressData, 'timestamp'>): Promise<void> {
    const sdk = getDataStreamsSDK();
    if (!sdk) {
      console.warn('Data Streams SDK not initialized, skipping progress broadcast');
      return;
    }

    try {
      if (!this.canEmitEvents('race progress')) {
        return;
      }

      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      const progressData: RaceProgressData = {
        ...data,
        timestamp,
      };

      // Get the schema ID for RaceProgressData
      const schemaId = this.schemaIds.get('RaceProgressData');
      if (!schemaId) {
        console.warn('⚠️ RaceProgressData schema ID not found, skipping broadcast');
        return;
      }

      const encodedData = this.encoders.raceProgress.encode([
        { name: 'lapNumber', value: data.lapNumber.toString(), type: 'uint8' },
        { name: 'carId', value: data.carId.toString(), type: 'uint256' },
        { name: 'lapTime', value: data.lapTime.toString(), type: 'uint64' },
        { name: 'currentPosition', value: data.currentPosition.toString(), type: 'uint32' },
        { name: 'timestamp', value: progressData.timestamp.toString(), type: 'uint64' },
        { name: 'player', value: data.player, type: 'address' },
      ]);

      // Create a unique ID for this progress update
      const progressId = toHex(`${data.raceId}_lap_${data.lapNumber}`, { size: 32 });

      await sdk.streams.set([
        {
          id: progressId,
          schemaId: schemaId,
          data: encodedData,
        },
      ]);

      console.log('✅ Race progress event published:', data.raceId, 'Lap:', data.lapNumber);
    } catch (error) {
      this.handleEmitError('race progress', error);
      // Don't throw - progress updates shouldn't break the game
    }
  }

  /**
   * Broadcast race finish
   */
  async broadcastRaceFinish(data: Omit<RaceFinishData, 'timestamp'>): Promise<void> {
    const sdk = getDataStreamsSDK();
    if (!sdk) {
      console.warn('Data Streams SDK not initialized, skipping finish broadcast');
      return;
    }

    try {
      if (!this.canEmitEvents('race finish')) {
        return;
      }

      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      const finishData: RaceFinishData = {
        ...data,
        timestamp,
      };

      // Get the schema ID for RaceFinishData
      const schemaId = this.schemaIds.get('RaceFinishData');
      if (!schemaId) {
        console.warn('⚠️ RaceFinishData schema ID not found, skipping broadcast');
        return;
      }

      const encodedData = this.encoders.raceFinish.encode([
        { name: 'finalPosition', value: data.finalPosition.toString(), type: 'uint32' },
        { name: 'carId', value: data.carId.toString(), type: 'uint256' },
        { name: 'totalTime', value: data.totalTime.toString(), type: 'uint64' },
        { name: 'totalLaps', value: data.totalLaps.toString(), type: 'uint32' },
        { name: 'rewardsEarned', value: data.rewardsEarned.toString(), type: 'uint256' },
        { name: 'timestamp', value: finishData.timestamp.toString(), type: 'uint64' },
      ]);

      // Create a unique finish ID
      const finishId = toHex(`${data.raceId}_finish`, { size: 32 });

      await sdk.streams.set([
        {
          id: finishId,
          schemaId: schemaId,
          data: encodedData,
        },
      ]);

      console.log('✅ Race finish event published:', data.raceId);
    } catch (error) {
      this.handleEmitError('race finish', error);
      // Don't throw - game should continue even if broadcast fails
    }
  }

  /**
   * Broadcast leaderboard update
   */
  async broadcastLeaderboardUpdate(data: Omit<LeaderboardUpdateData, 'timestamp'>): Promise<void> {
    const sdk = getDataStreamsSDK();
    if (!sdk) {
      console.warn('Data Streams SDK not initialized, skipping leaderboard broadcast');
      return;
    }

    try {
      if (!this.canEmitEvents('leaderboard update')) {
        return;
      }

      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      const leaderboardData: LeaderboardUpdateData = {
        ...data,
        timestamp,
      };

      // Get the schema ID for LeaderboardUpdateData
      const schemaId = this.schemaIds.get('LeaderboardUpdateData');
      if (!schemaId) {
        console.warn('⚠️ LeaderboardUpdateData schema ID not found, skipping broadcast');
        return;
      }

      const encodedData = this.encoders.leaderboardUpdate.encode([
        { name: 'totalXP', value: data.totalXP.toString(), type: 'uint256' },
        { name: 'totalRaces', value: data.totalRaces.toString(), type: 'uint32' },
        { name: 'totalWins', value: data.totalWins.toString(), type: 'uint32' },
        { name: 'rank', value: data.rank.toString(), type: 'uint32' },
        { name: 'timestamp', value: leaderboardData.timestamp.toString(), type: 'uint64' },
      ]);

      // Use player address as the unique ID for leaderboard updates
      const updateId = pad(data.player, { size: 32 });

      await sdk.streams.set([
        {
          id: updateId,
          schemaId: schemaId,
          data: encodedData,
        },
      ]);

      console.log('✅ Leaderboard update event published for:', data.player);
    } catch (error) {
      this.handleEmitError('leaderboard update', error);
      // Don't throw - leaderboard updates shouldn't break the game
    }
  }

  /**
   * Fetch data for a specific schema and publisher
   */
  async fetchPublisherData(schemaName: string, publisher: `0x${string}`): Promise<any[]> {
    const sdk = getDataStreamsSDK();
    if (!sdk) {
      console.warn('Data Streams SDK not initialized');
      return [];
    }

    try {
      const schemaId = this.schemaIds.get(schemaName);
      if (!schemaId) {
        console.warn(`Schema ID for ${schemaName} not found`);
        return [];
      }

      const rows = await sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);

      if (!Array.isArray(rows)) {
        return [];
      }

      return rows;
    } catch (error) {
      console.error(`Failed to fetch data for ${schemaName}:`, error);
      return [];
    }
  }

  /**
   * Fetch recent race events using HTTP polling of event logs
   * Note: This still uses event logs as a fallback for multi-publisher reads
   */
  async fetchLatestRaceEvents(): Promise<any[]> {
    try {
      const [starts, progress, finishes] = await Promise.all([
        this.fetchEventLogs('RaceStart'),
        this.fetchEventLogs('RaceProgress'),
        this.fetchEventLogs('RaceFinish'),
      ]);

      return [...starts, ...progress, ...finishes].sort((a, b) => {
        const timeA = this.toBigInt(a.timestamp) ?? 0n;
        const timeB = this.toBigInt(b.timestamp) ?? 0n;
        return Number(timeB - timeA);
      });
    } catch (error) {
      console.error('❌ Failed to fetch race events:', error);
      return [];
    }
  }

  /**
   * Fetch recent leaderboard events using HTTP polling of event logs
   */
  async fetchLatestLeaderboardEvents(): Promise<any[]> {
    try {
      const updates = await this.fetchEventLogs('LeaderboardUpdate');
      const byPlayer = new Map<string, any>();
      for (const update of updates) {
        const player = update.player?.toLowerCase?.() ?? update.player ?? 'unknown';
        byPlayer.set(player, update);
      }
      return Array.from(byPlayer.values()).sort((a, b) => {
        const timeA = this.toBigInt(a.timestamp) ?? 0n;
        const timeB = this.toBigInt(b.timestamp) ?? 0n;
        return Number(timeB - timeA);
      });
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard events:', error);
      return [];
    }
  }
}

// Export singleton instance
export const dataStreamsService = new DataStreamsService();
