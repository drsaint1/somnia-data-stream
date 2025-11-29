import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWatchContractEvent,
} from "wagmi";
import { readContract } from "wagmi/actions";
import { parseEther, formatEther } from "viem";
import { config } from "../config/web3Config";

export const RACING_CONTRACT_ADDRESS = import.meta.env
  .VITE_RACING_CONTRACT_ADDRESS as `0x${string}`;

export const RACING_ABI = [
  {
    inputs: [],
    name: "mintStarterCar",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "mintPremiumCar",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "mintSportCar",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "mintRacingBeast",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "player", type: "address" },
      { internalType: "uint256", name: "carId", type: "uint256" },
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "uint256", name: "distance", type: "uint256" },
      { internalType: "uint256", name: "obstaclesAvoided", type: "uint256" },
      { internalType: "uint256", name: "bonusCollected", type: "uint256" },
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "submitRaceResult",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "player", type: "address" },
      { internalType: "uint256", name: "carId", type: "uint256" },
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "uint256", name: "distance", type: "uint256" },
      { internalType: "uint256", name: "obstaclesAvoided", type: "uint256" },
      { internalType: "uint256", name: "bonusCollected", type: "uint256" },
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "bool", name: "mintTokens", type: "bool" },
    ],
    name: "submitRaceResultWithTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "claimRaceTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "getPendingTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "getTokenBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "parent1Id", type: "uint256" },
      { internalType: "uint256", name: "parent2Id", type: "uint256" },
    ],
    name: "breedCars",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "uint256", name: "carId", type: "uint256" },
    ],
    name: "enterTournament",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint256", name: "entryFee", type: "uint256" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "uint256", name: "maxParticipants", type: "uint256" },
    ],
    name: "createTournament",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "carId", type: "uint256" }],
    name: "stakeCar",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "carId", type: "uint256" }],
    name: "unstakeCar",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "getPlayerCars",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "carId", type: "uint256" }],
    name: "getCarDetails",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "speed", type: "uint256" },
          { internalType: "uint256", name: "handling", type: "uint256" },
          { internalType: "uint256", name: "acceleration", type: "uint256" },
          { internalType: "uint256", name: "rarity", type: "uint256" },
          { internalType: "uint256", name: "experience", type: "uint256" },
          { internalType: "uint256", name: "wins", type: "uint256" },
          { internalType: "uint256", name: "races", type: "uint256" },
          { internalType: "uint256", name: "generation", type: "uint256" },
          { internalType: "uint256", name: "birthTime", type: "uint256" },
          { internalType: "bool", name: "isStaked", type: "bool" },
          { internalType: "uint256", name: "stakedTime", type: "uint256" },
          { internalType: "string", name: "name", type: "string" },
        ],
        internalType: "struct SomniaRacing.RaceCar",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "getPlayerStats",
    outputs: [
      { internalType: "uint256", name: "level", type: "uint256" },
      { internalType: "uint256", name: "totalXP", type: "uint256" },
      { internalType: "uint256", name: "earnings", type: "uint256" },
      { internalType: "uint256", name: "carCount", type: "uint256" },
      { internalType: "uint256", name: "lastReward", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "getTournamentDetails",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "uint256", name: "entryFee", type: "uint256" },
      { internalType: "uint256", name: "prizePool", type: "uint256" },
      { internalType: "uint256", name: "startTime", type: "uint256" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "uint256", name: "participantCount", type: "uint256" },
      { internalType: "bool", name: "finalized", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "getTournamentParticipants",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "getTournamentWinners",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "uint256", name: "carId", type: "uint256" },
    ],
    name: "getTournamentScore",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "getTournamentScores",
    outputs: [
      { internalType: "uint256[]", name: "carIds", type: "uint256[]" },
      { internalType: "uint256[]", name: "scores", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "carId", type: "uint256" }],
    name: "getCarRaceHistory",
    outputs: [
      {
        components: [
          { internalType: "address", name: "player", type: "address" },
          { internalType: "uint256", name: "carId", type: "uint256" },
          { internalType: "uint256", name: "score", type: "uint256" },
          { internalType: "uint256", name: "distance", type: "uint256" },
          {
            internalType: "uint256",
            name: "obstaclesAvoided",
            type: "uint256",
          },
          { internalType: "uint256", name: "bonusCollected", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
          { internalType: "uint256", name: "tournamentId", type: "uint256" },
        ],
        internalType: "struct SomniaRacing.RaceResult[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "address", name: "player", type: "address" },
    ],
    name: "hasPlayerParticipated",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "address", name: "player", type: "address" },
    ],
    name: "getPlayerTournamentCars",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
      { internalType: "address", name: "player", type: "address" },
    ],
    name: "getPlayerTournamentResults",
    outputs: [
      { internalType: "bool", name: "participated", type: "bool" },
      { internalType: "uint256[]", name: "carIds", type: "uint256[]" },
      { internalType: "uint256[]", name: "scores", type: "uint256[]" },
      { internalType: "uint256", name: "bestScore", type: "uint256" },
      { internalType: "uint256", name: "bestRank", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "carId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "rarity",
        type: "uint256",
      },
    ],
    name: "CarMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "TokensMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "score",
        type: "uint256",
      },
    ],
    name: "TokensEarned",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "player",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "carId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "score",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "xpGained",
        type: "uint256",
      },
    ],
    name: "RaceCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "tournamentId",
        type: "uint256",
      },
      { indexed: false, internalType: "string", name: "name", type: "string" },
      {
        indexed: false,
        internalType: "uint256",
        name: "prizePool",
        type: "uint256",
      },
    ],
    name: "TournamentCreated",
    type: "event",
  },
  {
    inputs: [],
    name: "claimDailyReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "tournamentId", type: "uint256" },
    ],
    name: "finalizeTournament",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "nextTournamentId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "limit", type: "uint256" }],
    name: "getLeaderboard",
    outputs: [
      { internalType: "address[]", name: "players", type: "address[]" },
      { internalType: "uint256[]", name: "scores", type: "uint256[]" },
      { internalType: "uint256[]", name: "levels", type: "uint256[]" },
      { internalType: "uint256[]", name: "totalXPs", type: "uint256[]" },
      { internalType: "uint256[]", name: "carCounts", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "newReward", type: "uint256" }],
    name: "setDailyReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_racingToken", type: "address" },
    ],
    name: "setRacingToken",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "player", type: "address" },
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "bool", name: "isTournament", type: "bool" },
    ],
    name: "mintRaceReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "score", type: "uint256" },
      { internalType: "bool", name: "isTournament", type: "bool" },
    ],
    name: "getRewardEstimate",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDailyChallengeReward",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "rewardAmount", type: "uint256" },
    ],
    name: "getDailyChallengeRewardCustom",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface CarNFT {
  id: number;
  speed: number;
  handling: number;
  acceleration: number;
  rarity: number;
  experience: number;
  wins: number;
  races: number;
  generation: number;
  birthTime: number;
  isStaked: boolean;
  stakedTime: number;
  name: string;
  color?: string;
}

export interface PlayerStats {
  level: number;
  totalXP: number;
  earnings: number;
  carCount: number;
  lastReward: number;
}

export interface Tournament {
  id: number;
  name: string;
  entryFee: bigint;
  prizePool: bigint;
  startTime: number;
  endTime: number;
  participantCount: number;
  finalized: boolean;
}

export const useRacingContract = () => {
  const { address, isConnected } = useAccount();
  const { writeContract, writeContractAsync, isPending } = useWriteContract();

  const [playerCars, setPlayerCars] = useState<CarNFT[]>([]);
  const [selectedCar, setSelectedCar] = useState<CarNFT | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: playerCarsData, refetch: refetchCars } = useReadContract({
    address: RACING_CONTRACT_ADDRESS,
    abi: RACING_ABI,
    functionName: "getPlayerCars",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: playerStatsData, refetch: refetchStats } = useReadContract({
    address: RACING_CONTRACT_ADDRESS,
    abi: RACING_ABI,
    functionName: "getPlayerStats",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useWatchContractEvent({
    address: RACING_CONTRACT_ADDRESS,
    abi: RACING_ABI,
    eventName: "CarMinted",
    onLogs(_logs) {
      refetchCars();
      refetchStats();
    },
  });

  useWatchContractEvent({
    address: RACING_CONTRACT_ADDRESS,
    abi: RACING_ABI,
    eventName: "RaceCompleted",
    onLogs(_logs) {
      refetchCars();
      refetchStats();
    },
  });

  useEffect(() => {
    const loadCarDetails = async () => {
      if (!playerCarsData || playerCarsData.length === 0) {
        setPlayerCars([]);
        return;
      }

      setLoading(true);
      try {
        const cars: CarNFT[] = [];

        // Fetch  car data from contract
        for (const carId of playerCarsData) {
          try {
            const contractCarData = await readContract(config, {
              address: RACING_CONTRACT_ADDRESS,
              abi: RACING_ABI,
              functionName: "getCarDetails",
              args: [carId],
            });

            const carData = {
              id: Number(carId),
              speed: Number(contractCarData.speed),
              handling: Number(contractCarData.handling),
              acceleration: Number(contractCarData.acceleration),
              rarity: Number(contractCarData.rarity),
              experience: Number(contractCarData.experience),
              wins: Number(contractCarData.wins),
              races: Number(contractCarData.races),
              generation: Number(contractCarData.generation),
              birthTime: Number(contractCarData.birthTime),
              isStaked: contractCarData.isStaked,
              stakedTime: Number(contractCarData.stakedTime),
              name: contractCarData.name,
              color: getCarColorName(contractCarData.name),
            };

            console.log(`🔍 Car ${carId} loaded from contract:`, {
              id: carData.id,
              name: carData.name,
              color: carData.color,
              contractName: contractCarData.name,
              speed: carData.speed,
            });
            cars.push(carData);
          } catch (error) {
            console.error(` Failed to load car ${carId} from contract:`, error);

            const fallbackName = getCarNameById(Number(carId));
            const fallbackCarData = {
              id: Number(carId),
              speed: 50 + (Number(carId) % 30),
              handling: 55 + (Number(carId) % 25),
              acceleration: 60 + (Number(carId) % 20),
              rarity: Math.min(
                5,
                Math.max(1, Math.floor(Number(carId) / 2) + 1)
              ),
              experience: 0,
              wins: 0,
              races: 0,
              generation: 1,
              birthTime: Date.now() / 1000,
              isStaked: false,
              stakedTime: 0,
              name: fallbackName,
              color: getCarColorName(fallbackName),
            };
            cars.push(fallbackCarData);
          }
        }

        setPlayerCars(cars);

        if (cars.length > 0 && !selectedCar) {
          const availableCar = cars.find((car) => !car.isStaked);
          if (availableCar) {
            setSelectedCar(availableCar);
            console.log(
              "🚗 Auto-selected available car:",
              availableCar.name,
              `(ID: ${availableCar.id})`
            );
          } else {
            console.log("⚠️ All cars are staked - no car auto-selected");
            setSelectedCar(null);
          }
        } else if (selectedCar && cars.length > 0) {
          const currentCar = cars.find((car) => car.id === selectedCar.id);
          if (currentCar && currentCar.isStaked) {
            const availableCar = cars.find((car) => !car.isStaked);
            if (availableCar) {
              setSelectedCar(availableCar);
              console.log(
                "🔄 Selected car became staked, switched to:",
                availableCar.name,
                `(ID: ${availableCar.id})`
              );
            } else {
              setSelectedCar(null);
              console.log(
                "⚠️ Selected car became staked and no alternatives available"
              );
            }
          }
        }
      } catch (err) {
        setError("Failed to load car details");
        console.error("Failed to load car details:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCarDetails();
  }, [playerCarsData, selectedCar]);

  useEffect(() => {
    if (playerStatsData) {
      setPlayerStats({
        level: Number(playerStatsData[0]),
        totalXP: Number(playerStatsData[1]),
        earnings: Number(playerStatsData[2]),
        carCount: Number(playerStatsData[3]),
        lastReward: Number(playerStatsData[4]),
      });
    }
  }, [playerStatsData]);

  const mintStarterCar = useCallback(async () => {
    try {
      setError(null);
      const txHash = await writeContractAsync({
        address: RACING_CONTRACT_ADDRESS,
        abi: RACING_ABI,
        functionName: "mintStarterCar",
        value: parseEther("0.01"),
        gas: 3000000n,
      });
      return txHash;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to mint starter car";
      setError(errorMessage);
      throw err;
    }
  }, [writeContractAsync]);

  const mintPremiumCar = useCallback(async () => {
    try {
      setError(null);
      await writeContract({
        address: RACING_CONTRACT_ADDRESS,
        abi: RACING_ABI,
        functionName: "mintPremiumCar",
        value: parseEther("0.05"),
        gas: 3000000n,
      });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to mint premium car";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [writeContract]);

  const mintSportCar = useCallback(async () => {
    try {
      setError(null);
      const txHash = await writeContractAsync({
        address: RACING_CONTRACT_ADDRESS,
        abi: RACING_ABI,
        functionName: "mintSportCar",
        value: parseEther("0.05"),
        gas: 3000000n,
      });
      return txHash;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to mint sport car";
      setError(errorMessage);
      throw err;
    }
  }, [writeContractAsync]);

  const mintRacingBeast = useCallback(async () => {
    try {
      setError(null);
      const txHash = await writeContractAsync({
        address: RACING_CONTRACT_ADDRESS,
        abi: RACING_ABI,
        functionName: "mintRacingBeast",
        value: parseEther("0.08"),
        gas: 3000000n,
      });
      return txHash;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to mint racing beast";
      setError(errorMessage);
      throw err;
    }
  }, [writeContractAsync]);

  const submitRaceResult = useCallback(
    async (
      carId: number,
      score: number,
      distance: number,
      obstaclesAvoided: number,
      bonusCollected: number,
      tournamentId: number = 0
    ) => {
      if (!address) throw new Error("Wallet not connected");

      try {
        setError(null);
        await writeContract({
          address: RACING_CONTRACT_ADDRESS,
          abi: RACING_ABI,
          functionName: "submitRaceResult",
          gas: 3000000n,
          args: [
            address,
            BigInt(carId),
            BigInt(score),
            BigInt(distance),
            BigInt(obstaclesAvoided),
            BigInt(bonusCollected),
            BigInt(tournamentId),
          ],
        });

        setTimeout(() => {
          refetchCars();
          refetchStats();
        }, 2000);
      } catch (err: any) {
        const errorMessage = err.message || "Failed to submit race result";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [address, writeContract, refetchCars, refetchStats]
  );

  const breedCars = useCallback(
    async (parent1Id: number, parent2Id: number) => {
      try {
        setError(null);
        await writeContract({
          address: RACING_CONTRACT_ADDRESS,
          abi: RACING_ABI,
          functionName: "breedCars",
          args: [BigInt(parent1Id), BigInt(parent2Id)],
          value: parseEther("0.01"), // Breeding cost
          gas: 3000000n,
        });
      } catch (err: any) {
        const errorMessage = err.message || "Failed to breed cars";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [writeContract]
  );

  const stakeCar = useCallback(
    async (carId: number) => {
      try {
        setError(null);
        const txHash = await writeContractAsync({
          address: RACING_CONTRACT_ADDRESS,
          abi: RACING_ABI,
          functionName: "stakeCar",
          args: [BigInt(carId)],
        });
        return txHash;
      } catch (err: any) {
        const errorMessage = err.message || "Failed to stake car";
        setError(errorMessage);
        throw err;
      }
    },
    [writeContractAsync]
  );

  const unstakeCar = useCallback(
    async (carId: number) => {
      try {
        setError(null);
        const txHash = await writeContractAsync({
          address: RACING_CONTRACT_ADDRESS,
          abi: RACING_ABI,
          functionName: "unstakeCar",
          args: [BigInt(carId)],
        });
        return txHash;
      } catch (err: any) {
        const errorMessage = err.message || "Failed to unstake car";
        setError(errorMessage);
        throw err;
      }
    },
    [writeContractAsync]
  );

  const createTournament = useCallback(
    async (
      name: string,
      entryFee: string,
      duration: number,
      maxParticipants: number,
      prizePool: string
    ) => {
      try {
        setError(null);
        await writeContract({
          address: RACING_CONTRACT_ADDRESS,
          abi: RACING_ABI,
          functionName: "createTournament",
          args: [
            name,
            parseEther(entryFee),
            BigInt(duration),
            BigInt(maxParticipants),
          ],
          value: parseEther(prizePool),
          gas: 3000000n,
        });
      } catch (err: any) {
        const errorMessage = err.message || "Failed to create tournament";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [writeContract]
  );

  const joinTournament = useCallback(
    async (tournamentId: number, carId: number, entryFee: bigint) => {
      try {
        setError(null);
        await writeContract({
          address: RACING_CONTRACT_ADDRESS,
          abi: RACING_ABI,
          functionName: "enterTournament",
          args: [BigInt(tournamentId), BigInt(carId)],
          value: entryFee,
          gas: 3000000n,
        });
      } catch (err: any) {
        const errorMessage = err.message || "Failed to join tournament";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [writeContract]
  );

  const getCarColorName = (carName: string): string => {
    const name = carName?.toLowerCase() || "";

    if (name.includes("starter")) return "Purple";
    if (name.includes("sport")) return "Blue";
    if (name.includes("racing beast")) return "Green";
    if (name.includes("gen-") && name.includes("hybrid")) return "Gold";

    return "Gray";
  };

  const getCarNameById = (carId: number): string => {
    console.warn(
      `⚠️ Using fallback naming for car ${carId} - contract call likely failed`
    );

    return `Car #${carId} (Unknown Type)`;
  };

  const getRarityName = (rarity: number): string => {
    const rarityNames = ["", "Common", "Uncommon", "Rare", "Epic", "Legendary"];
    return rarityNames[rarity] || "Unknown";
  };

  const getRarityColor = (rarity: number): string => {
    const rarityColors = {
      1: "text-gray-400",
      2: "text-green-400",
      3: "text-blue-400",
      4: "text-purple-400",
      5: "text-orange-400",
    };
    return rarityColors[rarity as keyof typeof rarityColors] || "text-gray-400";
  };

  const getCarPowerLevel = (car: CarNFT): number => {
    return Math.floor((car.speed + car.handling + car.acceleration) / 3);
  };

  const canBreed = (car1: CarNFT, car2: CarNFT): boolean => {
    const BREEDING_COOLDOWN = 24 * 60 * 60 * 1000;
    const now = Date.now();

    return (
      car1.id !== car2.id &&
      !car1.isStaked &&
      !car2.isStaked &&
      now - car1.birthTime * 1000 >= BREEDING_COOLDOWN &&
      now - car2.birthTime * 1000 >= BREEDING_COOLDOWN
    );
  };

  const getStakingRewards = (car: CarNFT): number => {
    if (!car.isStaked) return 0;

    const STAKE_REWARD_RATE = 100; // XP per day
    const stakingDuration = (Date.now() - car.stakedTime * 1000) / 1000; // seconds
    const daysStaked = stakingDuration / (24 * 60 * 60);

    return Math.floor(daysStaked * STAKE_REWARD_RATE);
  };

  const formatXP = (xp: number): string => {
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
  };

  const formatEarnings = (earnings: number): string => {
    return `${formatEther(BigInt(earnings))} ETH`;
  };

  const safeSetSelectedCar = (car: CarNFT | null) => {
    if (!car) {
      setSelectedCar(null);
      return;
    }

    if (car.isStaked) {
      console.warn("🚫 Cannot select staked car:", car.name, `(ID: ${car.id})`);

      const availableCar = playerCars.find((c) => !c.isStaked);
      if (availableCar) {
        setSelectedCar(availableCar);
        console.log(
          "🔄 Switched to available car:",
          availableCar.name,
          `(ID: ${availableCar.id})`
        );
      } else {
        setSelectedCar(null);
        console.log("⚠️ No available cars to select");
      }
      return;
    }

    setSelectedCar(car);
    console.log("✅ Selected available car:", car.name, `(ID: ${car.id})`);
  };

  return {
    selectedCar,
    playerCars,
    playerStats,
    loading,
    error,
    isPending,
    isConnected,

    setSelectedCar: safeSetSelectedCar,
    mintStarterCar,
    mintPremiumCar,
    mintSportCar,
    mintRacingBeast,
    submitRaceResult,
    breedCars,
    stakeCar,
    unstakeCar,
    createTournament,
    joinTournament,
    refetchCars,
    refetchStats,

    getRarityName,
    getRarityColor,
    getCarPowerLevel,
    canBreed,
    getStakingRewards,
    formatXP,
    formatEarnings,

    RACING_CONTRACT_ADDRESS,
    RACING_ABI,
  };
};

export default useRacingContract;
