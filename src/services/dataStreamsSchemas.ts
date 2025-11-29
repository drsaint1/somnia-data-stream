import { SchemaEncoder } from '@somnia-chain/streams';
import type { Hex } from 'viem';

/**
 * Schema Definitions for Somnia Racing Data Streams
 *
 * IMPORTANT: For event emission with emitEvents():
 * - Indexed parameters go in argumentTopics array
 * - Non-indexed parameters are encoded in the data field
 *
 * Event schemas (for registration):
 * - RaceStart: indexed = [raceId, player], data = [carId, timestamp, trackName]
 * - RaceProgress: indexed = [raceId], data = [player, carId, lapNumber, lapTime, currentPosition, timestamp]
 * - RaceFinish: indexed = [raceId, player], data = [carId, finalPosition, totalTime, totalLaps, rewardsEarned, timestamp]
 * - LeaderboardUpdate: indexed = [player], data = [totalXP, totalRaces, totalWins, rank, timestamp]
 */

// Data schemas (NON-indexed parameters only - for encoding in data field)
export const RACE_START_DATA_SCHEMA =
  'string trackName, uint256 carId, uint64 timestamp';

export const RACE_PROGRESS_DATA_SCHEMA =
  'uint8 lapNumber, uint256 carId, uint64 lapTime, uint32 currentPosition, uint64 timestamp, address player';

export const RACE_FINISH_DATA_SCHEMA =
  'uint32 finalPosition, uint256 carId, uint64 totalTime, uint32 totalLaps, uint256 rewardsEarned, uint64 timestamp';

export const LEADERBOARD_UPDATE_DATA_SCHEMA =
  'uint256 totalXP, uint32 totalRaces, uint32 totalWins, uint32 rank, uint64 timestamp';

type EncodedValueInput = {
  name: string;
  value: string;
  type: string;
};

type SchemaDecoded = ReturnType<SchemaEncoder['decodeData']>;

const buildSchemaCoder = (schema: string) => {
  const encoder = new SchemaEncoder(schema);
  return {
    encode: (values: EncodedValueInput[]): Hex => encoder.encodeData(values),
    decode: (data: Hex): SchemaDecoded => encoder.decodeData(data),
  };
};

export const createSchemaEncoders = () => {
  return {
    raceStart: buildSchemaCoder(RACE_START_DATA_SCHEMA),
    raceProgress: buildSchemaCoder(RACE_PROGRESS_DATA_SCHEMA),
    raceFinish: buildSchemaCoder(RACE_FINISH_DATA_SCHEMA),
    leaderboardUpdate: buildSchemaCoder(LEADERBOARD_UPDATE_DATA_SCHEMA),
  };
};

// Type definitions for our data structures
export interface RaceStartData {
  raceId: `0x${string}`;
  player: `0x${string}`;
  carId: bigint;
  timestamp: bigint;
  trackName: string;
}

export interface RaceProgressData {
  raceId: `0x${string}`;
  player: `0x${string}`;
  carId: bigint;
  lapNumber: number;
  lapTime: bigint;
  currentPosition: number;
  timestamp: bigint;
}

export interface RaceFinishData {
  raceId: `0x${string}`;
  player: `0x${string}`;
  carId: bigint;
  finalPosition: number;
  totalTime: bigint;
  totalLaps: number;
  rewardsEarned: bigint;
  timestamp: bigint;
}

export interface LeaderboardUpdateData {
  player: `0x${string}`;
  totalXP: bigint;
  totalRaces: number;
  totalWins: number;
  rank: number;
  timestamp: bigint;
}

export interface TournamentUpdateData {
  tournamentId: `0x${string}`;
  player: `0x${string}`;
  score: bigint;
  position: number;
  prizePool: bigint;
  timestamp: bigint;
}

// Helper function to generate race ID (valid bytes32)
export const generateRaceId = (player: string, timestamp: number): `0x${string}` => {
  // Create a simple hash by combining player address and timestamp
  // Remove '0x' from player address, then append timestamp in hex
  const playerHex = player.slice(2).toLowerCase();
  const timestampHex = timestamp.toString(16).padStart(24, '0');

  // Combine and ensure it's exactly 64 hex characters (32 bytes)
  const combined = (playerHex + timestampHex).slice(0, 64).padEnd(64, '0');

  return `0x${combined}` as `0x${string}`;
};
