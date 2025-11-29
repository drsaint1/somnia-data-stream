import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

interface GameGroup extends THREE.Group {
  collected?: boolean;
}
import {
  useAccount,
  useDisconnect,
  useWriteContract,
  useReadContract,
  useWatchContractEvent,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import {
  useRacingContract,
  RACING_CONTRACT_ADDRESS,
  RACING_ABI,
} from "../hooks/useRacingContract";
import {
  RACING_TOKEN_ADDRESS,
  RACING_TOKEN_ABI,
} from "../contracts/racingTokenAbi";
import { useRaceBroadcaster } from "../hooks/useDataStreams";
import CarGarage from "./CarGarage";
import somniaLogo from "../assets/somnia-logo.jpeg";

interface CarNFT {
  id: number;
  speed: number;
  handling: number;
  acceleration: number;
  rarity: number;
  experience: number;
  wins: number;
  races: number;
  name: string;
  color?: string;
}

interface GameHistory {
  id: string;
  score: number;
  distance: number;
  obstaclesAvoided: number;
  bonusBoxesCollected: number;
  lapTime: number;
  carUsed: string;
  timestamp: number;
  isNewHighScore: boolean;
}

interface DailyChallenge {
  type: "score" | "distance" | "survival" | "speed" | "keys" | "bonus";
  target: number;
  reward: number;
  title: string;
  description: string;
  emoji: string;
  difficulty: "easy" | "medium" | "hard";
}

interface EnhancedCarRaceGameProps {
  activeTournamentId?: number | null;
  onTournamentCompleted?: (tournamentId: number) => void;
  onNavigateToTournaments?: () => void;
  onNavigateToMenu?: () => void;
}

const EnhancedCarRaceGame: React.FC<EnhancedCarRaceGameProps> = ({
  activeTournamentId = null,
  onTournamentCompleted,
  onNavigateToTournaments,
  onNavigateToMenu,
}) => {
  const { address, isConnected } = useAccount();
  const {} = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const {
    playerCars,
    selectedCar,
    setSelectedCar,
    refetchCars,
    loading: carLoading,
  } = useRacingContract();

  // Data Streams integration for live broadcasting
  const {
    broadcastRaceStart,
    broadcastRaceFinish,
    broadcastLeaderboardUpdate,
  } = useRaceBroadcaster();

  const [currentRaceId, setCurrentRaceId] = useState<string | null>(null);

  const [,] = useState<"practice" | "tournament" | "daily">("practice");
  const [showCarSelection, setShowCarSelection] = useState(false);
  const [carSelectionMode, setCarSelectionMode] = useState<"select" | "mint">(
    "select"
  );
  const [showGarage, setShowGarage] = useState(false);
  const [dailyChallengeCompleted, setDailyChallengeCompleted] = useState(false);
  const [isDailyChallengeRace, setIsDailyChallengeRace] = useState(false);
  const [currentDailyChallenge, setCurrentDailyChallenge] =
    useState<DailyChallenge | null>(null);
  const [tournamentId, setTournamentId] = useState<number | null>(null);
  const [tournamentRaceCompleted, setTournamentRaceCompleted] = useState(false);
  const [completedChallengeReward, setCompletedChallengeReward] = useState<
    number | null
  >(null);
  const [showRaceHistory, setShowRaceHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(1.0);

  const [highScore, setHighScore] = useState(0);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [autoSubmitResults, setAutoSubmitResults] = useState(false);
  const [isClaimingTokens, setIsClaimingTokens] = useState(false);
  const [hasSubmittedCurrentRace, setHasSubmittedCurrentRace] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "waiting_wallet" | "confirming" | "success" | "error"
  >("idle");
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | undefined>(
    undefined
  );
  const [showBreedingModal, setShowBreedingModal] = useState(false);
  const [selectedParent1, setSelectedParent1] = useState<number | null>(null);
  const [selectedParent2, setSelectedParent2] = useState<number | null>(null);
  const [breedingNotification, setBreedingNotification] = useState<
    string | null
  >(null);

  const [pendingTokens, setPendingTokens] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [,] = useState(false);

  // Car customization
  const [,] = useState({
    bodyColor: "#ff4444",
    rimColor: "#ffd700",
    spoiler: false,
    neonLights: false,
    livery: 0,
  });

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const carRef = useRef<THREE.Group | null>(null);
  const roadRef = useRef<THREE.Mesh | null>(null);
  const roadLinesRef = useRef<THREE.Mesh[]>([]);
  const obstaclesRef = useRef<GameGroup[]>([]);
  const bonusBoxesRef = useRef<GameGroup[]>([]);
  const goldenKeysRef = useRef<GameGroup[]>([]);
  const invisibilityIndicatorRef = useRef<THREE.Mesh | null>(null);
  const animationIdRef = useRef<number>(0);

  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const gameStateRef = useRef({
    carPosition: 0,
    targetCarPosition: 0,
    baseGameSpeed: 0.008,
    speedMultiplier: 1.0,
    obstacleSpawnRate: 0.015,
    nextBonusThreshold: 70,
    gameStartTime: Date.now(),
    nextKeySpawnTime: 20,
    keySpawnInterval: 40,
    isInvisible: false,
    invisibilityTimer: 0,
    currentScore: 0,

    speedBonus: 1.0,
    handlingBonus: 1.0,
    accelerationBonus: 1.0,
    maxSpeedForCar: 2.0,
  });

  const gameRunningRef = useRef(false);

  const gameStatsRef = useRef({
    distance: 0,
    obstaclesAvoided: 0,
    bonusBoxesCollected: 0,
    gameStartTime: Date.now(),
    finalScore: 0,
    lapTime: 0,
  });

  const [gameStatsDisplay, setGameStatsDisplay] = useState({
    distance: 0,
    obstaclesAvoided: 0,
    bonusBoxesCollected: 0,
  });

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const generateDailyChallenge = (): DailyChallenge => {
    const today = new Date().toDateString();
    const dateHash = today.split("").reduce((hash, char) => {
      return (hash << 5) - hash + char.charCodeAt(0);
    }, 0);

    const seed = Math.abs(dateHash) % 1000000;

    const challengeTypes = [
      {
        type: "score" as const,
        targets: [400, 500, 600, 700, 800, 900, 1000],
        rewards: [150, 200, 250, 300, 350, 400, 500],
        difficulties: [
          "easy",
          "easy",
          "medium",
          "medium",
          "hard",
          "hard",
          "hard",
        ] as const,
        titles: [
          "Score Hunter",
          "Point Collector",
          "High Scorer",
          "Score Master",
          "Elite Scorer",
          "Score Legend",
          "Perfect Score",
        ],
        emoji: "🎯",
      },
      {
        type: "distance" as const,
        targets: [500, 750, 1000, 1250, 1500, 2000, 2500],
        rewards: [200, 250, 300, 350, 400, 450, 600],
        difficulties: [
          "easy",
          "easy",
          "medium",
          "medium",
          "medium",
          "hard",
          "hard",
        ] as const,
        titles: [
          "Distance Runner",
          "Long Hauler",
          "Marathon Racer",
          "Distance Master",
          "Endurance King",
          "Mile Crusher",
          "Distance Legend",
        ],
        emoji: "🏃",
      },
      {
        type: "survival" as const,
        targets: [10, 15, 20, 25, 30, 40, 50],
        rewards: [300, 350, 400, 450, 500, 600, 700],
        difficulties: [
          "easy",
          "easy",
          "medium",
          "medium",
          "medium",
          "hard",
          "hard",
        ] as const,
        titles: [
          "Survivor",
          "Dodge Master",
          "Obstacle Avoider",
          "Survival Expert",
          "Untouchable",
          "Perfect Dodger",
          "Survival Legend",
        ],
        emoji: "🛡️",
      },
      {
        type: "speed" as const,
        targets: [45, 40, 35, 30, 25, 20, 15],
        rewards: [250, 300, 350, 400, 450, 500, 600],
        difficulties: [
          "easy",
          "easy",
          "medium",
          "medium",
          "medium",
          "hard",
          "hard",
        ] as const,
        titles: [
          "Speed Demon",
          "Quick Racer",
          "Fast Lane",
          "Speed Master",
          "Lightning Fast",
          "Speed King",
          "Velocity Legend",
        ],
        emoji: "⚡",
      },
      {
        type: "keys" as const,
        targets: [2, 3, 4, 5, 6, 8, 10],
        rewards: [350, 400, 450, 500, 550, 650, 800],
        difficulties: [
          "easy",
          "easy",
          "medium",
          "medium",
          "medium",
          "hard",
          "hard",
        ] as const,
        titles: [
          "Key Finder",
          "Treasure Hunter",
          "Key Collector",
          "Golden Hunter",
          "Key Master",
          "Treasure King",
          "Golden Legend",
        ],
        emoji: "🔑",
      },
      {
        type: "bonus" as const,
        targets: [3, 5, 7, 10, 12, 15, 20],
        rewards: [200, 250, 300, 400, 450, 550, 700],
        difficulties: [
          "easy",
          "easy",
          "medium",
          "medium",
          "medium",
          "hard",
          "hard",
        ] as const,
        titles: [
          "Bonus Hunter",
          "Box Collector",
          "Bonus Master",
          "Gift Grabber",
          "Bonus King",
          "Perfect Collector",
          "Bonus Legend",
        ],
        emoji: "🎁",
      },
    ];

    const typeIndex = seed % challengeTypes.length;
    const chosenType = challengeTypes[typeIndex];
    const difficultyIndex = (seed >> 3) % chosenType.targets.length;

    const challenge: DailyChallenge = {
      type: chosenType.type,
      target: chosenType.targets[difficultyIndex],
      reward: chosenType.rewards[difficultyIndex],
      title: chosenType.titles[difficultyIndex],
      description: `${chosenType.emoji} ${getDescriptionForChallenge(
        chosenType.type,
        chosenType.targets[difficultyIndex]
      )}`,
      emoji: chosenType.emoji,
      difficulty: chosenType.difficulties[difficultyIndex],
    };

    return challenge;
  };

  const getDescriptionForChallenge = (
    type: DailyChallenge["type"],
    target: number
  ): string => {
    switch (type) {
      case "score":
        return `Reach ${target} points in a single race`;
      case "distance":
        return `Travel ${target} meters without crashing`;
      case "survival":
        return `Avoid ${target} obstacles in one race`;
      case "speed":
        return `Complete a race in under ${target} seconds`;
      case "keys":
        return `Collect ${target} golden keys in one race`;
      case "bonus":
        return `Collect ${target} bonus boxes in one race`;
      default:
        return "Complete the challenge";
    }
  };

  const checkChallengeCompletion = (challenge: DailyChallenge): boolean => {
    const finalScore = gameStatsRef.current.finalScore;
    const distance = gameStatsRef.current.distance;
    const obstaclesAvoided = gameStatsRef.current.obstaclesAvoided;
    const bonusBoxesCollected = gameStatsRef.current.bonusBoxesCollected;
    const lapTime = gameStatsRef.current.lapTime;

    // Count golden keys collected during the race
    const keysCollected = goldenKeysRef.current.filter(
      (key) => key.collected
    ).length;

    let completed = false;
    switch (challenge.type) {
      case "score":
        completed = finalScore >= challenge.target;
        break;
      case "distance":
        completed = distance >= challenge.target;
        break;
      case "survival":
        completed = obstaclesAvoided >= challenge.target;
        break;
      case "speed":
        completed = lapTime > 0 && lapTime <= challenge.target;
        break;
      case "keys":
        completed = keysCollected >= challenge.target;
        break;
      case "bonus":
        completed = bonusBoxesCollected >= challenge.target;
        break;
      default:
        completed = false;
    }

    return completed;
  };

  const getChallengeProgress = (challenge: DailyChallenge): string => {
    const finalScore = gameStatsRef.current.finalScore;
    const distance = gameStatsRef.current.distance;
    const obstaclesAvoided = gameStatsRef.current.obstaclesAvoided;
    const bonusBoxesCollected = gameStatsRef.current.bonusBoxesCollected;
    const lapTime = gameStatsRef.current.lapTime;
    const keysCollected = goldenKeysRef.current.filter(
      (key) => key.collected
    ).length;

    switch (challenge.type) {
      case "score":
        return `${finalScore}/${challenge.target} points`;
      case "distance":
        return `${Math.floor(distance)}/${challenge.target} meters`;
      case "survival":
        return `${obstaclesAvoided}/${challenge.target} obstacles avoided`;
      case "speed":
        return `${lapTime.toFixed(1)}s (need ≤${challenge.target}s)`;
      case "keys":
        return `${keysCollected}/${challenge.target} keys collected`;
      case "bonus":
        return `${bonusBoxesCollected}/${challenge.target} bonus boxes`;
      default:
        return "No progress";
    }
  };

  const getCurrentChallengeProgress = (): string => {
    if (!currentDailyChallenge) return "";

    const currentScore = score;
    const currentDistance = Math.floor(gameStatsRef.current.distance);
    const currentObstacles = gameStatsRef.current.obstaclesAvoided;
    const currentBonus = gameStatsRef.current.bonusBoxesCollected;
    const currentKeys = goldenKeysRef.current.filter(
      (key) => key.collected
    ).length;
    const currentTime = gameRunning
      ? (Date.now() - gameStatsRef.current.gameStartTime) / 1000
      : 0;

    switch (currentDailyChallenge.type) {
      case "score":
        return `${currentScore}/${currentDailyChallenge.target} points`;
      case "distance":
        return `${currentDistance}/${currentDailyChallenge.target} meters`;
      case "survival":
        return `${currentObstacles}/${currentDailyChallenge.target} obstacles avoided`;
      case "speed":
        return `${currentTime.toFixed(1)}s (need ≤${
          currentDailyChallenge.target
        }s)`;
      case "keys":
        return `${currentKeys}/${currentDailyChallenge.target} keys collected`;
      case "bonus":
        return `${currentBonus}/${currentDailyChallenge.target} bonus boxes`;
      default:
        return "0/0";
    }
  };

  // Checking for daily challenge completion
  const checkDailyChallengeStatus = () => {
    const today = new Date().toDateString();
    const savedChallengeDate = localStorage.getItem(
      "somniaRacing_dailyChallengeDate"
    );
    const savedChallengeCompleted = localStorage.getItem(
      "somniaRacing_dailyChallengeCompleted"
    );

    // Generate today's challenge
    const todaysChallenge = generateDailyChallenge();
    setCurrentDailyChallenge(todaysChallenge);

    if (savedChallengeDate === today && savedChallengeCompleted === "true") {
      setDailyChallengeCompleted(true);
    } else {
      setDailyChallengeCompleted(false);

      if (savedChallengeDate !== today) {
        localStorage.setItem("somniaRacing_dailyChallengeDate", today);
        localStorage.setItem(
          "somniaRacing_dailyChallengeCompleted",
          "false"
        );
      }
    }
  };

  useEffect(() => {
    const savedHighScore = localStorage.getItem("somniaRacing_highScore");
    const savedHistory = localStorage.getItem("somniaRacing_gameHistory");

    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }

    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setGameHistory(history);
      } catch (e) {
        console.error("Error loading game history:", e);
      }
    }

    // Check daily challenge status
    checkDailyChallengeStatus();
  }, []);

  useEffect(() => {
    setTournamentId(activeTournamentId);

    setTournamentRaceCompleted(false);

    if (activeTournamentId && selectedCar && !tournamentRaceCompleted) {
      setShowMenu(false);
      setGameOver(false);
    }
  }, [activeTournamentId, selectedCar]);

  const saveHighScore = (newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      setIsNewHighScore(true);
      localStorage.setItem("somniaRacing_highScore", newScore.toString());
      return true;
    }
    return false;
  };

  const saveGameToHistory = (gameData: Omit<GameHistory, "id">) => {
    const newGame: GameHistory = {
      ...gameData,
      id: Date.now().toString(),
    };

    const updatedHistory = [newGame, ...gameHistory].slice(0, 50);
    setGameHistory(updatedHistory);
    localStorage.setItem(
      "somniaRacing_gameHistory",
      JSON.stringify(updatedHistory)
    );
  };

  const [showMissionComplete, setShowMissionComplete] = useState<string | null>(
    null
  );
  const [purchaseConfirmation, setPurchaseConfirmation] = useState<
    string | null
  >(null);
  const [purchasingCar, setPurchasingCar] = useState<string>("");
  const [invisibilityActive, setInvisibilityActive] = useState(false);
  const [invisibilityCountdown, setInvisibilityCountdown] = useState(0);

  const { data: pendingTokensData, refetch: refetchPendingTokens } =
    useReadContract({
      address: RACING_CONTRACT_ADDRESS,
      abi: RACING_ABI,
      functionName: "getPendingTokens",
      args: address ? [address] : undefined,
      query: { enabled: !!address },
    });

  const { data: tokenBalanceData, refetch: refetchTokenBalance } =
    useReadContract({
      address: RACING_CONTRACT_ADDRESS,
      abi: RACING_ABI,
      functionName: "getTokenBalance",
      args: address ? [address] : undefined,
      query: { enabled: !!address },
    });

  // Query player stats for Data Streams leaderboard broadcasting
  const { data: playerStatsData, refetch: refetchPlayerStats } =
    useReadContract({
      address: RACING_CONTRACT_ADDRESS,
      abi: RACING_ABI,
      functionName: "getPlayerStats",
      args: address ? [address] : undefined,
      query: { enabled: !!address },
    });

  const {
    data: txReceipt,
    isSuccess: isTxConfirmed,
    isError: isTxError,
  } = useWaitForTransactionReceipt({
    hash: currentTxHash,
    query: { enabled: !!currentTxHash },
  });

  useWatchContractEvent({
    address: RACING_CONTRACT_ADDRESS,
    abi: RACING_ABI,
    eventName: "CarMinted",
    onLogs(_logs) {
      refetchCars();
    },
  });

  useWatchContractEvent({
    address: RACING_TOKEN_ADDRESS,
    abi: RACING_TOKEN_ABI,
    eventName: "Transfer",
    args: {
      to: address,
    },
    onLogs(_logs) {
      setTimeout(() => {
        refetchTokenBalance();
      }, 1000);
    },
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (pendingTokensData !== undefined) {
      const newPendingTokens = Number(pendingTokensData);
      setPendingTokens(newPendingTokens);
    }
  }, [pendingTokensData]);

  useEffect(() => {
    if (tokenBalanceData !== undefined) {
      const newTokenBalance = Number(tokenBalanceData);
      setTokenBalance(newTokenBalance);
    }
  }, [tokenBalanceData]);

  const showPopup = useCallback((text: string) => {
    setShowMissionComplete(text);
    setTimeout(() => setShowMissionComplete(null), 4000);
  }, []);

  const showBreedingNotification = useCallback((text: string) => {
    setBreedingNotification(text);
    setTimeout(() => setBreedingNotification(null), 5000);
  }, []);

  const claimRaceTokens = useCallback(async () => {
    if (!address) return;

    try {
      setIsClaimingTokens(true);
      await writeContractAsync({
        address: RACING_CONTRACT_ADDRESS,
        abi: RACING_ABI,
        functionName: "claimRaceTokens",
        args: [address],
      });

      refetchPendingTokens();
      refetchTokenBalance();
      showPopup("🪙 Race tokens claimed successfully!");
    } catch (error) {
      showPopup("❌ Failed to claim tokens. Try again later.");
    } finally {
      setIsClaimingTokens(false);
    }
  }, [
    address,
    writeContractAsync,
    refetchPendingTokens,
    refetchTokenBalance,
    showPopup,
  ]);

  useEffect(() => {
    if (isTxConfirmed && currentTxHash) {
      setSubmissionStatus("success");
      setHasSubmittedCurrentRace(true);
      setIsSubmittingScore(false);
      setCompletedChallengeReward(null);

      if (tournamentId) {
        setTournamentRaceCompleted(true);
        if (onTournamentCompleted) {
          onTournamentCompleted(tournamentId);
        }
      }

      if (autoSubmitResults) {
        showPopup("✅ Results auto-saved on Somnia!");
      } else {
        if (isDailyChallengeRace && currentDailyChallenge) {
          showPopup(
            `🏆 Daily Challenge completed! ${currentDailyChallenge.reward} tokens earned!`
          );
        } else {
          showPopup("✅ Results submitted & tokens earned!");
        }
      }

      if (tournamentId && onNavigateToTournaments) {
        setTimeout(() => {
          showPopup("🏆 Returning to tournament lobby to view results...");
          setTimeout(() => {
            onNavigateToTournaments();
          }, 2000);
        }, 3000);
      } else if (currentDailyChallenge && onNavigateToMenu) {
        const challengeCompleted = checkChallengeCompletion(currentDailyChallenge);
        
        if (challengeCompleted && (isDailyChallengeRace || !tournamentId)) {
          setTimeout(() => {
            showPopup("🔒 Returning to main menu to prevent exploits...");
            setTimeout(() => {
              setShowMenu(true);
              setGameRunning(false);
              setGameOver(false);
              setIsDailyChallengeRace(false);
              onNavigateToMenu();
            }, 2000);
          }, 3000);
        }
      }

      // Broadcast race finish and leaderboard update via Data Streams
      if (currentRaceId && address && selectedCar) {
        const lapTime = gameStatsRef.current.lapTime;

        broadcastRaceFinish(
          currentRaceId as `0x${string}`,
          address as `0x${string}`,
          BigInt(selectedCar.id),
          1, // position (can be calculated if needed)
          BigInt(Math.floor(lapTime * 1000)), // total time in ms
          3, // total laps (adjust based on your game)
          BigInt(0) // rewards earned (will be updated after claiming)
        ).then(() => {
          console.log('🏁 Race finish broadcasted to Data Streams');
        }).catch(err => {
          console.log('⚠️ Race finish broadcast failed (non-critical):', err.message);
        });

        // Also broadcast leaderboard update with real player stats
        if (playerStatsData) {
          // playerStatsData returns: [level, totalXP, earnings, carCount, lastReward]
          const level = Number(playerStatsData[0]);
          const totalXP = Number(playerStatsData[1]);
          const carCount = Number(playerStatsData[3]);

          // Calculate approximate total races (can be tracked separately for accuracy)
          const estimatedRaces = Math.floor(totalXP / 10); // Rough estimate

          broadcastLeaderboardUpdate(
            address as `0x${string}`,
            BigInt(totalXP),
            estimatedRaces,
            0, // total wins (would need separate tracking)
            1 // rank (would need leaderboard calculation)
          ).then(() => {
            console.log('📊 Leaderboard update broadcasted:', {
              level,
              totalXP,
              carCount,
              estimatedRaces,
            });
          }).catch(err => {
            console.log('⚠️ Leaderboard broadcast failed (non-critical):', err.message);
          });

          // Refetch stats for next time
          refetchPlayerStats();
        } else {
          console.log('⚠️ Player stats not available for leaderboard broadcast');
        }

        setCurrentRaceId(null); // Clear race ID after broadcasting
      }

      setTimeout(() => {
        refetchPendingTokens();
        refetchTokenBalance();
      }, 2000);

      setCurrentTxHash(undefined);
    }

    if (isTxError && currentTxHash) {
      setSubmissionStatus("error");
      setIsSubmittingScore(false);
      showPopup("❌ Transaction failed. Check console for details.");
      setCurrentTxHash(undefined);
    }
  }, [
    isTxConfirmed,
    isTxError,
    currentTxHash,
    txReceipt,
    autoSubmitResults,
    currentRaceId,
    address,
    selectedCar,
    broadcastRaceFinish,
    broadcastLeaderboardUpdate,
    playerStatsData,
    refetchPlayerStats,
    refetchPendingTokens,
    refetchTokenBalance,
    showPopup,
  ]);

  const hasCarType = (carType: "starter" | "sport" | "racing" | "hybrid") => {
    if (!playerCars || playerCars.length === 0) {
      return false;
    }

    return playerCars.some((car) => {
      if (carType === "starter") {
        return car.name === "Starter Racer" || car.id === 1;
      } else if (carType === "sport") {
        return car.name === "Sport Car";
      } else if (carType === "racing") {
        return car.name === "Racing Beast";
      } else if (carType === "hybrid") {
        return car.name && car.name.includes("Hybrid");
      }
      return false;
    });
  };

  const canBreedCars = (
    car1: CarNFT,
    car2: CarNFT
  ): { canBreed: boolean; reason?: string } => {
    if (car1.id === car2.id) {
      return { canBreed: false, reason: "Cannot breed a car with itself" };
    }

    if ((car1 as any).isStaked || (car2 as any).isStaked) {
      return { canBreed: false, reason: "Cannot breed staked cars" };
    }

    const now = Date.now();
    const BREEDING_COOLDOWN_MS = 24 * 60 * 60 * 1000;

    const car1Age = now - (car1 as any).birthTime * 1000;
    const car2Age = now - (car2 as any).birthTime * 1000;

    if (car1Age < BREEDING_COOLDOWN_MS) {
      const hoursLeft = Math.ceil(
        (BREEDING_COOLDOWN_MS - car1Age) / (60 * 60 * 1000)
      );
      return {
        canBreed: false,
        reason: `Car "${car1.name}" needs ${hoursLeft} more hours before breeding`,
      };
    }

    if (car2Age < BREEDING_COOLDOWN_MS) {
      const hoursLeft = Math.ceil(
        (BREEDING_COOLDOWN_MS - car2Age) / (60 * 60 * 1000)
      );
      return {
        canBreed: false,
        reason: `Car "${car2.name}" needs ${hoursLeft} more hours before breeding`,
      };
    }

    return { canBreed: true };
  };

  // Breeding function for Gen-X Hybrid
  const breedCarsWithConfirmation = async (
    parent1Id: number,
    parent2Id: number
  ) => {
    try {
      const parent1 = playerCars.find((car) => car.id === parent1Id);
      const parent2 = playerCars.find((car) => car.id === parent2Id);

      if (!parent1 || !parent2) {
        showBreedingNotification("❌ Could not find selected cars");
        return;
      }

      const breedingCheck = canBreedCars(parent1, parent2);
      if (!breedingCheck.canBreed) {
        showBreedingNotification(`❌ ${breedingCheck.reason}`);
        return;
      }

      setPurchasingCar("Gen-X Hybrid");
      showBreedingNotification(
        "💳 Please confirm breeding transaction in your wallet..."
      );

      try {
        const { readContract } = await import("wagmi/actions");
        const { config } = await import("../config/web3Config");
        const [owner1, owner2] = await Promise.all([
          readContract(config, {
            address: RACING_CONTRACT_ADDRESS,
            abi: RACING_ABI,
            functionName: "ownerOf",
            args: [BigInt(parent1Id)],
          }),
          readContract(config, {
            address: RACING_CONTRACT_ADDRESS,
            abi: RACING_ABI,
            functionName: "ownerOf",
            args: [BigInt(parent2Id)],
          }),
        ]);

        if (owner1?.toLowerCase() !== address?.toLowerCase()) {
          showBreedingNotification(`❌ You don't own car ${parent1Id}`);
          setPurchasingCar("");
          return;
        }

        if (owner2?.toLowerCase() !== address?.toLowerCase()) {
          showBreedingNotification(`❌ You don't own car ${parent2Id}`);
          setPurchasingCar("");
          return;
        }
      } catch (ownershipError) {
        showBreedingNotification(
          "❌ Could not verify car ownership. Please try again."
        );
        setPurchasingCar("");
        return;
      }

      await writeContractAsync({
        address: RACING_CONTRACT_ADDRESS,
        abi: RACING_ABI,
        functionName: "breedCars",
        args: [BigInt(parent1Id), BigInt(parent2Id)],
        value: parseEther("0.01"),
      });

      showBreedingNotification(
        "🧬 Breeding Successful! Your Gen-X Hybrid has been bred and will appear in your garage shortly!"
      );

      setTimeout(() => {
        refetchCars();
      }, 3000);

      setPurchasingCar("");
    } catch (error: any) {
      let errorMessage = "Breeding failed";

      if (error.message) {
        if (
          error.message.includes("breeding cooldown") ||
          error.message.includes("Parent1 breeding cooldown") ||
          error.message.includes("Parent2 breeding cooldown")
        ) {
          errorMessage =
            "⏰ Cars must wait 24 hours after birth before breeding";
        } else if (
          error.message.includes("Not owner") ||
          error.message.includes("not owner")
        ) {
          errorMessage = "❌ You don't own one or both cars";
        } else if (
          error.message.includes("staked") ||
          error.message.includes("Cars are staked")
        ) {
          errorMessage = "🔒 Cannot breed staked cars";
        } else if (
          error.message.includes("user rejected") ||
          error.message.includes("User denied") ||
          error.code === 4001
        ) {
          errorMessage = "❌ Transaction cancelled by user";
        } else if (
          error.message.includes("insufficient") ||
          error.message.includes("Insufficient breeding fee")
        ) {
          errorMessage =
            "💰 Insufficient funds for breeding fee (need 0.01 STT)";
        } else if (
          error.message.includes("car with itself") ||
          error.message.includes("Cannot breed car with itself")
        ) {
          errorMessage = "❌ Cannot breed a car with itself";
        } else if (error.message.includes("paused")) {
          errorMessage = "⏸️ Contract is currently paused";
        }
      }

      showBreedingNotification(errorMessage);
      setPurchasingCar("");
      throw error;
    }
  };

  const mintCarWithConfirmation = async (
    carType: "starter" | "premium",
    carName: string
  ) => {
    try {
      setPurchasingCar(carName);

      if (carType === "starter") {
        await mintStarterCarLocal();
      } else if (carName === "Sport Car") {
        await mintSportCarLocal();
      } else if (carName === "Racing Beast") {
        await mintRacingBeastLocal();
      } else {
        await mintPremiumCarLocal();
      }

      const isFirstTimeMint = playerCars.length === 0;
      const successMessage = isFirstTimeMint
        ? `🎉 Welcome to Somnia Racing! Your ${carName} has been minted successfully. Redirecting to game...`
        : `🎉 ${carName} successfully purchased! Your new NFT car is ready to race!`;

      setPurchaseConfirmation(successMessage);

      if (refetchCars) {
        await refetchCars();
      }

      setTimeout(async () => {
        if (refetchCars) {
          await refetchCars();
        }
      }, 3000);

      if (isFirstTimeMint) {
        setTimeout(() => {
          setPurchaseConfirmation(null);
          setShowCarSelection(false);
        }, 2500);
      } else {
        setTimeout(() => {
          setPurchaseConfirmation(null);
          setShowCarSelection(false);
        }, 3000);
      }
    } catch (error: any) {
      console.error(`Failed to mint ${carName}:`, error);

      let errorMessage;
      const errorMsg = error?.message?.toLowerCase() || "";
      if (
        errorMsg.includes("user rejected") ||
        errorMsg.includes("rejected") ||
        errorMsg.includes("denied") ||
        errorMsg.includes("cancelled") ||
        errorMsg.includes("user denied")
      ) {
        errorMessage = `❌ Transaction cancelled. ${carName} purchase was not completed.`;
      } else if (
        errorMsg.includes("insufficient funds") ||
        errorMsg.includes("insufficient balance")
      ) {
        errorMessage = `❌ Insufficient funds to purchase ${carName}. You need 0.01 STT.`;
      } else {
        errorMessage = `❌ Failed to purchase ${carName}. Please try again. ${
          error.message || ""
        }`;
      }

      setPurchaseConfirmation(errorMessage);
      setTimeout(() => setPurchaseConfirmation(null), 4000);
    } finally {
      setPurchasingCar("");
    }
  };

  const mintStarterCarLocal = useCallback(async () => {
    try {
      const txHash = await writeContractAsync({
        address: RACING_CONTRACT_ADDRESS,
        abi: RACING_ABI,
        functionName: "mintStarterCar",
        value: parseEther("0.01"),
      });
      return txHash;
    } catch (error) {
      console.error("❌ Failed to mint starter car:", error);
      throw error;
    }
  }, [writeContractAsync]);

  const mintSportCarLocal = useCallback(async () => {
    try {
      const txHash = await writeContractAsync({
        address: RACING_CONTRACT_ADDRESS,
        abi: RACING_ABI,
        functionName: "mintSportCar",
        value: parseEther("0.05"),
      });
      return txHash;
    } catch (error) {
      console.error("❌ Failed to mint sport car:", error);
      throw error;
    }
  }, [writeContractAsync]);

  const mintRacingBeastLocal = useCallback(async () => {
    try {
      const txHash = await writeContractAsync({
        address: RACING_CONTRACT_ADDRESS,
        abi: RACING_ABI,
        functionName: "mintRacingBeast",
        value: parseEther("0.08"),
      });
      return txHash;
    } catch (error) {
      console.error("❌ Failed to mint racing beast:", error);
      throw error;
    }
  }, [writeContractAsync]);

  const mintPremiumCarLocal = useCallback(async () => {
    try {
      const txHash = await writeContractAsync({
        address: RACING_CONTRACT_ADDRESS,
        abi: RACING_ABI,
        functionName: "mintPremiumCar",
        value: parseEther("0.05"),
      });
      return txHash;
    } catch (error) {
      console.error("❌ Failed to mint premium car:", error);
      throw error;
    }
  }, [writeContractAsync]);

  // Submit race result to blockchain
  const submitRaceResult = useCallback(async () => {
    if (!selectedCar || !address || hasSubmittedCurrentRace) return;

    try {
      setIsSubmittingScore(true);
      setSubmissionStatus("waiting_wallet");

      if (autoSubmitResults) {
        showPopup("💳 Please confirm auto-save in your wallet...");
      } else {
        showPopup("💳 Please confirm submission in your wallet...");
      }

      let txHash;

      try {
        txHash = await writeContractAsync({
          address: RACING_CONTRACT_ADDRESS,
          abi: RACING_ABI,
          functionName: "submitRaceResultWithTokens",
          args: [
            address,
            BigInt(selectedCar.id),
            BigInt(gameStatsRef.current.finalScore),
            BigInt(gameStatsRef.current.distance),
            BigInt(gameStatsRef.current.obstaclesAvoided),
            BigInt(gameStatsRef.current.bonusBoxesCollected),
            BigInt(
              (() => {
                let challengeReward = completedChallengeReward;

                if (
                  !challengeReward &&
                  isDailyChallengeRace &&
                  currentDailyChallenge
                ) {
                  const challengeCompleted = checkChallengeCompletion(
                    currentDailyChallenge
                  );
                  if (challengeCompleted) {
                    challengeReward = currentDailyChallenge.reward;
                  }
                }

                if (!challengeReward && currentDailyChallenge) {
                  const challengeCompleted = checkChallengeCompletion(
                    currentDailyChallenge
                  );
                  if (challengeCompleted) {
                    challengeReward = currentDailyChallenge.reward;
                  }
                }

                const finalTournamentId = challengeReward
                  ? 1000 + challengeReward
                  : tournamentId || 0;

                return finalTournamentId;
              })()
            ),
            true,
          ],
        });
      } catch (combinedError: any) {
        txHash = await writeContractAsync({
          address: RACING_CONTRACT_ADDRESS,
          abi: RACING_ABI,
          functionName: "submitRaceResult",
          args: [
            address,
            BigInt(selectedCar.id),
            BigInt(gameStatsRef.current.finalScore),
            BigInt(gameStatsRef.current.distance),
            BigInt(gameStatsRef.current.obstaclesAvoided),
            BigInt(gameStatsRef.current.bonusBoxesCollected),
            BigInt(0),
          ],
        });
      }

      setCurrentTxHash(txHash);
      setSubmissionStatus("confirming");

      if (autoSubmitResults) {
        showPopup("⏳ Auto-saving to Somnia blockchain...");
      } else {
        showPopup("⏳ Submitting to Somnia blockchain...");
      }
    } catch (error) {
      setSubmissionStatus("error");
      setIsSubmittingScore(false);

      if (error && typeof error === "object") {
        if ("code" in error) {
          if ((error as any).code === 4001) {
            showPopup("❌ Transaction cancelled by user.");
          } else if ((error as any).code === -32603) {
            showPopup("❌ Network error. Please try again.");
          } else if ((error as any).code === -32000) {
            showPopup("❌ Contract execution failed. Check contract state.");
          } else {
            showPopup(
              `❌ Error ${(error as any).code}: ${
                (error as any).message || "Unknown error"
              }`
            );
          }
        } else {
          showPopup("❌ Failed to submit results. Please try again.");
        }
      } else {
        showPopup("❌ Failed to submit results. Please try again.");
      }
    }
  }, [
    selectedCar,
    address,
    hasSubmittedCurrentRace,
    autoSubmitResults,
    writeContractAsync,
    showPopup,
  ]);

  const getCarColor = useCallback((car: CarNFT | null) => {
    if (!car) return 0x666666;

    const carName = car.name?.toLowerCase() || "";
    let baseColor = 0x888888;

    if (carName.includes("starter")) {
      baseColor = 0x8b5cf6;
    } else if (carName.includes("sport")) {
      baseColor = 0x3b82f6;
    } else if (carName.includes("racing") || carName.includes("beast")) {
      baseColor = 0x10b981;
    } else if (carName.includes("gen") || carName.includes("hybrid")) {
      baseColor = 0xf59e0b;
    } else {
      const rarityColors = {
        1: 0x888888,
        2: 0x4ade80,
        3: 0x3b82f6,
        4: 0x8b5cf6,
        5: 0xfbbf24,
      };
      baseColor =
        rarityColors[car.rarity as keyof typeof rarityColors] || 0x888888;
    }

    const statInfluence = (car.speed + car.handling + car.acceleration) / 300;
    if (statInfluence > 0.8) {
      const brightnessFactor = Math.min(1.2, 1 + statInfluence * 0.2);
      const r = (baseColor >> 16) & 0xff;
      const g = (baseColor >> 8) & 0xff;
      const b = baseColor & 0xff;

      const newR = Math.min(255, Math.floor(r * brightnessFactor));
      const newG = Math.min(255, Math.floor(g * brightnessFactor));
      const newB = Math.min(255, Math.floor(b * brightnessFactor));

      return (newR << 16) | (newG << 8) | newB;
    }

    return baseColor;
  }, []);

  const getCarCharacteristics = useCallback((car: CarNFT) => {
    const avgStat = (car.speed + car.handling + car.acceleration) / 3;
    if (avgStat >= 85) return "Elite Performance";
    if (avgStat >= 75) return "High Performance";
    if (avgStat >= 65) return "Sport Performance";
    return "Standard Performance";
  }, []);

  const applyCarStats = useCallback((car: CarNFT | null) => {
    if (!car || !gameStateRef.current) {
      if (gameStateRef.current) {
        gameStateRef.current.speedBonus = 1.0;
        gameStateRef.current.handlingBonus = 1.0;
        gameStateRef.current.accelerationBonus = 1.0;
        gameStateRef.current.maxSpeedForCar = 2.0;
      }
      return;
    }

    const speed = typeof car.speed === "number" ? car.speed : 50;
    const handling = typeof car.handling === "number" ? car.handling : 50;
    const acceleration =
      typeof car.acceleration === "number" ? car.acceleration : 50;

    let maxSpeedForCar;
    const carName = car.name?.toLowerCase() || "";

    if (carName.includes("starter")) {
      maxSpeedForCar = 2.0;
    } else if (carName.includes("sport")) {
      maxSpeedForCar = 3.0;
    } else if (carName.includes("racing") || carName.includes("beast")) {
      maxSpeedForCar = 3.5;
    } else if (carName.includes("gen") || carName.includes("hybrid")) {
      maxSpeedForCar = 4.0;
    } else {
      if (car.rarity <= 2) maxSpeedForCar = 2.0;
      else if (car.rarity === 3) maxSpeedForCar = 3.0;
      else if (car.rarity === 4) maxSpeedForCar = 3.5;
      else maxSpeedForCar = 4.0;
    }

    gameStateRef.current.maxSpeedForCar = maxSpeedForCar;
    gameStateRef.current.speedBonus = 0.8 + (speed / 100) * 0.4;

    gameStateRef.current.handlingBonus = 0.7 + (handling / 100) * 0.6;

    gameStateRef.current.accelerationBonus = 0.8 + (acceleration / 100) * 0.4;

    console.log(`🏎️ Applied car stats for ${car.name}:`, {
      maxSpeed: maxSpeedForCar,
      speedBonus: gameStateRef.current.speedBonus.toFixed(2),
      handlingBonus: gameStateRef.current.handlingBonus.toFixed(2),
      accelerationBonus: gameStateRef.current.accelerationBonus.toFixed(2),
    });
  }, []);

  const updateDisplayStats = useCallback(() => {
    setGameStatsDisplay({
      distance: gameStatsRef.current.distance,
      obstaclesAvoided: gameStatsRef.current.obstaclesAvoided,
      bonusBoxesCollected: gameStatsRef.current.bonusBoxesCollected,
    });
  }, []);

  const activateInvisibility = useCallback(() => {
    const totalDuration = 15000; // 15 seconds

    gameStateRef.current.isInvisible = true;
    gameStateRef.current.invisibilityTimer = totalDuration;
    setInvisibilityActive(true);
    setInvisibilityCountdown(Math.ceil(totalDuration / 1000));

    if (invisibilityIndicatorRef.current) {
      invisibilityIndicatorRef.current.visible = true;
    }

    if (carRef.current) {
      carRef.current.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material && "transparent" in mesh.material) {
          mesh.material.transparent = true;
          (mesh.material as any).opacity = 0.7;
        }
      });
    }

    showPopup(`⚡ INVISIBLE MODE ACTIVATED (15s) ⚡`);
  }, [showPopup]);

  const deactivateInvisibility = useCallback(() => {
    gameStateRef.current.isInvisible = false;
    gameStateRef.current.invisibilityTimer = 0;
    setInvisibilityActive(false);
    setInvisibilityCountdown(0);

    if (invisibilityIndicatorRef.current) {
      invisibilityIndicatorRef.current.visible = false;
    }

    if (carRef.current) {
      carRef.current.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material && "transparent" in mesh.material) {
          mesh.material.transparent = false;
          (mesh.material as any).opacity = 1.0;
        }
      });
    }
  }, []);

  const createRoadLines = useCallback(() => {
    if (!sceneRef.current) return;

    roadLinesRef.current.forEach((line) => {
      if (sceneRef.current) {
        sceneRef.current.remove(line);
      }
    });
    roadLinesRef.current = [];

    const lineSpacing = 8;
    const lineLength = 4;
    const numLines = 500;

    for (let i = 0; i < numLines; i++) {
      const zPosition = i * lineSpacing - 2000;

      const lineGeometry = new THREE.PlaneGeometry(0.2, lineLength);
      const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.005, zPosition);
      sceneRef.current.add(line);
      roadLinesRef.current.push(line);

      const leftLine = new THREE.Mesh(
        lineGeometry.clone(),
        lineMaterial.clone()
      );
      leftLine.rotation.x = -Math.PI / 2;
      leftLine.position.set(-3, 0.005, zPosition);
      sceneRef.current.add(leftLine);
      roadLinesRef.current.push(leftLine);

      const rightLine = new THREE.Mesh(
        lineGeometry.clone(),
        lineMaterial.clone()
      );
      rightLine.rotation.x = -Math.PI / 2;
      rightLine.position.set(3, 0.005, zPosition);
      sceneRef.current.add(rightLine);
      roadLinesRef.current.push(rightLine);
    }
  }, []);

  const createObstacle = useCallback((carZ: number) => {
    if (!sceneRef.current) return;

    const obstacleGroup = new THREE.Group();
    const obstacleType = Math.random();

    if (obstacleType < 0.4) {
      const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
      });
      const obstacle = new THREE.Mesh(geometry, material);
      obstacle.position.y = 0.6;
      obstacle.castShadow = true;
      obstacleGroup.add(obstacle);
    } else if (obstacleType < 0.7) {
      const geometry = new THREE.ConeGeometry(0.6, 2);
      const material = new THREE.MeshLambertMaterial({ color: 0xff8800 });
      const obstacle = new THREE.Mesh(geometry, material);
      obstacle.position.y = 1;
      obstacle.castShadow = true;
      obstacleGroup.add(obstacle);
    } else {
      const geometry = new THREE.SphereGeometry(0.8);
      const material = new THREE.MeshLambertMaterial({ color: 0xffdd00 });
      const obstacle = new THREE.Mesh(geometry, material);
      obstacle.position.y = 0.8;
      obstacle.castShadow = true;
      obstacleGroup.add(obstacle);
    }

    const lanes = [-4.5, -1.5, 1.5, 4.5];
    const laneIndex = Math.floor(Math.random() * lanes.length);
    const randomDistance = Math.random() * 400 + 200;
    obstacleGroup.position.set(lanes[laneIndex], 0, carZ - randomDistance);

    sceneRef.current.add(obstacleGroup);
    obstaclesRef.current.push(obstacleGroup as GameGroup);
  }, []);

  const createBonusBox = useCallback((carZ: number) => {
    if (!sceneRef.current) return;

    const bonusGroup = new THREE.Group();

    const boxGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.y = 0.75;
    box.castShadow = true;
    bonusGroup.add(box);

    const symbolGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 6);
    const symbolMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 });
    const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial);
    symbol.position.y = 1.6;
    symbol.rotation.x = -Math.PI / 2;
    symbol.castShadow = true;
    bonusGroup.add(symbol);

    const lanes = [-4.5, -1.5, 1.5, 4.5];
    const laneIndex = Math.floor(Math.random() * lanes.length);
    const randomDistance = Math.random() * 200 + 100;
    const finalPosition = carZ - randomDistance;

    bonusGroup.position.set(lanes[laneIndex], 0, finalPosition);

    sceneRef.current.add(bonusGroup);
    bonusBoxesRef.current.push(bonusGroup as GameGroup);
  }, []);

  const createGoldenKey = useCallback((carZ: number) => {
    if (!sceneRef.current) return;

    const keyGroup = new THREE.Group();
    const handleGeometry = new THREE.TorusGeometry(0.6, 0.15);
    const keyMaterial = new THREE.MeshLambertMaterial({
      color: 0xffd700,
      emissive: 0x332200,
    });
    const handle = new THREE.Mesh(handleGeometry, keyMaterial);
    handle.position.y = 1;
    handle.castShadow = true;
    keyGroup.add(handle);

    const shaftGeometry = new THREE.BoxGeometry(0.2, 0.2, 1.5);
    const shaft = new THREE.Mesh(shaftGeometry, keyMaterial);
    shaft.position.set(0, 1, -0.75);
    shaft.castShadow = true;
    keyGroup.add(shaft);

    (keyGroup as any).userData = { rotationSpeed: 0.05 };

    const lanes = [-4.5, -1.5, 1.5, 4.5];
    const laneIndex = Math.floor(Math.random() * lanes.length);
    const randomDistance = Math.random() * 400 + 200;
    keyGroup.position.set(lanes[laneIndex], 0, carZ - randomDistance);

    sceneRef.current.add(keyGroup);
    goldenKeysRef.current.push(keyGroup as GameGroup);
  }, []);

  const endGame = useCallback(
    async (reason: "collision" | "manual" | "timeout" = "manual") => {
      if (!gameRunningRef.current || gameOver) {
        console.log("🚫 Game already ended, ignoring additional endGame calls");
        return;
      }

      const gameTimeSeconds =
        (Date.now() - gameStatsRef.current.gameStartTime) / 1000;
      console.log(
        `🏁 GAME ENDING - Reason: ${reason} - Game time: ${gameTimeSeconds.toFixed(
          1
        )}s - Starting stats update...`
      );
      console.trace("Call stack for endGame:");

      setGameRunning(false);
      gameRunningRef.current = false;
      setGameOver(true);

      const gameEndTime = Date.now();
      const lapTime = (gameEndTime - gameStatsRef.current.gameStartTime) / 1000;
      gameStatsRef.current.lapTime = lapTime;
      gameStatsRef.current.finalScore = gameStateRef.current.currentScore;

      console.log("🎮 FINAL GAME STATS:", {
        score: gameStatsRef.current.finalScore,
        distance: gameStatsRef.current.distance,
        obstaclesAvoided: gameStatsRef.current.obstaclesAvoided,
        bonusBoxesCollected: gameStatsRef.current.bonusBoxesCollected,
        lapTime: gameStatsRef.current.lapTime,
      });

      updateDisplayStats();

      const finalScore = gameStatsRef.current.finalScore;
      const isNewPersonalBest = saveHighScore(finalScore);

      saveGameToHistory({
        score: finalScore,
        distance: gameStatsRef.current.distance,
        obstaclesAvoided: gameStatsRef.current.obstaclesAvoided,
        bonusBoxesCollected: gameStatsRef.current.bonusBoxesCollected,
        lapTime: gameStatsRef.current.lapTime,
        carUsed: selectedCar?.name || "Unknown Car",
        timestamp: Date.now(),
        isNewHighScore: isNewPersonalBest,
      });

      if (isNewPersonalBest) {
        showPopup(`🎉 NEW HIGH SCORE! ${finalScore} points!`);
      }

      // Check daily challenge completion
      if (
        isDailyChallengeRace &&
        currentDailyChallenge &&
        !dailyChallengeCompleted
      ) {
        const challengeCompleted = checkChallengeCompletion(
          currentDailyChallenge
        );

        if (challengeCompleted) {
          const today = new Date().toDateString();
          localStorage.setItem("somniaRacing_dailyChallengeDate", today);
          localStorage.setItem(
            "somniaRacing_dailyChallengeCompleted",
            "true"
          );
          setDailyChallengeCompleted(true);
          setCompletedChallengeReward(currentDailyChallenge.reward);

          showPopup(
            `🌟 DAILY CHALLENGE COMPLETED! ${currentDailyChallenge.title} earned you ${currentDailyChallenge.reward} bonus tokens!`
          );
        } else {
          const progress = getChallengeProgress(currentDailyChallenge);
          showPopup(
            `${currentDailyChallenge.emoji} ${currentDailyChallenge.title}: ${progress}. Try again to earn ${currentDailyChallenge.reward} tokens!`
          );
        }
      }

      const minimumGameTime = 5;
      if (
        selectedCar &&
        isConnected &&
        autoSubmitResults &&
        reason === "collision" &&
        lapTime > minimumGameTime
      ) {
        console.log(
          "🔗 Auto-submitting race result to blockchain (collision detected)..."
        );
        submitRaceResult();
        showPopup("💥 Collision! Auto-saving to blockchain...");
      } else if (selectedCar && isConnected && lapTime > minimumGameTime) {
        if (reason === "collision") {
          showPopup("💥 Race ended! Kindly save your stats onchain");
        } else {
          showPopup("🏁 Race ended! Kindly save your stats onchain");
        }
      } else if (lapTime <= minimumGameTime) {
        showPopup("🏁 Race too short! Play longer to earn rewards.");
      } else {
        showPopup(
          "🏁 Race Complete! Connect wallet & select car for blockchain features."
        );
      }
    },
    [
      gameOver,
      updateDisplayStats,
      selectedCar,
      isConnected,
      autoSubmitResults,
      submitRaceResult,
      showPopup,
      saveHighScore,
      saveGameToHistory,
      highScore,
    ]
  );

  const animate = useCallback(() => {
    if (!gameRunningRef.current) {
      console.log("🛑 Animation stopped: game not running");
      return;
    }

    if (
      !rendererRef.current ||
      !sceneRef.current ||
      !cameraRef.current ||
      !carRef.current
    ) {
      console.log("⚠️ Skipping frame - refs temporarily unavailable");
      animationIdRef.current = requestAnimationFrame(animate);
      return;
    }

    const car = carRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const road = roadRef.current;
    const roadLines = roadLinesRef.current;

    const accelerationBonus = gameStateRef.current.accelerationBonus || 1.0;
    const accelerationRate = 0.02 * accelerationBonus;

    const speedBonus = gameStateRef.current.speedBonus || 1.0;

    if (keysRef.current.up) {
      const maxSpeed = gameStateRef.current.maxSpeedForCar || 2.0;
      const oldSpeed = gameStateRef.current.speedMultiplier;
      gameStateRef.current.speedMultiplier = Math.min(
        maxSpeed,
        gameStateRef.current.speedMultiplier + accelerationRate
      );

      if (
        oldSpeed !== gameStateRef.current.speedMultiplier &&
        gameStateRef.current.speedMultiplier >= maxSpeed
      ) {
        console.log(`🚀 Speed limited to ${maxSpeed}x for car type`);
      }
    }
    if (keysRef.current.down) {
      gameStateRef.current.speedMultiplier = Math.max(
        0.2,
        gameStateRef.current.speedMultiplier - accelerationRate
      );
    }

    const currentGameSpeed =
      gameStateRef.current.baseGameSpeed *
      gameStateRef.current.speedMultiplier *
      speedBonus;
    setSpeed(gameStateRef.current.speedMultiplier);

    if (gameStateRef.current.isInvisible) {
      gameStateRef.current.invisibilityTimer -= 16;

      const secondsLeft = Math.ceil(
        gameStateRef.current.invisibilityTimer / 1000
      );
      setInvisibilityCountdown(Math.max(0, secondsLeft));

      if (invisibilityIndicatorRef.current) {
        invisibilityIndicatorRef.current.rotation.y += 0.1;
      }

      if (gameStateRef.current.invisibilityTimer <= 0) {
        deactivateInvisibility();
      }
    }

    car.position.z -= currentGameSpeed * 30;

    const newDistance = Math.floor(
      (Date.now() - gameStatsRef.current.gameStartTime) / 100
    );
    gameStatsRef.current.distance = newDistance;

    if (newDistance % 10 === 0) {
      updateDisplayStats();
    }

    camera.position.z = car.position.z + 15;
    camera.lookAt(car.position.x, 0, car.position.z - 5);

    if (road) road.position.z = car.position.z - 1000;

    roadLines.forEach((line) => {
      if (line.position.z > car.position.z + 50) {
        line.position.z -= 4000;
      }
    });

    const handlingBonus = gameStateRef.current.handlingBonus || 1.0;
    const movementSpeed = 0.08 * handlingBonus;

    if (keysRef.current.left && gameStateRef.current.carPosition > -1) {
      gameStateRef.current.carPosition -= movementSpeed;
      gameStateRef.current.targetCarPosition = gameStateRef.current.carPosition;
    }
    if (keysRef.current.right && gameStateRef.current.carPosition < 1) {
      gameStateRef.current.carPosition += movementSpeed;
      gameStateRef.current.targetCarPosition = gameStateRef.current.carPosition;
    }

    if (
      Math.abs(
        gameStateRef.current.targetCarPosition -
          gameStateRef.current.carPosition
      ) > 0.01
    ) {
      const moveSpeed = 0.12 * handlingBonus;
      if (
        gameStateRef.current.targetCarPosition >
        gameStateRef.current.carPosition
      ) {
        gameStateRef.current.carPosition = Math.min(
          gameStateRef.current.targetCarPosition,
          gameStateRef.current.carPosition + moveSpeed
        );
      } else {
        gameStateRef.current.carPosition = Math.max(
          gameStateRef.current.targetCarPosition,
          gameStateRef.current.carPosition - moveSpeed
        );
      }
    }

    gameStateRef.current.carPosition = Math.max(
      -1,
      Math.min(1, gameStateRef.current.carPosition)
    );
    car.position.x = gameStateRef.current.carPosition * 4.5;

    if (Math.random() < gameStateRef.current.obstacleSpawnRate) {
      createObstacle(car.position.z);
    }

    if (
      gameStateRef.current.currentScore >=
      gameStateRef.current.nextBonusThreshold
    ) {
      createBonusBox(car.position.z);
      gameStateRef.current.nextBonusThreshold += 70;
    }

    const gameTimeElapsed =
      (Date.now() - gameStateRef.current.gameStartTime) / 1000;
    if (gameTimeElapsed >= gameStateRef.current.nextKeySpawnTime) {
      createGoldenKey(car.position.z);
      gameStateRef.current.nextKeySpawnTime +=
        gameStateRef.current.keySpawnInterval;
    }

    goldenKeysRef.current.forEach((key) => {
      key.rotation.y += (key as any).userData.rotationSpeed;
    });

    // Collision detection
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const obstacle = obstaclesRef.current[i];

      if (obstacle.position.z > car.position.z + 10) {
        scene.remove(obstacle);
        obstaclesRef.current.splice(i, 1);

        gameStateRef.current.currentScore += 5;
        setScore(gameStateRef.current.currentScore);

        gameStatsRef.current.obstaclesAvoided++;
      } else if (!gameStateRef.current.isInvisible) {
        const distanceZ = Math.abs(obstacle.position.z - car.position.z);
        const distanceX = Math.abs(obstacle.position.x - car.position.x);

        if (distanceZ < 1.5 && distanceX < 1.8) {
          endGame("collision");
          return;
        }
      }
    }

    // Bonus box collisions
    for (let i = bonusBoxesRef.current.length - 1; i >= 0; i--) {
      const bonusBox = bonusBoxesRef.current[i];

      if (bonusBox.position.z > car.position.z + 10) {
        scene.remove(bonusBox);
        bonusBoxesRef.current.splice(i, 1);
      } else if (
        Math.abs(bonusBox.position.z - car.position.z) < 2.5 &&
        Math.abs(bonusBox.position.x - car.position.x) < 1.9
      ) {
        scene.remove(bonusBox);
        bonusBoxesRef.current.splice(i, 1);

        gameStateRef.current.currentScore += 30;
        setScore(gameStateRef.current.currentScore);

        gameStatsRef.current.bonusBoxesCollected++;

        showPopup("+30 BONUS POINTS! 🏆");
      }
    }

    for (let i = goldenKeysRef.current.length - 1; i >= 0; i--) {
      const key = goldenKeysRef.current[i];

      if (key.position.z > car.position.z + 10) {
        scene.remove(key);
        goldenKeysRef.current.splice(i, 1);
      } else if (
        Math.abs(key.position.z - car.position.z) < 2.5 &&
        Math.abs(key.position.x - car.position.x) < 1.9
      ) {
        scene.remove(key);
        goldenKeysRef.current.splice(i, 1);
        activateInvisibility();
      }
    }

    gameStateRef.current.baseGameSpeed += 0.000015;
    gameStateRef.current.obstacleSpawnRate = Math.min(
      0.04,
      gameStateRef.current.obstacleSpawnRate + 0.000008
    );

    renderer.render(scene, camera);
    animationIdRef.current = requestAnimationFrame(animate);
  }, [
    createObstacle,
    createBonusBox,
    createGoldenKey,
    activateInvisibility,
    deactivateInvisibility,
    showPopup,
    updateDisplayStats,
    endGame,
  ]);

  const initializeGame = useCallback(() => {
    if (!mountRef.current) {
      console.log("❌ Mount ref not available");
      return;
    }

    console.log("🎮 Initializing Three.js scene...");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x888888, 200, 400);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 12, 15);
    camera.lookAt(0, 0, -5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87ceeb, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const roadGeometry = new THREE.PlaneGeometry(12, 4000);
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.01;
    road.position.z = -1000;
    road.receiveShadow = true;
    scene.add(road);
    roadRef.current = road;

    createRoadLines();

    const carGroup = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(2.2, 0.6, 3);

    let carColor = 0x666666;
    if (selectedCar) {
      carColor = getCarColor(selectedCar);
    } else if (isConnected) {
      carColor = 0xff4444;
    }

    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: carColor,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    body.castShadow = true;
    carGroup.add(body);

    if (isConnected) {
      const logoGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 6);
      const logoMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 });
      const logo = new THREE.Mesh(logoGeometry, logoMaterial);
      logo.position.set(0, 1.1, 0.5);
      logo.rotation.x = -Math.PI / 2;
      carGroup.add(logo);
    }

    const roofGeometry = new THREE.BoxGeometry(1.8, 0.4, 1.5);

    const roofColor = new THREE.Color(carColor).multiplyScalar(0.7);
    const roofMaterial = new THREE.MeshLambertMaterial({
      color: roofColor,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 1.2;
    roof.position.z = -0.2;
    roof.castShadow = true;
    carGroup.add(roof);

    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
    [
      [-1.0, 0.3, 1.2],
      [1.0, 0.3, 1.2],
      [-1.0, 0.3, -1.2],
      [1.0, 0.3, -1.2],
    ].forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      carGroup.add(wheel);
    });

    const indicatorGeometry = new THREE.SphereGeometry(0.3);
    const indicatorMaterial = new THREE.MeshLambertMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
    });
    const invisibilityIndicator = new THREE.Mesh(
      indicatorGeometry,
      indicatorMaterial
    );
    invisibilityIndicator.position.set(0, 2, 0);
    invisibilityIndicator.visible = false;
    carGroup.add(invisibilityIndicator);
    invisibilityIndicatorRef.current = invisibilityIndicator;

    carGroup.position.set(0, 0, 8);
    scene.add(carGroup);
    carRef.current = carGroup;

    gameStatsRef.current = {
      distance: 0,
      obstaclesAvoided: 0,
      bonusBoxesCollected: 0,
      gameStartTime: Date.now(),
      finalScore: 0,
      lapTime: 0,
    };

    applyCarStats(selectedCar);

    updateDisplayStats();

    console.log("✅ Three.js scene initialized successfully");
    console.log("🚀 Starting game");

    setGameRunning(true);
    gameRunningRef.current = true;

    // Broadcast race start via Data Streams
    if (address && selectedCar) {
      broadcastRaceStart(
        address as `0x${string}`,
        BigInt(selectedCar.id),
        'Somnia Circuit'
      ).then((raceId) => {
        if (raceId) {
          setCurrentRaceId(raceId);
          console.log('🏁 Race broadcasted to Data Streams:', raceId);
        }
      }).catch(err => {
        console.log('⚠️ Data Streams broadcast failed (non-critical):', err.message);
      });
    }

    setTimeout(() => {
      console.log("🎮 Starting animation loop...");
      animate();
    }, 50);
  }, [
    isConnected,
    selectedCar,
    createRoadLines,
    updateDisplayStats,
    animate,
    applyCarStats,
    address,
    broadcastRaceStart,
  ]);

  const setupControls = useCallback(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyA":
        case "ArrowLeft":
          keysRef.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          keysRef.current.right = true;
          break;
        case "ArrowUp":
          keysRef.current.up = true;
          break;
        case "ArrowDown":
          keysRef.current.down = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyA":
        case "ArrowLeft":
          keysRef.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          keysRef.current.right = false;
          break;
        case "ArrowUp":
          keysRef.current.up = false;
          break;
        case "ArrowDown":
          keysRef.current.down = false;
          break;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!gameRunningRef.current || !rendererRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const mouseXNormalized =
        ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseYNormalized =
        ((event.clientY - rect.top) / rect.height) * 2 - 1;

      gameStateRef.current.targetCarPosition = Math.max(
        -1,
        Math.min(1, mouseXNormalized)
      );
      const maxSpeed = gameStateRef.current.maxSpeedForCar || 2.0;
      gameStateRef.current.speedMultiplier = Math.max(
        0.2,
        Math.min(maxSpeed, 1.0 - mouseYNormalized * 0.5)
      );
    };

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    console.log("🎮 Game running changed to:", gameRunning);
    if (gameRunning && !animationIdRef.current) {
      console.log("🚀 Starting game loop from useEffect...");
      gameRunningRef.current = true;
      gameStatsRef.current.gameStartTime = Date.now();

      gameStateRef.current = {
        carPosition: 0,
        targetCarPosition: 0,
        baseGameSpeed: 0.008,
        speedMultiplier: 1.0,
        obstacleSpawnRate: 0.015,
        nextBonusThreshold: 70,
        gameStartTime: Date.now(),
        nextKeySpawnTime: 15,
        keySpawnInterval: 30,
        isInvisible: false,
        invisibilityTimer: 0,
        currentScore: 0,

        speedBonus: 1.0,
        handlingBonus: 1.0,
        accelerationBonus: 1.0,
        maxSpeedForCar: 2.0,
      };
      setTimeout(() => {
        animate();
      }, 50);
    } else if (!gameRunning && animationIdRef.current) {
      console.log("⏸️ Stopping game loop from useEffect...");
      gameRunningRef.current = false;
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = 0;
    }
  }, [gameRunning, animate]);

  useEffect(() => {
    if (
      isConnected &&
      !showMenu &&
      !gameOver &&
      selectedCar &&
      !rendererRef.current
    ) {
      console.log("🎮 Game ready to start - initializing Three.js scene...");
      const timer = setTimeout(() => {
        initializeGame();
      }, 500);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isConnected, showMenu, gameOver, selectedCar, initializeGame]);

  useEffect(() => {
    const cleanup = setupControls();
    return cleanup;
  }, [setupControls]);

  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        try {
          if (mountRef.current.contains(rendererRef.current.domElement)) {
            mountRef.current.removeChild(rendererRef.current.domElement);
          }
          rendererRef.current.dispose();
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      }
    };
  }, []);

  if (!isConnected) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(to bottom right, #0f172a, #1e40af)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ marginBottom: "16px" }}>
            <img 
              src={somniaLogo} 
              alt="Somnia Logo" 
              style={{ 
                width: "80px", 
                height: "80px", 
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.3)"
              }} 
            />
          </div>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              marginBottom: "16px",
            }}
          >
            Somnia Racing
          </h1>
          <p style={{ fontSize: "20px", marginBottom: "32px" }}>
            Connect your wallet to start racing!
          </p>
          <div style={{ fontSize: "14px", opacity: 0.75 }}>
            <p>🏆 Compete in tournaments</p>
            <p>🚗 Collect & breed NFT cars</p>
            <p>💰 Earn FAST rewards</p>
            <p>⚡ Built on Somnia</p>
          </div>
        </div>
      </div>
    );
  }

  if (isConnected && !selectedCar && playerCars.length > 0 && !carLoading) {
    setSelectedCar(playerCars[0]);
    return null;
  }

  if (
    isConnected &&
    playerCars.length === 0 &&
    !carLoading &&
    !activeTournamentId
  ) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "#1e293b",
            borderRadius: "8px",
            padding: "40px",
            textAlign: "center",
            color: "white",
            maxWidth: "400px",
          }}
        >
          <h2
            style={{
              marginBottom: "20px",
              fontSize: "28px",
              fontWeight: "bold",
            }}
          >
            🏁 Welcome to Somnia Racing!
          </h2>
          <p
            style={{
              marginBottom: "24px",
              opacity: 0.9,
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            To start your racing journey, you need to mint your first NFT car.
            Get the <strong>Starter Racer</strong> to begin competing!
          </p>

          {purchasingCar !== "" ? (
            <div
              style={{
                padding: "20px",
                backgroundColor: "rgba(251, 191, 36, 0.1)",
                borderRadius: "8px",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    border: "2px solid transparent",
                    borderTop: "2px solid #fbbf24",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                <span style={{ color: "#fbbf24", fontWeight: "bold" }}>
                  Minting your Starter Racer...
                </span>
              </div>
              <p
                style={{ margin: "8px 0 0 0", fontSize: "14px", opacity: 0.8 }}
              >
                Please confirm the transaction in your wallet and wait for
                blockchain confirmation.
              </p>
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={async () => {
                await mintCarWithConfirmation("starter", "Starter Racer");
              }}
              disabled={purchasingCar !== ""}
              style={{
                backgroundColor: purchasingCar !== "" ? "#6b7280" : "#10b981",
                color: "white",
                padding: "16px 32px",
                borderRadius: "12px",
                border: "none",
                cursor: purchasingCar !== "" ? "not-allowed" : "pointer",
                fontSize: "18px",
                fontWeight: "bold",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                transition: "all 0.3s ease",
                opacity: purchasingCar !== "" ? 0.6 : 1,
                minWidth: "200px",
              }}
              onMouseEnter={(e) => {
                if (purchasingCar === "") {
                  e.currentTarget.style.backgroundColor = "#059669";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (purchasingCar === "") {
                  e.currentTarget.style.backgroundColor = "#10b981";
                  e.currentTarget.style.transform = "translateY(0px)";
                }
              }}
            >
              {purchasingCar !== ""
                ? "⏳ Minting..."
                : "🚗 Mint Starter Racer (0.01 STT)"}
            </button>
          </div>

          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderRadius: "8px",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#93c5fd",
                textAlign: "center",
              }}
            >
              💡 <strong>Tip:</strong> After minting your Starter Racer, you can
              upgrade to premium cars like <strong>Sport Car</strong> and{" "}
              <strong>Racing Beast</strong> from the "Car Lot" menu! You can
              also breed two cars to create the legendary{" "}
              <strong>Gen-X Hybrid</strong>!
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .custom-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .custom-scroll::-webkit-scrollbar {
          display: none;
        }
        .smooth-scroll {
          scroll-behavior: smooth;
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(to bottom right, #1e3a8a, #581c87)",
        }}
      >
        {!showMenu && (
          <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
        )}

        {showMenu && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center", color: "white" }}>
              <h1
                style={{
                  fontSize: "48px",
                  fontWeight: "bold",
                  marginBottom: "24px",
                  background: "linear-gradient(to right, #fbbf24, #dc2626)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Somnia Racing
              </h1>

              {selectedCar && (
                <div
                  style={{
                    backgroundColor: "#1e293b",
                    borderRadius: "8px",
                    padding: "24px",
                    marginBottom: "24px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      marginBottom: "8px",
                    }}
                  >
                    Selected Car: {selectedCar.name}
                    {selectedCar.isStaked && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "12px",
                          background: "#ef4444",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        🔒 STAKED
                      </span>
                    )}
                  </h3>
                  {selectedCar.isStaked && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#ef4444",
                        marginBottom: "8px",
                        fontWeight: "bold",
                        textAlign: "center",
                        background: "rgba(239, 68, 68, 0.1)",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                      }}
                    >
                      ⚠️ This car is staked. Please unstake it from your garage
                      to race.
                    </div>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "16px",
                      fontSize: "14px",
                    }}
                  >
                    <div>
                      <span style={{ color: "#9ca3af" }}>Speed:</span>
                      <span style={{ color: "white", marginLeft: "8px" }}>
                        {selectedCar.speed}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#9ca3af" }}>Handling:</span>
                      <span style={{ color: "white", marginLeft: "8px" }}>
                        {selectedCar.handling}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#9ca3af" }}>Acceleration:</span>
                      <span style={{ color: "white", marginLeft: "8px" }}>
                        {selectedCar.acceleration}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {playerCars.length > 0 && (
                  <>
                    <button
                      onClick={() => {
                        setCarSelectionMode("select");
                        setShowCarSelection(true);
                      }}
                      style={{
                        backgroundColor: "#0891b2",
                        color: "white",
                        padding: "12px 32px",
                        borderRadius: "8px",
                        fontSize: "18px",
                        fontWeight: "bold",
                        width: "100%",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      🔧 Change Car
                    </button>

                    <button
                      onClick={() => {
                        setCarSelectionMode("mint");
                        setShowCarSelection(true);
                      }}
                      style={{
                        backgroundColor: "#8b5cf6",
                        color: "white",
                        padding: "12px 32px",
                        borderRadius: "8px",
                        fontSize: "18px",
                        fontWeight: "bold",
                        width: "100%",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      🏎️ Car Lot
                    </button>

                    <button
                      onClick={() => setShowGarage(true)}
                      style={{
                        backgroundColor: "#ec4899",
                        color: "white",
                        padding: "12px 32px",
                        borderRadius: "8px",
                        fontSize: "18px",
                        fontWeight: "bold",
                        width: "100%",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      🏠 Car Garage
                    </button>
                  </>
                )}

                {selectedCar && (
                  <>
                    <button
                      onClick={() => {
                        if (tournamentId && tournamentRaceCompleted) {
                          showPopup(
                            "⚠️ You have already completed this tournament race! You can only race once per tournament."
                          );
                          return;
                        }

                        setGameOver(false);
                        setScore(0);
                        setHasSubmittedCurrentRace(false);
                        setSubmissionStatus("idle");
                        setIsNewHighScore(false);
                        if (!currentDailyChallenge) {
                          setIsDailyChallengeRace(false);
                        }
                        setCompletedChallengeReward(null);

                        gameStateRef.current = {
                          carPosition: 0,
                          targetCarPosition: 0,
                          baseGameSpeed: 0.008,
                          speedMultiplier: 1.0,
                          obstacleSpawnRate: 0.015,
                          nextBonusThreshold: 70,
                          gameStartTime: Date.now(),
                          nextKeySpawnTime: 15,
                          keySpawnInterval: 30,
                          isInvisible: false,
                          invisibilityTimer: 0,
                          currentScore: 0,
                          speedBonus: 1.0,
                          handlingBonus: 1.0,
                          accelerationBonus: 1.0,
                          maxSpeedForCar: 2.0,
                        };

                        gameStatsRef.current = {
                          distance: 0,
                          obstaclesAvoided: 0,
                          bonusBoxesCollected: 0,
                          gameStartTime: Date.now(),
                          finalScore: 0,
                          lapTime: 0,
                        };

                        obstaclesRef.current = [];
                        bonusBoxesRef.current = [];
                        goldenKeysRef.current = [];

                        if (selectedCar) {
                          applyCarStats(selectedCar);
                        }

                        setShowMenu(false);
                      }}
                      disabled={
                        (tournamentId && tournamentRaceCompleted) ||
                        selectedCar?.isStaked
                      }
                      style={{
                        backgroundColor:
                          tournamentId && tournamentRaceCompleted
                            ? "#6b7280"
                            : "#10b981",
                        color: "white",
                        padding: "12px 32px",
                        borderRadius: "8px",
                        fontSize: "18px",
                        fontWeight: "bold",
                        width: "100%",
                        border: "none",
                        cursor:
                          tournamentId && tournamentRaceCompleted
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          tournamentId && tournamentRaceCompleted ? 0.6 : 1,
                      }}
                    >
                      {tournamentId && tournamentRaceCompleted
                        ? "✅ Tournament Race Completed"
                        : tournamentId
                        ? "🏆 Race in Tournament"
                        : "🏁 Start Practice Race"}
                    </button>

                    {tournamentId &&
                      tournamentRaceCompleted &&
                      onNavigateToTournaments && (
                        <button
                          onClick={() => {
                            onNavigateToTournaments();
                          }}
                          style={{
                            backgroundColor: "#8b5cf6",
                            color: "white",
                            padding: "12px 32px",
                            borderRadius: "8px",
                            fontSize: "16px",
                            fontWeight: "bold",
                            width: "100%",
                            border: "none",
                            cursor: "pointer",
                            marginTop: "10px",
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#7c3aed";
                            e.currentTarget.style.transform =
                              "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#8b5cf6";
                            e.currentTarget.style.transform = "translateY(0px)";
                          }}
                        >
                          🏆 Return to Tournament Lobby
                        </button>
                      )}

                    <button
                      onClick={() => {
                        if (dailyChallengeCompleted) {
                          alert(
                            "Daily challenge already completed! Come back tomorrow for a new challenge."
                          );
                          return;
                        }

                        setGameOver(false);
                        setScore(0);
                        setHasSubmittedCurrentRace(false);
                        setSubmissionStatus("idle");
                        setIsNewHighScore(false);
                        setIsDailyChallengeRace(true);

                        gameStateRef.current = {
                          carPosition: 0,
                          targetCarPosition: 0,
                          baseGameSpeed: 0.008,
                          speedMultiplier: 1.0,
                          obstacleSpawnRate: 0.015,
                          nextBonusThreshold: 70,
                          gameStartTime: Date.now(),
                          nextKeySpawnTime: 15,
                          keySpawnInterval: 30,
                          isInvisible: false,
                          invisibilityTimer: 0,
                          currentScore: 0,
                          speedBonus: 1.0,
                          handlingBonus: 1.0,
                          accelerationBonus: 1.0,
                          maxSpeedForCar: 2.0,
                        };

                        gameStatsRef.current = {
                          distance: 0,
                          obstaclesAvoided: 0,
                          bonusBoxesCollected: 0,
                          gameStartTime: Date.now(),
                          finalScore: 0,
                          lapTime: 0,
                        };

                        obstaclesRef.current = [];
                        bonusBoxesRef.current = [];
                        goldenKeysRef.current = [];

                        if (selectedCar) {
                          applyCarStats(selectedCar);
                        }

                        setShowMenu(false);
                      }}
                      disabled={
                        dailyChallengeCompleted || selectedCar?.isStaked
                      }
                      style={{
                        backgroundColor:
                          dailyChallengeCompleted || selectedCar?.isStaked
                            ? "#6b7280"
                            : "#f59e0b",
                        color: "white",
                        padding: "12px 32px",
                        borderRadius: "8px",
                        fontSize: "18px",
                        fontWeight: "bold",
                        width: "100%",
                        border: "none",
                        cursor: dailyChallengeCompleted
                          ? "not-allowed"
                          : "pointer",
                        opacity: dailyChallengeCompleted ? 0.6 : 1,
                      }}
                    >
                      {dailyChallengeCompleted
                        ? "✅ Daily Challenge Complete"
                        : currentDailyChallenge
                        ? `${currentDailyChallenge.emoji} ${currentDailyChallenge.title} (${currentDailyChallenge.reward} tokens)`
                        : "⭐ Daily Challenge"}
                    </button>

                    <button
                      onClick={() => {
                        if (onNavigateToTournaments) {
                          onNavigateToTournaments();
                        }
                      }}
                      disabled={selectedCar?.isStaked}
                      style={{
                        backgroundColor: selectedCar?.isStaked
                          ? "#6b7280"
                          : "#8b5cf6",
                        color: "white",
                        padding: "12px 32px",
                        borderRadius: "8px",
                        fontSize: "18px",
                        fontWeight: "bold",
                        width: "100%",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      🏆 Tournament Lobby
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: isMobile ? "10px" : "70px",
            left: isMobile ? "10px" : "20px",
            background: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(15px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: isMobile ? "11px" : "14px",
            padding: isMobile ? "11px" : "16px",
            color: "white",
            fontSize: isMobile ? "10px" : "14px",
            fontWeight: "500",
            textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
            minWidth: isMobile ? "144px" : "280px",
            maxWidth: isMobile ? "162px" : "320px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "13px",
              paddingBottom: "10px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: isMobile ? "16px" : "24px",
                  fontWeight: "bold",
                  background: "linear-gradient(45deg, #ffd700, #ff6b6b)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {score.toLocaleString()}
              </div>
              <div
                style={{ fontSize: isMobile ? "8px" : "11px", opacity: 0.7 }}
              >
                Score
              </div>
              {highScore > 0 && (
                <div
                  style={{
                    fontSize: isMobile ? "7px" : "10px",
                    opacity: 0.6,
                    color: "#ffd700",
                  }}
                >
                  Best: {highScore.toLocaleString()}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: isMobile ? "14px" : "18px",
                  fontWeight: "bold",
                  color: "#00ff88",
                }}
              >
                {speed.toFixed(1)}x
              </div>
              <div
                style={{ fontSize: isMobile ? "8px" : "11px", opacity: 0.7 }}
              >
                Speed
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? "7px" : "10px",
              marginBottom: isMobile ? "11px" : "13px",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                padding: "7px",
                borderRadius: "7px",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? "12px" : "15px",
                  fontWeight: "bold",
                  color: "#3b82f6",
                }}
              >
                {gameStatsDisplay.distance}m
              </div>
              <div
                style={{ fontSize: isMobile ? "7px" : "10px", opacity: 0.8 }}
              >
                Distance
              </div>
            </div>
            <div
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                padding: "7px",
                borderRadius: "7px",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? "12px" : "15px",
                  fontWeight: "bold",
                  color: "#10b981",
                }}
              >
                {gameStatsDisplay.obstaclesAvoided}
              </div>
              <div
                style={{ fontSize: isMobile ? "7px" : "10px", opacity: 0.8 }}
              >
                Obstacles
              </div>
            </div>
            <div
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.2)",
                padding: "7px",
                borderRadius: "7px",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? "12px" : "15px",
                  fontWeight: "bold",
                  color: "#f59e0b",
                }}
              >
                {gameStatsDisplay.bonusBoxesCollected}
              </div>
              <div
                style={{ fontSize: isMobile ? "7px" : "10px", opacity: 0.8 }}
              >
                Bonuses
              </div>
            </div>
            <div
              style={{
                backgroundColor: "rgba(139, 92, 246, 0.2)",
                padding: "7px",
                borderRadius: "7px",
                border: "1px solid rgba(139, 92, 246, 0.3)",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#8b5cf6",
                }}
              >
                {Math.floor(Date.now() / 1000) -
                  Math.floor(gameStatsRef.current.gameStartTime / 1000)}
                s
              </div>
              <div style={{ fontSize: "12px", opacity: 0.8 }}>Time</div>
            </div>
          </div>

          {selectedCar && (
            <div
              style={{
                backgroundColor: "rgba(255, 215, 0, 0.1)",
                border: "1px solid rgba(255, 215, 0, 0.3)",
                borderRadius: "7px",
                padding: "11px",
                marginBottom: "11px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    color: "#ffd700",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  🏎️ {selectedCar.name}
                </div>
                <div style={{ color: "#ffd700", fontSize: "10px" }}>
                  {
                    ["", "Common", "Uncommon", "Rare", "Epic", "Legendary"][
                      selectedCar.rarity
                    ]
                  }
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "5px",
                  fontSize: "10px",
                }}
              >
                <div>
                  <span style={{ color: "#ef4444" }}>
                    ⚡ {selectedCar.speed}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#10b981" }}>
                    🎯 {selectedCar.handling}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#3b82f6" }}>
                    🚀 {selectedCar.acceleration}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: "9px", opacity: 0.7, marginTop: "4px" }}>
                Record: {selectedCar.wins}W / {selectedCar.races}R • XP:{" "}
                {selectedCar.experience}
              </div>
              <div
                style={{
                  fontSize: "8px",
                  color: "#ffd700",
                  marginTop: "2px",
                  fontWeight: "bold",
                }}
              >
                {getCarCharacteristics(selectedCar)}
              </div>
            </div>
          )}

          {isConnected && (
            <div
              style={{
                backgroundColor: "rgba(255, 215, 0, 0.1)",
                border: "1px solid rgba(255, 215, 0, 0.3)",
                borderRadius: "7px",
                padding: "11px",
                marginBottom: "11px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    color: "#ffd700",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  🪙 FAST Tokens
                </div>
                {pendingTokens > 0 && (
                  <button
                    onClick={claimRaceTokens}
                    disabled={isClaimingTokens}
                    style={{
                      backgroundColor: isClaimingTokens ? "#6b7280" : "#ffd700",
                      color: isClaimingTokens ? "#9ca3af" : "#000",
                      border: "none",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontSize: "10px",
                      cursor: isClaimingTokens ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {isClaimingTokens
                      ? "Claiming..."
                      : `Claim ${Math.floor(pendingTokens / 1e18)}`}
                  </button>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                  fontSize: "11px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#10b981",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                  >
                    {Math.floor(tokenBalance / 1e18).toLocaleString()}
                  </div>
                  <div style={{ opacity: 0.7 }}>Claimed</div>
                </div>
                <div>
                  <div
                    style={{
                      color: "#f59e0b",
                      fontSize: "16px",
                      fontWeight: "bold",
                    }}
                  >
                    {Math.floor(pendingTokens / 1e18).toLocaleString()}
                  </div>
                  <div style={{ opacity: 0.7 }}>Pending</div>
                </div>
              </div>

              <div
                style={{
                  fontSize: "9px",
                  opacity: 0.8,
                  marginTop: "6px",
                  paddingTop: "6px",
                  borderTop: "1px solid rgba(255, 215, 0, 0.2)",
                }}
              >
                <div style={{ color: "#ffd700" }}>
                  💡 Earn tokens by racing:
                </div>
                <div style={{ color: "#ffffff", marginTop: "2px" }}>
                  • Submit race results to earn tokens • Higher scores = more
                  tokens • Claim when ready
                </div>
                <div
                  style={{
                    color: "#22c55e",
                    fontSize: "8px",
                    marginTop: "2px",
                  }}
                >
                  ✅ One transaction: Submit race + earn tokens
                </div>
              </div>
            </div>
          )}

          {isDailyChallengeRace && currentDailyChallenge && (
            <div
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                border: "2px solid #f59e0b",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#f59e0b",
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {currentDailyChallenge.emoji}{" "}
                {currentDailyChallenge.title.toUpperCase()}
              </div>
              <div style={{ fontSize: "11px", opacity: 0.8 }}>
                {currentDailyChallenge.description} →{" "}
                {currentDailyChallenge.reward} tokens!
              </div>
              <div style={{ fontSize: "11px", marginTop: "4px" }}>
                Progress: {getCurrentChallengeProgress()}
              </div>
              <div style={{ fontSize: "10px", marginTop: "2px", opacity: 0.6 }}>
                Difficulty:{" "}
                {currentDailyChallenge.difficulty.charAt(0).toUpperCase() +
                  currentDailyChallenge.difficulty.slice(1)}
              </div>
            </div>
          )}

          {tournamentId && !isDailyChallengeRace && (
            <div
              style={{
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                border: "2px solid #8b5cf6",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#8b5cf6",
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                🏆 TOURNAMENT RACE
              </div>
              <div style={{ fontSize: "11px", opacity: 0.8 }}>
                Tournament ID: {tournamentId}
              </div>
              <div style={{ fontSize: "11px", marginTop: "4px" }}>
                Score: {score} points • 5x Token Rewards!
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "8px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "10px",
            }}
          >
            <div style={{ opacity: 0.7 }}>
              {address
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : "Not connected"}
            </div>
            <div style={{ color: selectedCar ? "#00ff88" : "#fbbf24" }}>
              {selectedCar
                ? autoSubmitResults
                  ? "🔗 Auto-save"
                  : "🔗 Manual"
                : "📱 Local"}
            </div>
          </div>
        </div>

        {invisibilityActive && (
          <div
            style={{
              position: "absolute",
              top: isMobile ? "150px" : "200px",
              right: isMobile ? "10px" : "20px",
              zIndex: 150,
              color: "#ffff00",
              fontSize: isMobile ? "16px" : "20px",
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
              background: "rgba(0,0,0,0.6)",
              padding: "8px 16px",
              borderRadius: "12px",
              border: "2px solid #ffff00",
              animation: "pulse 1s infinite",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            ⚡ INVISIBLE MODE: {invisibilityCountdown}s ⚡
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: isMobile ? "10px" : "20px",
            right: isMobile ? "10px" : "20px",
            left: isMobile ? "10px" : "auto",
            maxWidth: isMobile ? "none" : "350px",
            zIndex: 100,
            color: "white",
            fontSize: isMobile ? "12px" : "14px",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            lineHeight: isMobile ? "1.4" : "1.5",
            textAlign: isMobile ? "center" : "right",
            background: isMobile ? "none" : "rgba(0,0,0,0.4)",
            padding: isMobile ? "0" : "8px 12px",
            borderRadius: isMobile ? "0" : "8px",
            backdropFilter: isMobile ? "none" : "blur(5px)",
          }}
        >
          {isMobile ? (
            <>
              A/D or ← → to move
              <br />
              ↑ ↓ for speed
              <br />
              🏆 Bonus +30 • 🗝️ Invisibility
            </>
          ) : (
            <>
              Use A/D or Arrow Keys to move • Up/Down arrows or mouse Y-axis to
              control speed
              <br />
              🏆 Bonus boxes = +30 points • 🗝️ Golden keys = Invisibility
              power-up
            </>
          )}
        </div>

        {gameOver && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                backgroundColor: "#1e293b",
                borderRadius: "8px",
                padding: "32px",
                maxWidth: "384px",
                width: "100%",
                margin: "0 16px",
                textAlign: "center",
                color: "white",
              }}
            >
              <h2
                style={{
                  fontSize: "32px",
                  fontWeight: "bold",
                  marginBottom: "24px",
                  color: "#fbbf24",
                }}
              >
                Race Complete!
              </h2>

              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span>Final Score:</span>
                  <span style={{ fontWeight: "bold" }}>
                    {gameStatsRef.current.finalScore.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span>Distance:</span>
                  <span>{gameStatsRef.current.distance}m</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span>Obstacles Avoided:</span>
                  <span>{gameStatsRef.current.obstaclesAvoided}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Bonus Collected:</span>
                  <span>{gameStatsRef.current.bonusBoxesCollected}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <span>High Score:</span>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: isNewHighScore ? "#ffd700" : "#ffffff",
                    }}
                  >
                    {highScore.toLocaleString()}
                    {isNewHighScore && " 🎉"}
                  </span>
                </div>
              </div>

              {isConnected && selectedCar && (
                <div
                  style={{
                    backgroundColor:
                      submissionStatus === "success" ? "#064e3b" : "#374151",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "16px",
                    border: `2px solid ${
                      submissionStatus === "success" ? "#10b981" : "#6b7280"
                    }`,
                  }}
                >
                  {autoSubmitResults ? (
                    <p
                      style={{
                        color: "#6ee7b7",
                        fontSize: "14px",
                        marginBottom: "8px",
                      }}
                    >
                      {submissionStatus === "waiting_wallet"
                        ? "💳 Waiting for wallet confirmation..."
                        : submissionStatus === "confirming"
                        ? "⏳ Auto-saving to Somnia..."
                        : submissionStatus === "success"
                        ? "✅ Results auto-saved on Somnia!"
                        : submissionStatus === "error"
                        ? "❌ Auto-save failed. Try manual submission."
                        : "📤 Ready to auto-save"}
                    </p>
                  ) : (
                    <div>
                      <p
                        style={{
                          color:
                            submissionStatus === "success"
                              ? "#6ee7b7"
                              : "#fbbf24",
                          fontSize: "14px",
                          marginBottom: "12px",
                        }}
                      >
                        {submissionStatus === "success"
                          ? "✅ Results submitted to blockchain!"
                          : "📊 Results ready for blockchain submission"}
                      </p>
                      <button
                        onClick={() => {
                          if (!isSubmittingScore && !hasSubmittedCurrentRace) {
                            submitRaceResult();
                          }
                        }}
                        disabled={isSubmittingScore || hasSubmittedCurrentRace}
                        style={{
                          backgroundColor: hasSubmittedCurrentRace
                            ? "#10b981"
                            : isSubmittingScore
                            ? "#6b7280"
                            : "#3b82f6",
                          color: "white",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          border: "none",
                          cursor:
                            isSubmittingScore || hasSubmittedCurrentRace
                              ? "not-allowed"
                              : "pointer",
                          fontSize: "14px",
                          width: "100%",
                          opacity: hasSubmittedCurrentRace ? 0.8 : 1,
                          position: "relative",
                          overflow: "hidden",
                          background: isSubmittingScore
                            ? "linear-gradient(90deg, #6b7280 0%, #9ca3af 50%, #6b7280 100%)"
                            : hasSubmittedCurrentRace
                            ? "#10b981"
                            : "#3b82f6",
                          backgroundSize: isSubmittingScore
                            ? "200% 100%"
                            : "100% 100%",
                          animation: isSubmittingScore
                            ? "shimmer 1.5s infinite"
                            : "none",
                        }}
                      >
                        {hasSubmittedCurrentRace
                          ? "✅ Submitted to blockchain"
                          : submissionStatus === "waiting_wallet"
                          ? "💳 Waiting for wallet..."
                          : submissionStatus === "confirming"
                          ? "⏳ Submitting to blockchain..."
                          : "🔗 Submit to Blockchain"}
                      </button>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "12px",
                      paddingTop: "8px",
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                      Auto-submit future results:
                    </span>
                    <button
                      onClick={() => setAutoSubmitResults(!autoSubmitResults)}
                      style={{
                        backgroundColor: autoSubmitResults
                          ? "#10b981"
                          : "#6b7280",
                        color: "white",
                        padding: "4px 12px",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      {autoSubmitResults ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <button
                  onClick={() => {
                    setGameOver(false);
                    setScore(0);
                    setHasSubmittedCurrentRace(false);
                    setSubmissionStatus("idle");
                    setIsNewHighScore(false);
                    setCompletedChallengeReward(null);

                    gameStateRef.current = {
                      carPosition: 0,
                      targetCarPosition: 0,
                      baseGameSpeed: 0.008,
                      speedMultiplier: 1.0,
                      obstacleSpawnRate: 0.015,
                      nextBonusThreshold: 70,
                      gameStartTime: Date.now(),
                      nextKeySpawnTime: 15,
                      keySpawnInterval: 30,
                      isInvisible: false,
                      invisibilityTimer: 0,
                      currentScore: 0,
                      speedBonus: 1.0,
                      handlingBonus: 1.0,
                      accelerationBonus: 1.0,
                      maxSpeedForCar: 2.0,
                    };

                    gameStatsRef.current = {
                      distance: 0,
                      obstaclesAvoided: 0,
                      bonusBoxesCollected: 0,
                      gameStartTime: Date.now(),
                      finalScore: 0,
                      lapTime: 0,
                    };

                    obstaclesRef.current = [];
                    bonusBoxesRef.current = [];
                    goldenKeysRef.current = [];

                    if (selectedCar) {
                      applyCarStats(selectedCar);
                    }

                    if (rendererRef.current && mountRef.current) {
                      try {
                        if (
                          mountRef.current.contains(
                            rendererRef.current.domElement
                          )
                        ) {
                          mountRef.current.removeChild(
                            rendererRef.current.domElement
                          );
                        }
                        rendererRef.current.dispose();
                        rendererRef.current = null;
                      } catch (error) {
                        console.error("Cleanup error:", error);
                      }
                    }
                    setTimeout(() => setGameRunning(true), 100);
                  }}
                  style={{
                    backgroundColor: "#6366f1",
                    color: "white",
                    padding: "8px 24px",
                    borderRadius: "8px",
                    width: "100%",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  🏁 Race Again
                </button>

                <button
                  onClick={() => setShowCarSelection(true)}
                  style={{
                    backgroundColor: "#0891b2",
                    color: "white",
                    padding: "8px 24px",
                    borderRadius: "8px",
                    width: "100%",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  🚗 Change Car
                </button>

                <button
                  onClick={() => {
                    setGameOver(false);
                    setGameRunning(false);
                    setShowMenu(true);
                    setIsNewHighScore(false);
                  }}
                  style={{
                    backgroundColor: "#4b5563",
                    color: "white",
                    padding: "8px 24px",
                    borderRadius: "8px",
                    width: "100%",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  📊 Main Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {showCarSelection && (
          <div
            className="custom-scroll smooth-scroll"
            onClick={() => setShowCarSelection(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              zIndex: 200,
              overflowY: "auto",
              paddingTop: "20px",
              paddingBottom: "20px",
            }}
          >
            <div
              className="custom-scroll smooth-scroll"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#1e293b",
                borderRadius: "8px",
                padding: "24px",
                maxWidth: "600px",
                width: "100%",
                margin: "0 16px",
                color: "white",
                maxHeight: "90vh",
                overflowY: "auto",
                boxSizing: "border-box",
              }}
            >
              <h2 style={{ marginBottom: "20px", textAlign: "center" }}>
                {carSelectionMode === "select"
                  ? "Change Your Racing Car"
                  : "Car Lot"}
              </h2>
              {carSelectionMode === "select" ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "16px",
                    marginBottom: "20px",
                  }}
                >
                  {playerCars.length > 0 ? (
                    playerCars.map((car) => (
                      <div
                        key={car.id}
                        style={{
                          border: car.isStaked
                            ? "2px solid #ef4444"
                            : selectedCar?.id === car.id
                            ? "2px solid #ffd700"
                            : "2px solid #4b5563",
                          borderRadius: "8px",
                          padding: "16px",
                          cursor: car.isStaked ? "not-allowed" : "pointer",
                          backgroundColor: car.isStaked
                            ? "rgba(239, 68, 68, 0.1)"
                            : selectedCar?.id === car.id
                            ? "rgba(255, 215, 0, 0.1)"
                            : "#374151",
                          opacity: car.isStaked ? 0.6 : 1,
                          position: "relative",
                        }}
                        onClick={() => {
                          if (car.isStaked) {
                            console.warn(
                              "🚫 Cannot select staked car:",
                              car.name
                            );
                            return;
                          }
                          setSelectedCar(car);
                          setShowCarSelection(false);
                        }}
                      >
                        <h3
                          style={{
                            marginBottom: "10px",
                            color:
                              car.rarity >= 4
                                ? "#fbbf24"
                                : car.rarity >= 3
                                ? "#8b5cf6"
                                : car.rarity >= 2
                                ? "#3b82f6"
                                : "#4ade80",
                          }}
                        >
                          {car.name}
                          {car.isStaked && (
                            <span
                              style={{
                                marginLeft: "8px",
                                fontSize: "12px",
                                background: "#ef4444",
                                color: "white",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "bold",
                              }}
                            >
                              🔒 STAKED
                            </span>
                          )}
                        </h3>
                        {car.isStaked && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#ef4444",
                              marginBottom: "8px",
                              fontWeight: "bold",
                              textAlign: "center",
                              background: "rgba(239, 68, 68, 0.1)",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                            }}
                          >
                            ⚠️ Car is staked and unavailable for racing
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: "12px",
                            marginBottom: "8px",
                            color: "#ffd700",
                          }}
                        >
                          {getCarCharacteristics(car)}
                        </div>
                        <div style={{ fontSize: "14px" }}>
                          <div
                            style={{
                              color:
                                car.speed >= 80
                                  ? "#22c55e"
                                  : car.speed >= 60
                                  ? "#f59e0b"
                                  : "#ef4444",
                            }}
                          >
                            ⚡ Speed: {car.speed}/100
                          </div>
                          <div
                            style={{ color: "#d1d5db", marginBottom: "4px" }}
                          >
                            🎨 Color: {car.color || "Gray"}
                          </div>
                          <div
                            style={{
                              color:
                                car.handling >= 80
                                  ? "#22c55e"
                                  : car.handling >= 60
                                  ? "#f59e0b"
                                  : "#ef4444",
                            }}
                          >
                            🎯 Handling: {car.handling}/100
                          </div>
                          <div
                            style={{
                              color:
                                car.acceleration >= 80
                                  ? "#22c55e"
                                  : car.acceleration >= 60
                                  ? "#f59e0b"
                                  : "#ef4444",
                            }}
                          >
                            🚀 Acceleration: {car.acceleration}/100
                          </div>
                          <div style={{ marginTop: "4px" }}>
                            Rarity:{" "}
                            <span
                              style={{
                                color:
                                  [
                                    "",
                                    "#888888",
                                    "#4ade80",
                                    "#3b82f6",
                                    "#8b5cf6",
                                    "#fbbf24",
                                  ][car.rarity] || "#888888",
                                fontWeight: "bold",
                              }}
                            >
                              {
                                [
                                  "",
                                  "Common",
                                  "Uncommon",
                                  "Rare",
                                  "Epic",
                                  "Legendary",
                                ][car.rarity]
                              }
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              opacity: 0.8,
                              marginTop: "4px",
                            }}
                          >
                            Record: {car.wins}W / {car.races}R
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#9ca3af",
                      }}
                    >
                      <p>No cars available. Purchase a car first!</p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      border: hasCarType("starter")
                        ? "2px solid #6b7280"
                        : "2px solid #10b981",
                      borderRadius: "8px",
                      padding: "20px",
                      backgroundColor: hasCarType("starter")
                        ? "#374151"
                        : "#065f46",
                      cursor: hasCarType("starter") ? "not-allowed" : "pointer",
                      opacity: hasCarType("starter") ? 0.6 : 1,
                    }}
                    onClick={async () => {
                      if (!hasCarType("starter") && !purchasingCar) {
                        await mintCarWithConfirmation(
                          "starter",
                          "Starter Racer"
                        );
                      }
                    }}
                  >
                    <h3
                      style={{
                        marginBottom: "10px",
                        color: hasCarType("starter") ? "#9ca3af" : "#10b981",
                      }}
                    >
                      🚗 Starter Racer
                    </h3>
                    <div style={{ fontSize: "14px", marginBottom: "12px" }}>
                      <div>⚡ Speed: 50/100</div>
                      <div>🎯 Handling: 60/100</div>
                      <div>🚀 Acceleration: 55/100</div>
                      <div>
                        Rarity: <span style={{ color: "#4ade80" }}>Common</span>
                      </div>
                    </div>
                    <div
                      style={{
                        background: hasCarType("starter")
                          ? "#6b7280"
                          : purchasingCar === "Starter Racer"
                          ? "#fbbf24"
                          : "#10b981",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        textAlign: "center",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      {hasCarType("starter")
                        ? "✅ Purchased"
                        : purchasingCar === "Starter Racer"
                        ? "⏳ Buying..."
                        : "Buy for 0.01 STT"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: hasCarType("sport")
                        ? "2px solid #6b7280"
                        : "2px solid #3b82f6",
                      borderRadius: "8px",
                      padding: "20px",
                      backgroundColor: hasCarType("sport")
                        ? "#374151"
                        : "#1e40af",
                      cursor: hasCarType("sport") ? "not-allowed" : "pointer",
                      opacity: hasCarType("sport") ? 0.6 : 1,
                    }}
                    onClick={async () => {
                      if (!hasCarType("sport") && !purchasingCar) {
                        await mintCarWithConfirmation("premium", "Sport Car");
                      }
                    }}
                  >
                    <h3
                      style={{
                        marginBottom: "10px",
                        color: hasCarType("sport") ? "#9ca3af" : "#3b82f6",
                      }}
                    >
                      🏎️ Sport Car
                    </h3>
                    <div style={{ fontSize: "14px", marginBottom: "12px" }}>
                      <div>⚡ Speed: 75/100</div>
                      <div>🎯 Handling: 70/100</div>
                      <div>🚀 Acceleration: 80/100</div>
                      <div>
                        Rarity: <span style={{ color: "#3b82f6" }}>Rare</span>
                      </div>
                    </div>
                    <div
                      style={{
                        background: hasCarType("sport")
                          ? "#6b7280"
                          : purchasingCar === "Sport Car"
                          ? "#fbbf24"
                          : "#3b82f6",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        textAlign: "center",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      {hasCarType("sport")
                        ? "✅ Purchased"
                        : purchasingCar === "Sport Car"
                        ? "⏳ Buying..."
                        : "Buy for 0.05 STT"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: hasCarType("racing")
                        ? "2px solid #6b7280"
                        : "2px solid #8b5cf6",
                      borderRadius: "8px",
                      padding: "20px",
                      backgroundColor: hasCarType("racing")
                        ? "#374151"
                        : "#6d28d9",
                      cursor: hasCarType("racing") ? "not-allowed" : "pointer",
                      opacity: hasCarType("racing") ? 0.6 : 1,
                    }}
                    onClick={async () => {
                      if (!hasCarType("racing") && !purchasingCar) {
                        await mintCarWithConfirmation(
                          "premium",
                          "Racing Beast"
                        );
                      }
                    }}
                  >
                    <h3
                      style={{
                        marginBottom: "10px",
                        color: hasCarType("racing") ? "#9ca3af" : "#8b5cf6",
                      }}
                    >
                      🏁 Racing Beast
                    </h3>
                    <div style={{ fontSize: "14px", marginBottom: "12px" }}>
                      <div>⚡ Speed: 90/100</div>
                      <div>🎯 Handling: 85/100</div>
                      <div>🚀 Acceleration: 88/100</div>
                      <div>
                        Rarity: <span style={{ color: "#8b5cf6" }}>Epic</span>
                      </div>
                    </div>
                    <div
                      style={{
                        background: hasCarType("racing")
                          ? "#6b7280"
                          : purchasingCar === "Racing Beast"
                          ? "#fbbf24"
                          : "#8b5cf6",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        textAlign: "center",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      {hasCarType("racing")
                        ? "✅ Purchased"
                        : purchasingCar === "Racing Beast"
                        ? "⏳ Buying..."
                        : "Buy for 0.08 STT"}
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      if (!hasCarType("hybrid") && playerCars.length >= 2) {
                        setShowBreedingModal(true);
                      }
                    }}
                    style={{
                      border: hasCarType("hybrid")
                        ? "2px solid #6b7280"
                        : "2px solid #f59e0b",
                      borderRadius: "8px",
                      padding: "20px",
                      backgroundColor: hasCarType("hybrid")
                        ? "#374151"
                        : "#d97706",
                      cursor: hasCarType("hybrid")
                        ? "not-allowed"
                        : playerCars.length >= 2
                        ? "pointer"
                        : "not-allowed",
                      opacity:
                        hasCarType("hybrid") || playerCars.length < 2 ? 0.8 : 1,
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!hasCarType("hybrid") && playerCars.length >= 2) {
                        e.currentTarget.style.transform = "scale(1.02)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 25px rgba(245,158,11,0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!hasCarType("hybrid") && playerCars.length >= 2) {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    <h3
                      style={{
                        marginBottom: "10px",
                        color: hasCarType("hybrid") ? "#9ca3af" : "#f59e0b",
                      }}
                    >
                      🧬 Gen-X Hybrid
                    </h3>
                    <div style={{ fontSize: "14px", marginBottom: "12px" }}>
                      <div>⚡ Speed: 95/100</div>
                      <div>🎯 Handling: 92/100</div>
                      <div>🚀 Acceleration: 90/100</div>
                      <div>
                        Rarity:{" "}
                        <span style={{ color: "#f59e0b" }}>Legendary</span>
                      </div>
                      <div
                        style={{
                          marginTop: "8px",
                          fontSize: "12px",
                          opacity: 0.9,
                        }}
                      >
                        🧬 <em>Created through car breeding</em>
                      </div>
                    </div>
                    <div
                      style={{
                        background: hasCarType("hybrid")
                          ? "#6b7280"
                          : "#92400e",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        textAlign: "center",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      {hasCarType("hybrid")
                        ? "✅ Bred Successfully"
                        : "🧬 Requires Breeding (0.01 STT)"}
                    </div>
                    {!hasCarType("hybrid") && playerCars.length >= 2 && (
                      <div
                        style={{
                          marginTop: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                          opacity: 0.9,
                        }}
                      >
                        💡 Breed two of your existing cars to create this
                        legendary hybrid!
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => setShowCarSelection(false)}
                  style={{
                    backgroundColor: "#4b5563",
                    color: "white",
                    padding: "8px 24px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showRaceHistory && (
          <div
            onClick={() => setShowRaceHistory(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
            }}
          >
            <div
              className="custom-scroll smooth-scroll"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#1e293b",
                borderRadius: "8px",
                padding: "24px",
                maxWidth: "800px",
                width: "100%",
                margin: "0 16px",
                color: "white",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              <h2 style={{ marginBottom: "20px", textAlign: "center" }}>
                🏁 Race History & Stats
              </h2>

              {gameHistory.length > 0 ? (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#374151",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "2px solid #ffd700",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "24px",
                          color: "#ffd700",
                          fontWeight: "bold",
                        }}
                      >
                        {highScore.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "14px", opacity: 0.8 }}>
                        High Score 🏆
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#374151",
                        padding: "16px",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ fontSize: "20px", color: "#10b981" }}>
                        {gameHistory.length}
                      </div>
                      <div style={{ fontSize: "14px", opacity: 0.8 }}>
                        Total Games
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: "#374151",
                        padding: "16px",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ fontSize: "20px", color: "#3b82f6" }}>
                        {gameHistory.length > 0
                          ? Math.round(
                              gameHistory.reduce(
                                (sum, game) => sum + game.score,
                                0
                              ) / gameHistory.length
                            ).toLocaleString()
                          : 0}
                      </div>
                      <div style={{ fontSize: "14px", opacity: 0.8 }}>
                        Avg Score
                      </div>
                    </div>
                  </div>

                  <h3 style={{ marginBottom: "16px", color: "#fbbf24" }}>
                    🏁 Recent Games
                  </h3>
                  <div
                    className="custom-scroll smooth-scroll"
                    style={{ maxHeight: "400px", overflowY: "auto" }}
                  >
                    {gameHistory.slice(0, 20).map((game) => (
                      <div
                        key={game.id}
                        style={{
                          backgroundColor: game.isNewHighScore
                            ? "rgba(255, 215, 0, 0.1)"
                            : "#374151",
                          border: game.isNewHighScore
                            ? "1px solid #ffd700"
                            : "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "8px",
                          padding: "12px",
                          marginBottom: "8px",
                          position: "relative",
                        }}
                      >
                        {game.isNewHighScore && (
                          <div
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              backgroundColor: "#ffd700",
                              color: "#000",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: "bold",
                            }}
                          >
                            NEW HIGH!
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "8px",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "18px",
                                fontWeight: "bold",
                                color: game.isNewHighScore
                                  ? "#ffd700"
                                  : "#ffffff",
                              }}
                            >
                              {game.score.toLocaleString()} pts
                            </div>
                            <div style={{ fontSize: "12px", opacity: 0.7 }}>
                              {new Date(game.timestamp).toLocaleDateString()} at{" "}
                              {new Date(game.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "12px", color: "#ffd700" }}>
                              🚗 {game.carUsed}
                            </div>
                            <div style={{ fontSize: "12px", opacity: 0.7 }}>
                              {game.lapTime.toFixed(1)}s
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: "8px",
                            fontSize: "11px",
                          }}
                        >
                          <div>
                            <span style={{ color: "#3b82f6" }}>
                              📏 {game.distance}m
                            </span>
                          </div>
                          <div>
                            <span style={{ color: "#10b981" }}>
                              🚧 {game.obstaclesAvoided}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: "#f59e0b" }}>
                              🏆 {game.bonusBoxesCollected}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#9ca3af",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    📊
                  </div>
                  <h3 style={{ marginBottom: "12px", color: "#ffffff" }}>
                    No Game History
                  </h3>
                  <p>Play some races to see your performance history here!</p>
                  <div
                    style={{
                      fontSize: "12px",
                      opacity: 0.7,
                      marginTop: "16px",
                      padding: "12px",
                      backgroundColor: "rgba(59, 130, 246, 0.1)",
                      borderRadius: "8px",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    💡 Your game history is saved locally and will show:
                    <br />• High scores and personal bests
                    <br />• Detailed race statistics
                    <br />• Performance over time
                  </div>
                </div>
              )}

              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => setShowRaceHistory(false)}
                  style={{
                    backgroundColor: "#4b5563",
                    color: "white",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showMissionComplete && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 150,
              background: "rgba(0,0,0,0.9)",
              color: "#ffd700",
              padding: "12px 20px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              textAlign: "center",
              border: "2px solid #ffd700",
            }}
          >
            {showMissionComplete}
          </div>
        )}

        {breedingNotification && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              background: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
              color: "#ffffff",
              padding: "16px 24px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "bold",
              textAlign: "center",
              border: "2px solid #f59e0b",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
              maxWidth: "400px",
              wordWrap: "break-word",
            }}
          >
            {breedingNotification}
          </div>
        )}

        {purchaseConfirmation && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 200,
              background: "rgba(0,0,0,0.95)",
              color: "#ffffff",
              padding: "24px 32px",
              borderRadius: "12px",
              fontSize: "18px",
              fontWeight: "bold",
              textAlign: "center",
              border: purchaseConfirmation.includes("❌")
                ? "2px solid #ef4444"
                : "2px solid #10b981",
              maxWidth: "400px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {purchaseConfirmation}
          </div>
        )}

        {showBreedingModal && (
          <div
            onClick={() => {
              setShowBreedingModal(false);
              setSelectedParent1(null);
              setSelectedParent2(null);
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              className="custom-scroll smooth-scroll"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#1e293b",
                borderRadius: "12px",
                padding: "30px",
                maxWidth: "600px",
                width: "90%",
                maxHeight: "80vh",
                overflowY: "auto",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <h2
                style={{
                  color: "#f59e0b",
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginBottom: "20px",
                  textAlign: "center",
                }}
              >
                🧬 Breed Gen-X Hybrid
              </h2>

              <p
                style={{
                  color: "#d1d5db",
                  marginBottom: "20px",
                  textAlign: "center",
                  lineHeight: "1.5",
                }}
              >
                Select two cars to breed together and create a legendary Gen-X
                Hybrid with combined stats!
                <br />
                <span
                  style={{
                    color: "#f59e0b",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  Breeding Cost: 0.01 STT
                </span>
                <br />
                <span style={{ color: "#10b981", fontSize: "12px" }}>
                  💡 Cars must be at least 24 hours old and not staked to breed
                </span>
              </p>

              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ color: "#f59e0b", marginBottom: "15px" }}>
                  Select Parent Cars:
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "15px",
                  }}
                >
                  {playerCars.map((car) => {
                    const now = Date.now();
                    const BREEDING_COOLDOWN_MS = 24 * 60 * 60 * 1000;
                    const carAge = now - car.birthTime * 1000;
                    const isEligible =
                      !car.isStaked && carAge >= BREEDING_COOLDOWN_MS;
                    const hoursLeft = isEligible
                      ? 0
                      : Math.ceil(
                          (BREEDING_COOLDOWN_MS - carAge) / (60 * 60 * 1000)
                        );

                    return (
                      <div
                        key={car.id}
                        onClick={() => {
                          if (!isEligible) return;

                          if (selectedParent1 === null) {
                            setSelectedParent1(car.id);
                          } else if (
                            selectedParent2 === null &&
                            car.id !== selectedParent1
                          ) {
                            setSelectedParent2(car.id);
                          } else {
                            setSelectedParent1(car.id);
                            setSelectedParent2(null);
                          }
                        }}
                        style={{
                          border: !isEligible
                            ? "2px solid rgba(239, 68, 68, 0.5)"
                            : selectedParent1 === car.id ||
                              selectedParent2 === car.id
                            ? "2px solid #f59e0b"
                            : "2px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "8px",
                          padding: "15px",
                          backgroundColor: !isEligible
                            ? "rgba(239, 68, 68, 0.1)"
                            : selectedParent1 === car.id ||
                              selectedParent2 === car.id
                            ? "rgba(245, 158, 11, 0.1)"
                            : "#374151",
                          cursor: isEligible ? "pointer" : "not-allowed",
                          transition: "all 0.3s ease",
                          opacity: isEligible ? 1 : 0.7,
                        }}
                      >
                        <h4 style={{ color: "#f59e0b", marginBottom: "8px" }}>
                          {car.name || `Car #${car.id}`} (ID: {car.id})
                        </h4>
                        <div style={{ fontSize: "12px", color: "#d1d5db" }}>
                          <div>🎨 Color: {car.color || "Gray"}</div>
                          <div>⚡ Speed: {car.speed}/100</div>
                          <div>🎯 Handling: {car.handling}/100</div>
                          <div>🚀 Acceleration: {car.acceleration}/100</div>
                          <div>🏆 Rarity: {car.rarity}/5</div>
                        </div>

                        {car.isStaked && (
                          <div
                            style={{
                              marginTop: "8px",
                              color: "#ef4444",
                              fontSize: "11px",
                              fontWeight: "bold",
                            }}
                          >
                            🔒 Cannot breed staked cars
                          </div>
                        )}
                        {!car.isStaked && carAge < BREEDING_COOLDOWN_MS && (
                          <div
                            style={{
                              marginTop: "8px",
                              color: "#ef4444",
                              fontSize: "11px",
                              fontWeight: "bold",
                            }}
                          >
                            ⏰ Cooldown: {hoursLeft}h remaining
                          </div>
                        )}
                        {isEligible && (
                          <div
                            style={{
                              marginTop: "8px",
                              color: "#10b981",
                              fontSize: "11px",
                              fontWeight: "bold",
                            }}
                          >
                            ✅ Ready to breed
                          </div>
                        )}

                        {selectedParent1 === car.id && (
                          <div
                            style={{
                              marginTop: "8px",
                              color: "#f59e0b",
                              fontSize: "12px",
                            }}
                          >
                            📍 Parent 1 Selected
                          </div>
                        )}
                        {selectedParent2 === car.id && (
                          <div
                            style={{
                              marginTop: "8px",
                              color: "#f59e0b",
                              fontSize: "12px",
                            }}
                          >
                            📍 Parent 2 Selected
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => {
                    setShowBreedingModal(false);
                    setSelectedParent1(null);
                    setSelectedParent2(null);
                  }}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    if (selectedParent1 !== null && selectedParent2 !== null) {
                      try {
                        await breedCarsWithConfirmation(
                          selectedParent1,
                          selectedParent2
                        );

                        setShowBreedingModal(false);
                        setSelectedParent1(null);
                        setSelectedParent2(null);
                      } catch (error) {
                        console.error("Breeding failed:", error);
                      }
                    }
                  }}
                  disabled={
                    selectedParent1 === null ||
                    selectedParent2 === null ||
                    purchasingCar !== ""
                  }
                  style={{
                    backgroundColor:
                      selectedParent1 !== null &&
                      selectedParent2 !== null &&
                      purchasingCar === ""
                        ? "#f59e0b"
                        : "#6b7280",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor:
                      selectedParent1 !== null &&
                      selectedParent2 !== null &&
                      purchasingCar === ""
                        ? "pointer"
                        : "not-allowed",
                    opacity:
                      selectedParent1 !== null &&
                      selectedParent2 !== null &&
                      purchasingCar === ""
                        ? 1
                        : 0.6,
                  }}
                >
                  {purchasingCar === "Gen-X Hybrid"
                    ? "⏳ Breeding..."
                    : selectedParent1 !== null && selectedParent2 !== null
                    ? "🧬 Breed for 0.01 STT"
                    : "Select 2 Eligible Cars"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showGarage && <CarGarage onClose={() => setShowGarage(false)} />}

        <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    </>
  );
};

export default EnhancedCarRaceGame;
