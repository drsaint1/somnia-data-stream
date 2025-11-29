import React, { useState, useEffect, useCallback } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "../config/web3Config";
import {
  RACING_CONTRACT_ADDRESS,
  RACING_ABI,
} from "../hooks/useRacingContract";
import {
  TOURNAMENTS_CONTRACT_ADDRESS,
  TOURNAMENTS_ABI,
} from "../contracts/tournamentsAbi";

const LOCAL_TOURNAMENT_ABI = [
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "entryFee", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "maxParticipants", type: "uint256" },
    ],
    name: "createTournament",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "tournamentId", type: "uint256" },
      { name: "carId", type: "uint256" },
    ],
    name: "enterTournament",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "tournaments",
    outputs: [
      { name: "id", type: "uint256" },
      { name: "name", type: "string" },
      { name: "entryFee", type: "uint256" },
      { name: "prizePool", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "maxParticipants", type: "uint256" },
      { name: "finalized", type: "bool" },
      { name: "creator", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextTournamentId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tournamentId", type: "uint256" }],
    name: "getTournamentParticipants",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tournamentId", type: "uint256" }],
    name: "getTournamentDetails",
    outputs: [
      { name: "name", type: "string" },
      { name: "entryFee", type: "uint256" },
      { name: "prizePool", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "participantCount", type: "uint256" },
      { name: "finalized", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "player", type: "address" }],
    name: "getPlayerCars",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
    name: "tournaments",
    outputs: [
      { name: "id", type: "uint256" },
      { name: "name", type: "string" },
      { name: "entryFee", type: "uint256" },
      { name: "prizePool", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "maxParticipants", type: "uint256" },
      { name: "finalized", type: "bool" },
      { name: "creator", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "carId", type: "uint256" }],
    name: "getCarRaceHistory",
    outputs: [
      {
        components: [
          { name: "player", type: "address" },
          { name: "carId", type: "uint256" },
          { name: "score", type: "uint256" },
          { name: "distance", type: "uint256" },
          { name: "obstaclesAvoided", type: "uint256" },
          { name: "bonusCollected", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "tournamentId", type: "uint256" },
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
    inputs: [{ name: "tournamentId", type: "uint256" }],
    name: "getTournamentWinners",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface Tournament {
  id: number;
  name: string;
  entryFee: bigint;
  prizePool: bigint;
  startTime: number;
  endTime: number;
  participantCount: number;
  maxParticipants: number;
  finalized: boolean;
}

interface TournamentLobbyProps {
  onStartRace: (tournamentId: number) => void;
  onClose: () => void;
  selectedCarId?: number;
  completedTournamentsFromApp?: Set<number>;
}

interface TournamentResultsModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  userAddress?: string;
  selectedCarId?: number;
}

interface TournamentResult {
  carId: number;
  owner: string;
  ownerAddress: string;
  score: number;
  rank: number;
  prize?: string;
  carName?: string;
}

const TournamentResultsModal: React.FC<TournamentResultsModalProps> = ({
  tournament,
  isOpen,
  onClose,
  userAddress,
  selectedCarId,
}) => {
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [userResult, setUserResult] = useState<TournamentResult | null>(null);

  useEffect(() => {
    if (isOpen && tournament) {
      loadResults();
    }
  }, [isOpen, tournament]);

  const loadResults = async () => {
    if (!tournament) return;

    setLoading(true);
    try {
      const [tournamentWinners, tournamentScoresData] = await Promise.all([
        readContract(config, {
          address: TOURNAMENTS_CONTRACT_ADDRESS,
          abi: TOURNAMENTS_ABI,
          functionName: "getTournamentWinners",
          args: [BigInt(tournament.id)],
        }),
        readContract(config, {
          address: TOURNAMENTS_CONTRACT_ADDRESS,
          abi: TOURNAMENTS_ABI,
          functionName: "getTournamentScores",
          args: [BigInt(tournament.id)],
        }),
      ]);

      console.log("Loading tournament results:", {
        tournamentWinners,
        tournamentScoresData,
      });

      const [carIds, scores] = tournamentScoresData;

      const participantDataPromises = carIds.map(async (carId, index) => {
        try {
          const carIdNum = Number(carId);
          const tournamentScore = Number(scores[index]);
          const [carDetails, ownerAddress] = await Promise.all([
            readContract(config, {
              address: RACING_CONTRACT_ADDRESS,
              abi: RACING_ABI,
              functionName: "getCarDetails",
              args: [carId],
            }),
            readContract(config, {
              address: RACING_CONTRACT_ADDRESS,
              abi: RACING_ABI,
              functionName: "ownerOf",
              args: [carId],
            }),
          ]);

          const ownerAddressStr = String(ownerAddress);
          const carDetailsObj = carDetails as any;

          return {
            carId: carIdNum,
            owner: `${ownerAddressStr.slice(0, 6)}...${ownerAddressStr.slice(
              -4
            )}`,
            ownerAddress: ownerAddressStr,
            score: tournamentScore,
            carName:
              carDetailsObj.name || carDetailsObj[1] || `Car #${carIdNum}`,
            rank: 0,
            prize: undefined,
          };
        } catch (error) {
          console.error(`Failed to load data for car ${carId}:`, error);

          return {
            carId: Number(carId),
            owner: "Unknown Player",
            ownerAddress:
              "0x0000000000000000000000000000000000000000" as string,
            score: Number(scores[index]) || 0,
            carName: `Car #${carId}`,
            rank: 0,
            prize: undefined,
          };
        }
      });

      const participantResults = await Promise.all(participantDataPromises);

      participantResults.sort((a, b) => b.score - a.score);

      participantResults.forEach((result, index) => {
        result.rank = index + 1;
        if (index < 3) {
          (result as any).prize = ["🥇 50%", "🥈 30%", "🥉 20%"][index];
        }
      });

      setResults(participantResults);

      if (userAddress) {
        try {
          const playerTournamentData = await readContract(config, {
            address: TOURNAMENTS_CONTRACT_ADDRESS,
            abi: TOURNAMENTS_ABI,
            functionName: "getPlayerTournamentResults",
            args: [BigInt(tournament.id), userAddress as `0x${string}`],
          });

          const [participated, playerCarIds, , bestScore, bestRank] =
            playerTournamentData;

          if (participated && Number(bestScore) > 0) {
            const userTournamentResult: TournamentResult = {
              carId: Number(playerCarIds[0]),
              owner: `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`,
              ownerAddress: userAddress,
              score: Number(bestScore),
              rank: Number(bestRank),
              prize:
                Number(bestRank) <= 3
                  ? ["🥇 50%", "🥈 30%", "🥉 20%"][Number(bestRank) - 1]
                  : undefined,
              carName: `Multiple Cars (${playerCarIds.length})`,
            };
            setUserResult(userTournamentResult);
          } else {
            setUserResult(null);
          }
        } catch (error) {
          console.error("Failed to get player tournament results:", error);

          const userResults = participantResults.filter(
            (r) =>
              String(r.ownerAddress).toLowerCase() === userAddress.toLowerCase()
          );

          if (userResults.length > 0) {
            const bestResult = userResults.sort((a, b) => a.rank - b.rank)[0];
            setUserResult(bestResult);
          } else {
            setUserResult(null);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load tournament results:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !tournament) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "20px",
          padding: "30px",
          maxWidth: "800px",
          width: "95%",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "2px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                background: "linear-gradient(45deg, #ffd700, #ff6b6b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                margin: 0,
              }}
            >
              🏆 {tournament.name} Results
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "14px",
                margin: "5px 0 0 0",
              }}
            >
              Prize Pool: {formatEther(tournament.prizePool)} STT •
              Participants: {tournament.participantCount}
            </p>
            <p
              style={{
                color: "rgba(16, 185, 129, 0.8)",
                fontSize: "12px",
                margin: "5px 0 0 0",
              }}
            >
              ✅ Exact tournament scores & participation tracking from
              blockchain
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "white",
              border: "2px solid rgba(255,255,255,0.3)",
              padding: "8px 16px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ✕ Close
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid rgba(255,255,255,0.3)",
                borderTop: "3px solid #ffd700",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 20px auto",
              }}
            ></div>
            <p style={{ color: "white", fontSize: "18px" }}>
              Loading tournament results...
            </p>
          </div>
        ) : (
          <>
            {userResult && (
              <div
                style={{
                  background: "linear-gradient(45deg, #6366f1, #059669)",
                  padding: "20px",
                  borderRadius: "15px",
                  marginBottom: "25px",
                  textAlign: "center",
                }}
              >
                <h3
                  style={{
                    color: "white",
                    fontSize: "20px",
                    margin: "0 0 10px 0",
                  }}
                >
                  🎯 Your Performance
                </h3>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "30px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "14px",
                      }}
                    >
                      Rank
                    </div>
                    <div
                      style={{
                        color: "white",
                        fontSize: "24px",
                        fontWeight: "bold",
                      }}
                    >
                      #{userResult.rank}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "14px",
                      }}
                    >
                      Score
                    </div>
                    <div
                      style={{
                        color: "white",
                        fontSize: "24px",
                        fontWeight: "bold",
                      }}
                    >
                      {userResult.score.toLocaleString()}
                    </div>
                  </div>
                  {userResult.prize && (
                    <div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: "14px",
                        }}
                      >
                        Prize
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "24px",
                          fontWeight: "bold",
                        }}
                      >
                        {userResult.prize}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: "15px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 120px 120px",
                  gap: "15px",
                  padding: "15px 20px",
                  background: "rgba(255,255,255,0.1)",
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                <div>Rank</div>
                <div>Player</div>
                <div>Score</div>
                <div>Prize</div>
              </div>

              {results.slice(0, 10).map((result, index) => (
                <div
                  key={result.carId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 120px 120px",
                    gap: "15px",
                    padding: "15px 20px",
                    borderBottom:
                      index < results.length - 1
                        ? "1px solid rgba(255,255,255,0.1)"
                        : "none",
                    background:
                      result.carId === selectedCarId
                        ? "rgba(16, 185, 129, 0.1)"
                        : "transparent",
                  }}
                >
                  <div
                    style={{
                      color: result.rank <= 3 ? "#ffd700" : "white",
                      fontWeight: "bold",
                      fontSize: "16px",
                    }}
                  >
                    {result.rank <= 3
                      ? ["🥇", "🥈", "🥉"][result.rank - 1]
                      : `#${result.rank}`}
                  </div>
                  <div style={{ color: "white" }}>
                    {result.carName || `Car #${result.carId}`}{" "}
                    {result.carId === selectedCarId && "(You)"}
                  </div>
                  <div style={{ color: "white", fontWeight: "bold" }}>
                    {result.score.toLocaleString()}
                  </div>
                  <div
                    style={{
                      color: result.prize ? "#6366f1" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {result.prize || "-"}
                  </div>
                </div>
              ))}
            </div>

            {results.length > 10 && (
              <p
                style={{
                  textAlign: "center",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "14px",
                  marginTop: "15px",
                }}
              >
                Showing top 10 results of {results.length} participants
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

const TournamentLobby: React.FC<TournamentLobbyProps> = ({
  onStartRace,
  onClose,
  selectedCarId,
  completedTournamentsFromApp,
}) => {
  const { isConnected, address } = useAccount();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joinedTournaments, setJoinedTournaments] = useState<Set<number>>(
    new Set()
  );
  const [availableCarId, setAvailableCarId] = useState<number | null>(null);
  const [playerCars, setPlayerCars] = useState<any[]>([]);
  const [carAvailabilityLoading, setCarAvailabilityLoading] = useState(true);
  const [completedTournaments, setCompletedTournaments] = useState<Set<number>>(
    new Set()
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedTournamentResults, setSelectedTournamentResults] =
    useState<Tournament | null>(null);
  const [newTournament, setNewTournament] = useState({
    name: "",
    entryFee: "0.01",
    duration: "24",
    maxParticipants: "50",
    prizePool: "0.1",
  });

  // Blockchain hooks
  const { writeContractAsync } = useWriteContract();

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" | "info"
  ) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const loadTournamentResults = async (tournament: Tournament) => {
    if (
      getCurrentTournamentStatus(tournament) !== "ended" ||
      !tournament.finalized
    ) {
      showToast(
        "Tournament results are only available for completed tournaments",
        "warning"
      );
      return;
    }

    try {
      setSelectedTournamentResults(tournament);
      setShowResultsModal(true);
    } catch (error) {
      console.error("Failed to load tournament results:", error);
      showToast("Failed to load tournament results", "error");
    }
  };

  // Check tournament completion
  const checkIfUserCompletedTournament = async (tournamentId: number) => {
    if (!address) return false;

    try {
      const playerTournamentData = await readContract(config, {
        address: TOURNAMENTS_CONTRACT_ADDRESS,
        abi: TOURNAMENTS_ABI,
        functionName: "getPlayerTournamentResults",
        args: [BigInt(tournamentId), address],
      });

      const [participated, playerCarIds, , bestScore] = playerTournamentData;

      const hasCompleted = participated && Number(bestScore) > 0;

      console.log(
        `✅ Tournament ${tournamentId} completion check for player ${address}:`,
        {
          participated,
          bestScore: Number(bestScore),
          hasCompleted,
          carCount: playerCarIds.length,
        }
      );

      return hasCompleted;
    } catch (error) {
      console.error(
        `Error checking tournament ${tournamentId} completion:`,
        error
      );

      if (!selectedCarId) return false;

      try {
        console.log(
          `🔄 Using fallback completion check for tournament ${tournamentId}...`
        );

        const raceHistory = await readContract(config, {
          address: RACING_CONTRACT_ADDRESS,
          abi: LOCAL_TOURNAMENT_ABI,
          functionName: "getCarRaceHistory",
          args: [BigInt(selectedCarId)],
        });

        if (!raceHistory || raceHistory.length === 0) {
          return false;
        }

        const hasRacedInTournament = raceHistory.some(
          (race: any) => Number(race.tournamentId) === tournamentId
        );

        return hasRacedInTournament;
      } catch (fallbackError) {
        console.error(
          `Fallback completion check also failed for tournament ${tournamentId}:`,
          fallbackError
        );
        return false;
      }
    }
  };

  const checkIfUserJoined = async (tournamentId: number) => {
    if (!address) return false;

    try {
      const hasParticipated = await readContract(config, {
        address: TOURNAMENTS_CONTRACT_ADDRESS,
        abi: TOURNAMENTS_ABI,
        functionName: "hasPlayerParticipated",
        args: [BigInt(tournamentId), address],
      });

      console.log(`✅ Tournament ${tournamentId} participation check:`, {
        player: address,
        hasParticipated,
      });

      return hasParticipated;
    } catch (error) {
      console.error(
        `Error checking tournament ${tournamentId} participation:`,
        error
      );

      try {
        console.log(
          `🔄 Using fallback method for tournament ${tournamentId}...`
        );

        const participants = await readContract(config, {
          address: TOURNAMENTS_CONTRACT_ADDRESS,
          abi: TOURNAMENTS_ABI,
          functionName: "getTournamentParticipants",
          args: [BigInt(tournamentId)],
        });

        if (!participants || participants.length === 0) {
          return false;
        }

        const userCars = await readContract(config, {
          address: RACING_CONTRACT_ADDRESS,
          abi: LOCAL_TOURNAMENT_ABI,
          functionName: "getPlayerCars",
          args: [address],
        });

        if (!userCars || userCars.length === 0) {
          return false;
        }

        const userCarIds = userCars.map((carId) => Number(carId));
        const participantCarIds = participants.map((carId) => Number(carId));
        const hasJoined = userCarIds.some((userCarId) =>
          participantCarIds.includes(userCarId)
        );

        return hasJoined;
      } catch (fallbackError) {
        console.error(
          `Fallback method also failed for tournament ${tournamentId}:`,
          fallbackError
        );
        return false;
      }
    }
  };

  const { data: nextTournamentId, refetch: refetchTournamentCount } =
    useReadContract({
      address: TOURNAMENTS_CONTRACT_ADDRESS,
      abi: TOURNAMENTS_ABI,
      functionName: "nextTournamentId",
    });

  const loadTournaments = useCallback(async () => {
    if (!isConnected || !nextTournamentId) {
      setTournaments([]);
      return;
    }

    console.log("🚀 Starting tournament loading process...");
    setLoading(true);

    try {
      const loadedTournaments: Tournament[] = [];
      const now = Date.now();
      const joinedTournamentIds = new Set<number>();
      const completedTournamentIds = new Set<number>();

      console.log(
        "🏆 Loading tournaments, count:",
        Number(nextTournamentId || 0)
      );

      const tournamentCount = Number(nextTournamentId || 0);

      if (tournamentCount > 1) {
        console.log(
          `🔄 Found ${tournamentCount - 1} tournaments, loading in parallel...`
        );

        const tournamentIds = Array.from(
          { length: tournamentCount - 1 },
          (_, i) => i + 1
        );

        const tournamentPromises = tournamentIds.map(async (tournamentId) => {
          try {
            console.log(`📋 Loading tournament ${tournamentId}...`);

            const [tournamentDetails, userHasJoined, userHasCompleted] =
              await Promise.all([
                readContract(config, {
                  address: TOURNAMENTS_CONTRACT_ADDRESS,
                  abi: TOURNAMENTS_ABI,
                  functionName: "getTournamentDetails",
                  args: [BigInt(tournamentId)],
                }),
                checkIfUserJoined(tournamentId),
                checkIfUserCompletedTournament(tournamentId),
              ]);

            console.log(`Tournament ${tournamentId} loaded:`, {
              tournamentDetails,
              userHasJoined,
              userHasCompleted,
            });

            const [
              name,
              entryFee,
              prizePool,
              startTime,
              endTime,
              participantCount,
              finalized,
            ] = tournamentDetails;

            const startTimeMs = Number(startTime) * 1000;
            const endTimeMs = Number(endTime) * 1000;

            if (userHasJoined) {
              joinedTournamentIds.add(tournamentId);
            }
            if (userHasCompleted) {
              completedTournamentIds.add(tournamentId);
            }

            return {
              id: tournamentId,
              name: name || `🏆 Tournament #${tournamentId}`,
              entryFee: entryFee,
              prizePool: prizePool,
              startTime: startTimeMs,
              endTime: endTimeMs,
              participantCount: Number(participantCount),
              maxParticipants: 50,
              finalized: finalized,
            };
          } catch (error) {
            console.error(`Failed to load tournament ${tournamentId}:`, error);

            return {
              id: tournamentId,
              name: `🏆 Tournament #${tournamentId} (Loading...)`,
              entryFee: parseEther("0.01"),
              prizePool: parseEther("0.1"),
              startTime: now + 300000,
              endTime: now + 86400000,
              participantCount: 0,
              maxParticipants: 50,
              finalized: false,
            };
          }
        });

        const loadedTournamentResults = await Promise.all(tournamentPromises);
        loadedTournaments.push(...loadedTournamentResults);
      } else {
        console.log("📝 No tournaments created yet - showing demo");

        loadedTournaments.push({
          id: 0,
          name: "🎮 Demo Tournament (Create your own!)",
          entryFee: parseEther("0.001"),
          prizePool: parseEther("0.01"),
          startTime: now + 300000,
          endTime: now + 86400000,
          participantCount: 0,
          maxParticipants: 10,
          finalized: false,
        });
      }

      setJoinedTournaments(joinedTournamentIds);

      const allCompletedTournaments = new Set([
        ...completedTournamentIds,
        ...(completedTournamentsFromApp || []),
      ]);
      setCompletedTournaments(allCompletedTournaments);

      console.log(
        `✅ Successfully loaded ${loadedTournaments.length} tournaments`
      );
      setTournaments(loadedTournaments);
    } catch (error) {
      console.error("❌ Failed to load tournaments:", error);
      showToast("Failed to load tournaments. Please try refreshing.", "error");
      setTournaments([]);
    } finally {
      console.log("🏁 Tournament loading complete");
      setLoading(false);
    }
  }, [
    isConnected,
    nextTournamentId,
    address,
    selectedCarId,
    completedTournamentsFromApp,
  ]);

  useEffect(() => {
    loadTournaments();

    const interval = setInterval(loadTournaments, 60000);
    return () => clearInterval(interval);
  }, [loadTournaments]);

  const getCurrentTournamentStatus = (
    tournament: Tournament
  ): "upcoming" | "active" | "ended" => {
    const now = Date.now();
    return now < tournament.startTime
      ? "upcoming"
      : now <= tournament.endTime && !tournament.finalized
      ? "active"
      : "ended";
  };

  const [, forceUpdate] = useState({});

  useEffect(() => {
    const hasUpcomingTournaments = tournaments.some(
      (tournament) =>
        getCurrentTournamentStatus(tournament) === "upcoming" &&
        Date.now() < tournament.startTime &&
        tournament.startTime - Date.now() < 600000
    );

    if (hasUpcomingTournaments) {
      const quickInterval = setInterval(() => {
        forceUpdate({});
      }, 1000);

      return () => clearInterval(quickInterval);
    }
  }, [tournaments]);

  useEffect(() => {
    const checkAvailableCars = async () => {
      if (!isConnected || !address) {
        setAvailableCarId(null);
        setPlayerCars([]);
        setCarAvailabilityLoading(false);
        return;
      }

      setCarAvailabilityLoading(true);
      try {
        const cars = await readContract(config, {
          address: RACING_CONTRACT_ADDRESS,
          abi: RACING_ABI,
          functionName: "getPlayerCars",
          args: [address],
        });

        if (!cars || cars.length === 0) {
          setAvailableCarId(null);
          setPlayerCars([]);
          return;
        }

        const carsWithDetails = [];
        let firstAvailable = null;

        for (const carId of cars) {
          try {
            const carDetails = await readContract(config, {
              address: RACING_CONTRACT_ADDRESS,
              abi: RACING_ABI,
              functionName: "getCarDetails",
              args: [carId],
            });

            const carInfo = {
              id: Number(carId),
              name: carDetails.name,
              isStaked: carDetails.isStaked,
              available: !carDetails.isStaked,
            };

            carsWithDetails.push(carInfo);

            if (!carDetails.isStaked) {
              if (!firstAvailable) {
                firstAvailable = Number(carId);
              }

              if (selectedCarId && Number(carId) === selectedCarId) {
                firstAvailable = selectedCarId;
              }
            }
          } catch (error) {
            console.error(`Failed to check car ${carId} details:`, error);
          }
        }

        setPlayerCars(carsWithDetails);
        setAvailableCarId(firstAvailable);

        console.log("🚗 Car availability check:", {
          totalCars: cars.length,
          availableCars: carsWithDetails.filter((c) => c.available).length,
          selectedCarId,
          availableCarId: firstAvailable,
          cars: carsWithDetails,
        });
      } catch (error) {
        console.error("Failed to check car availability:", error);
        setAvailableCarId(null);
        setPlayerCars([]);
      } finally {
        setCarAvailabilityLoading(false);
      }
    };

    checkAvailableCars();
  }, [isConnected, address, selectedCarId]);

  const formatTimeRemaining = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return "Started";

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: "upcoming" | "active" | "ended") => {
    switch (status) {
      case "upcoming":
        return "bg-gradient-to-r from-yellow-500 to-orange-500";
      case "active":
        return "bg-gradient-to-r from-green-500 to-emerald-500";
      case "ended":
        return "bg-gradient-to-r from-gray-500 to-gray-600";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600";
    }
  };

  const getStatusIcon = (status: "upcoming" | "active" | "ended") => {
    switch (status) {
      case "upcoming":
        return "⏰";
      case "active":
        return "🔥";
      case "ended":
        return "🏁";
      default:
        return "⏳";
    }
  };

  // Tournament functions
  const createTournament = async () => {
    console.log("🏆 Create tournament clicked", {
      isConnected,
      address,
      selectedCarId,
    });

    if (!isConnected || !address) {
      showToast("Please connect your wallet to create a tournament", "warning");
      return;
    }

    if (!newTournament.name.trim()) {
      showToast("Please enter a tournament name", "warning");
      return;
    }

    try {
      setLoading(true);
      console.log("🚀 Creating tournament with data:", newTournament);

      const entryFeeWei = parseEther(newTournament.entryFee);
      const durationSeconds = BigInt(parseInt(newTournament.duration) * 3600); // Convert hours to seconds
      const initialPrizePool = parseEther(newTournament.prizePool);

      const minimumPrizePool = entryFeeWei * BigInt(5);
      if (initialPrizePool < minimumPrizePool) {
        showToast(
          `Prize pool must be at least ${formatEther(
            minimumPrizePool
          )} STT (5x entry fee)`,
          "warning"
        );
        return;
      }

      console.log("Creating tournament:", {
        name: newTournament.name,
        entryFee: entryFeeWei.toString(),
        duration: durationSeconds.toString(),
        maxParticipants: newTournament.maxParticipants,
        value: initialPrizePool.toString(),
      });

      console.log("💸 Calling writeContractAsync with args:", {
        address: RACING_CONTRACT_ADDRESS,
        functionName: "createTournament",
        args: [
          newTournament.name,
          entryFeeWei.toString(),
          durationSeconds.toString(),
          BigInt(newTournament.maxParticipants).toString(),
        ],
        value: initialPrizePool.toString(),
      });

      const txHash = await writeContractAsync({
        address: TOURNAMENTS_CONTRACT_ADDRESS,
        abi: TOURNAMENTS_ABI,
        functionName: "createTournament",
        args: [
          newTournament.name,
          entryFeeWei,
          durationSeconds,
          BigInt(newTournament.maxParticipants),
        ],
        value: initialPrizePool,
      });

      console.log("✅ Tournament creation transaction sent:", txHash);

      setNewTournament({
        name: "",
        entryFee: "0.01",
        duration: "24",
        maxParticipants: "50",
        prizePool: "0.1",
      });
      setShowCreateModal(false);

      await refetchTournamentCount();

      showToast(
        "🎉 Tournament created successfully! It will start in 5 minutes.",
        "success"
      );
    } catch (error: any) {
      console.error("❌ Failed to create tournament:", error);
      const errorMessage =
        error?.message || error?.reason || "Unknown error occurred";
      showToast(`❌ Failed to create tournament: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async (tournament: Tournament) => {
    if (!isConnected || !address || !availableCarId) {
      if (!availableCarId) {
        showToast(
          "No available cars for tournament. Please unstake a car first.",
          "warning"
        );
      }
      return;
    }

    try {
      setLoading(true);

      console.log("Joining tournament:", {
        tournamentId: tournament.id,
        carId: availableCarId,
        entryFee: tournament.entryFee.toString(),
        note: "Using available (unstaked) car",
      });

      const txHash = await writeContractAsync({
        address: TOURNAMENTS_CONTRACT_ADDRESS,
        abi: TOURNAMENTS_ABI,
        functionName: "enterTournament",
        args: [BigInt(tournament.id), BigInt(availableCarId)],
        value: tournament.entryFee,
      });

      console.log("Tournament join transaction sent:", txHash);

      setJoinedTournaments((prev) => new Set([...prev, tournament.id]));

      showToast(
        `Successfully joined ${tournament.name}! You can start racing when it becomes active.`,
        "success"
      );

      setTimeout(async () => {
        await refetchTournamentCount();
      }, 3000);
    } catch (error) {
      console.error("Failed to join tournament:", error);
      showToast("Failed to join tournament. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "20px",
          padding: "30px",
          maxWidth: "1200px",
          width: "95%",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "2px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                background: "linear-gradient(45deg, #ffd700, #ff6b6b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                margin: 0,
              }}
            >
              🏆 Tournament Lobby
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "16px",
                margin: "5px 0 0 0",
              }}
            >
              Compete against players worldwide for STT prizes
            </p>

            {isConnected && (
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  margin: "15px 0",
                  border: `1px solid ${
                    carAvailabilityLoading
                      ? "rgba(59, 130, 246, 0.3)"
                      : availableCarId
                      ? "rgba(16, 185, 129, 0.3)"
                      : "rgba(251, 191, 36, 0.3)"
                  }`,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "16px" }}>
                    {carAvailabilityLoading
                      ? "🔄"
                      : availableCarId
                      ? "🚗"
                      : "⚠️"}
                  </span>
                  <span
                    style={{
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {carAvailabilityLoading
                      ? "Checking car availability..."
                      : availableCarId
                      ? `Tournament Car: ${
                          playerCars.find((c) => c.id === availableCarId)
                            ?.name || `Car #${availableCarId}`
                        } (Available)`
                      : playerCars.length === 0
                      ? "No cars available - mint a car first"
                      : `${playerCars.length} car(s) staked - unstake to join tournaments`}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "15px" }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: "linear-gradient(45deg, #0891b2, #06b6d4)",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(139,92,246,0.4)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 25px rgba(139,92,246,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 15px rgba(139,92,246,0.4)";
              }}
            >
              ➕ Create Tournament
            </button>
            <button
              onClick={async () => {
                console.log("🔄 Manual refresh triggered");
                console.log(
                  "Tournament count from contract:",
                  Number(nextTournamentId || 0)
                );
                await refetchTournamentCount();
                await loadTournaments();
              }}
              disabled={loading}
              style={{
                background: loading
                  ? "#6b7280"
                  : "linear-gradient(45deg, #6366f1, #06d6a0)",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: loading ? "none" : "0 4px 15px rgba(16,185,129,0.4)",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <span
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTop: "2px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                  Refreshing...
                </span>
              ) : (
                "🔄 Refresh Tournaments"
              )}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "white",
                border: "2px solid rgba(255,255,255,0.3)",
                padding: "12px 24px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {!isConnected ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "rgba(239,68,68,0.1)",
              borderRadius: "15px",
              border: "2px solid rgba(239,68,68,0.3)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>🔗</div>
            <p
              style={{ color: "#ef4444", fontSize: "18px", fontWeight: "bold" }}
            >
              Connect your wallet to join tournaments
            </p>
          </div>
        ) : carAvailabilityLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "rgba(59, 130, 246, 0.1)",
              borderRadius: "15px",
              border: "2px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                marginBottom: "20px",
                opacity: "0.8",
                transform: "scale(1.1)",
                animation: "pulse 1.5s ease-in-out infinite alternate",
              }}
            >
              🔄
            </div>
            <style>{`
              @keyframes pulse {
                0% { opacity: 0.6; transform: scale(1); }
                100% { opacity: 1; transform: scale(1.1); }
              }
            `}</style>
            <p
              style={{ color: "#3b82f6", fontSize: "18px", fontWeight: "bold" }}
            >
              Loading tournament lobby...
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "14px",
                marginTop: "10px",
              }}
            >
              Checking your car availability and tournament status
            </p>
          </div>
        ) : !availableCarId ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "rgba(251,191,36,0.1)",
              borderRadius: "15px",
              border: "2px solid rgba(251,191,36,0.3)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>🚗</div>
            <p
              style={{
                color: "#fbbf24",
                fontSize: "18px",
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            >
              {playerCars.length === 0
                ? "You need a racing car to join tournaments"
                : "All your cars are staked and unavailable for tournaments"}
            </p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
              {playerCars.length === 0
                ? "Go back to main menu and mint a car first"
                : `You have ${playerCars.length} car(s), but they're all staked. Please unstake a car from your garage to join tournaments.`}
            </p>
          </div>
        ) : (
          <>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {tournaments
                .slice()
                .sort((a, b) => {
                  const aStatus = getCurrentTournamentStatus(a);
                  const bStatus = getCurrentTournamentStatus(b);

                  const aJoinedNotCompleted =
                    joinedTournaments.has(a.id) &&
                    !completedTournaments.has(a.id);
                  const bJoinedNotCompleted =
                    joinedTournaments.has(b.id) &&
                    !completedTournaments.has(b.id);

                  const aCompleted = completedTournaments.has(a.id);
                  const bCompleted = completedTournaments.has(b.id);

                  if (aJoinedNotCompleted && !bJoinedNotCompleted) return -1;
                  if (bJoinedNotCompleted && !aJoinedNotCompleted) return 1;

                  if (aJoinedNotCompleted && bJoinedNotCompleted) {
                    if (aStatus === "active" && bStatus === "active") {
                      return a.endTime - b.endTime;
                    }
                    if (aStatus === "active" && bStatus !== "active") return -1;
                    if (bStatus === "active" && aStatus !== "active") return 1;
                    return a.startTime - b.startTime;
                  }

                  if (aStatus === "active" && bStatus !== "active") return -1;
                  if (bStatus === "active" && aStatus !== "active") return 1;

                  if (aStatus === "upcoming" && bStatus === "ended") return -1;
                  if (bStatus === "upcoming" && aStatus === "ended") return 1;

                  if (
                    aCompleted &&
                    !bCompleted &&
                    aStatus === "ended" &&
                    bStatus === "ended"
                  )
                    return -1;
                  if (
                    bCompleted &&
                    !aCompleted &&
                    aStatus === "ended" &&
                    bStatus === "ended"
                  )
                    return 1;

                  if (aCompleted && bCompleted) {
                    return b.endTime - a.endTime;
                  }

                  if (aStatus === "active" && bStatus === "active") {
                    return a.endTime - b.endTime;
                  }

                  if (aStatus === "upcoming" && bStatus === "upcoming") {
                    return a.startTime - b.startTime;
                  }

                  return 0;
                })
                .map((tournament) => (
                  <div
                    key={tournament.id}
                    style={{
                      background: completedTournaments.has(tournament.id)
                        ? "rgba(107, 114, 128, 0.1)"
                        : joinedTournaments.has(tournament.id) &&
                          !completedTournaments.has(tournament.id)
                        ? "rgba(16, 185, 129, 0.08)"
                        : "rgba(255,255,255,0.05)",
                      border: completedTournaments.has(tournament.id)
                        ? "2px solid rgba(107, 114, 128, 0.4)"
                        : joinedTournaments.has(tournament.id) &&
                          !completedTournaments.has(tournament.id)
                        ? "2px solid rgba(16, 185, 129, 0.4)"
                        : "2px solid rgba(255,255,255,0.1)",
                      borderRadius: "20px",
                      padding: "25px",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      position: "relative",
                      opacity: completedTournaments.has(tournament.id)
                        ? 0.7
                        : 1,
                    }}
                    onMouseEnter={(e) => {
                      const isCompleted = completedTournaments.has(
                        tournament.id
                      );
                      const isJoinedNotCompleted =
                        joinedTournaments.has(tournament.id) &&
                        !completedTournaments.has(tournament.id);

                      if (isCompleted) {
                        e.currentTarget.style.border =
                          "2px solid rgba(107, 114, 128, 0.6)";
                        e.currentTarget.style.boxShadow =
                          "0 10px 30px rgba(107, 114, 128, 0.2)";
                      } else if (isJoinedNotCompleted) {
                        e.currentTarget.style.border =
                          "2px solid rgba(16, 185, 129, 0.6)";
                        e.currentTarget.style.boxShadow =
                          "0 10px 30px rgba(16, 185, 129, 0.2)";
                      } else {
                        e.currentTarget.style.border =
                          "2px solid rgba(255,255,255,0.3)";
                        e.currentTarget.style.boxShadow =
                          "0 10px 30px rgba(0,0,0,0.3)";
                      }
                      e.currentTarget.style.transform = "translateY(-5px)";
                    }}
                    onMouseLeave={(e) => {
                      const isCompleted = completedTournaments.has(
                        tournament.id
                      );
                      const isJoinedNotCompleted =
                        joinedTournaments.has(tournament.id) &&
                        !completedTournaments.has(tournament.id);

                      if (isCompleted) {
                        e.currentTarget.style.border =
                          "2px solid rgba(107, 114, 128, 0.4)";
                      } else if (isJoinedNotCompleted) {
                        e.currentTarget.style.border =
                          "2px solid rgba(16, 185, 129, 0.4)";
                      } else {
                        e.currentTarget.style.border =
                          "2px solid rgba(255,255,255,0.1)";
                      }
                      e.currentTarget.style.transform = "translateY(0px)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "20px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "10px",
                          }}
                        >
                          <h3
                            style={{
                              fontSize: "24px",
                              fontWeight: "bold",
                              color: "white",
                              margin: 0,
                            }}
                          >
                            {tournament.name}
                          </h3>
                          {completedTournaments.has(tournament.id) ? (
                            <div
                              style={{
                                background:
                                  "linear-gradient(45deg, #6b7280, #4b5563)",
                                color: "white",
                                padding: "4px 12px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "bold",
                                boxShadow: "0 2px 8px rgba(107, 114, 128, 0.3)",
                              }}
                            >
                              ✅ COMPLETED
                            </div>
                          ) : (
                            joinedTournaments.has(tournament.id) &&
                            !completedTournaments.has(tournament.id) && (
                              <div
                                style={{
                                  background:
                                    "linear-gradient(45deg, #6366f1, #059669)",
                                  color: "white",
                                  padding: "4px 12px",
                                  borderRadius: "20px",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  boxShadow:
                                    "0 2px 8px rgba(16, 185, 129, 0.3)",
                                  animation: "pulse 2s infinite",
                                }}
                              >
                                🏁 READY TO RACE
                              </div>
                            )
                          )}
                        </div>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 16px",
                            borderRadius: "25px",
                            fontSize: "14px",
                            fontWeight: "bold",
                            color: "white",
                          }}
                          className={getStatusColor(
                            getCurrentTournamentStatus(tournament)
                          )}
                        >
                          <span>
                            {getStatusIcon(
                              getCurrentTournamentStatus(tournament)
                            )}
                          </span>
                          {getCurrentTournamentStatus(tournament)
                            .charAt(0)
                            .toUpperCase() +
                            getCurrentTournamentStatus(tournament).slice(1)}
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        <div style={{ fontSize: "12px" }}>
                          Tournament #{tournament.id}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "20px",
                        marginBottom: "25px",
                      }}
                    >
                      <div
                        style={{
                          background: "rgba(59,130,246,0.1)",
                          padding: "15px",
                          borderRadius: "12px",
                          border: "1px solid rgba(59,130,246,0.3)",
                        }}
                      >
                        <div
                          style={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "12px",
                            marginBottom: "5px",
                          }}
                        >
                          Entry Fee
                        </div>
                        <div
                          style={{
                            color: "#3b82f6",
                            fontSize: "18px",
                            fontWeight: "bold",
                          }}
                        >
                          {formatEther(tournament.entryFee)} STT
                        </div>
                      </div>

                      <div
                        style={{
                          background: "rgba(16,185,129,0.1)",
                          padding: "15px",
                          borderRadius: "12px",
                          border: "1px solid rgba(16,185,129,0.3)",
                        }}
                      >
                        <div
                          style={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "12px",
                            marginBottom: "5px",
                          }}
                        >
                          Prize Pool
                        </div>
                        <div
                          style={{
                            color: "#6366f1",
                            fontSize: "18px",
                            fontWeight: "bold",
                          }}
                        >
                          {formatEther(tournament.prizePool)} STT
                        </div>
                      </div>

                      <div
                        style={{
                          background: "rgba(139,92,246,0.1)",
                          padding: "15px",
                          borderRadius: "12px",
                          border: "1px solid rgba(139,92,246,0.3)",
                        }}
                      >
                        <div
                          style={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "12px",
                            marginBottom: "5px",
                          }}
                        >
                          Participants
                        </div>
                        <div
                          style={{
                            color: "#0891b2",
                            fontSize: "18px",
                            fontWeight: "bold",
                          }}
                        >
                          {tournament.participantCount}/
                          {tournament.maxParticipants}
                        </div>
                      </div>

                      <div
                        style={{
                          background: "rgba(251,191,36,0.1)",
                          padding: "15px",
                          borderRadius: "12px",
                          border: "1px solid rgba(251,191,36,0.3)",
                        }}
                      >
                        <div
                          style={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "12px",
                            marginBottom: "5px",
                          }}
                        >
                          {getCurrentTournamentStatus(tournament) === "upcoming"
                            ? "Starts In"
                            : getCurrentTournamentStatus(tournament) ===
                              "active"
                            ? "Ends In"
                            : "Ended"}
                        </div>
                        <div
                          style={{
                            color: "#fbbf24",
                            fontSize: "18px",
                            fontWeight: "bold",
                          }}
                        >
                          {getCurrentTournamentStatus(tournament) === "upcoming"
                            ? formatTimeRemaining(tournament.startTime)
                            : getCurrentTournamentStatus(tournament) ===
                              "active"
                            ? formatTimeRemaining(tournament.endTime)
                            : "Finished"}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "rgba(255,255,255,0.6)",
                          fontSize: "14px",
                          background: "rgba(255,255,255,0.05)",
                          padding: "8px 15px",
                          borderRadius: "20px",
                        }}
                      >
                        🏆 Prize Distribution: 🥇 50% • 🥈 30% • 🥉 20%
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        {getCurrentTournamentStatus(tournament) ===
                          "upcoming" && (
                          <>
                            {!joinedTournaments.has(tournament.id) ? (
                              <button
                                onClick={() => joinTournament(tournament)}
                                disabled={
                                  loading ||
                                  tournament.participantCount >=
                                    tournament.maxParticipants ||
                                  Date.now() < tournament.startTime
                                }
                                style={{
                                  background:
                                    tournament.participantCount >=
                                      tournament.maxParticipants ||
                                    Date.now() < tournament.startTime
                                      ? "rgba(107,114,128,0.5)"
                                      : "linear-gradient(45deg, #3b82f6, #06b6d4)",
                                  color: "white",
                                  border: "none",
                                  padding: "12px 24px",
                                  borderRadius: "12px",
                                  fontSize: "16px",
                                  fontWeight: "bold",
                                  cursor:
                                    tournament.participantCount >=
                                      tournament.maxParticipants ||
                                    Date.now() < tournament.startTime
                                      ? "not-allowed"
                                      : "pointer",
                                  transition: "all 0.3s ease",
                                  opacity:
                                    tournament.participantCount >=
                                      tournament.maxParticipants ||
                                    Date.now() < tournament.startTime
                                      ? 0.5
                                      : 1,
                                }}
                                onMouseEnter={(e) => {
                                  if (
                                    tournament.participantCount <
                                      tournament.maxParticipants &&
                                    Date.now() >= tournament.startTime
                                  ) {
                                    e.currentTarget.style.transform =
                                      "translateY(-2px)";
                                    e.currentTarget.style.boxShadow =
                                      "0 8px 25px rgba(59,130,246,0.6)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (
                                    tournament.participantCount <
                                      tournament.maxParticipants &&
                                    Date.now() >= tournament.startTime
                                  ) {
                                    e.currentTarget.style.transform =
                                      "translateY(0px)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }
                                }}
                              >
                                {tournament.participantCount >=
                                tournament.maxParticipants
                                  ? "🔒 Full"
                                  : Date.now() < tournament.startTime
                                  ? "⏰ Starting Soon..."
                                  : "💰 Join Now (Pay Entry Fee)"}
                              </button>
                            ) : (
                              <button
                                disabled
                                style={{
                                  background: "rgba(16,185,129,0.2)",
                                  color: "#6366f1",
                                  border: "2px solid #6366f1",
                                  padding: "12px 24px",
                                  borderRadius: "12px",
                                  fontSize: "16px",
                                  fontWeight: "bold",
                                  cursor: "not-allowed",
                                  transition: "all 0.3s ease",
                                }}
                              >
                                ✅ Joined - Wait for Tournament Start
                              </button>
                            )}
                          </>
                        )}
                        {getCurrentTournamentStatus(tournament) ===
                          "active" && (
                          <>
                            {completedTournaments.has(tournament.id) ? (
                              <button
                                disabled
                                style={{
                                  background: "rgba(16,185,129,0.2)",
                                  color: "#6366f1",
                                  border: "2px solid #6366f1",
                                  padding: "12px 24px",
                                  borderRadius: "12px",
                                  fontSize: "16px",
                                  fontWeight: "bold",
                                  cursor: "not-allowed",
                                  transition: "all 0.3s ease",
                                }}
                              >
                                ✅ Tournament Completed - Cannot Race Again
                              </button>
                            ) : joinedTournaments.has(tournament.id) ? (
                              <button
                                onClick={() => onStartRace(tournament.id)}
                                style={{
                                  background:
                                    "linear-gradient(45deg, #6366f1, #059669)",
                                  color: "white",
                                  border: "none",
                                  padding: "12px 24px",
                                  borderRadius: "12px",
                                  fontSize: "16px",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                  transition: "all 0.3s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(-2px)";
                                  e.currentTarget.style.boxShadow =
                                    "0 8px 25px rgba(16,185,129,0.6)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(0px)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                🏁 Race Now!
                              </button>
                            ) : (
                              <button
                                onClick={() => joinTournament(tournament)}
                                disabled={
                                  loading ||
                                  tournament.participantCount >=
                                    tournament.maxParticipants ||
                                  Date.now() < tournament.startTime
                                }
                                style={{
                                  background:
                                    tournament.participantCount >=
                                      tournament.maxParticipants ||
                                    Date.now() < tournament.startTime
                                      ? "rgba(107,114,128,0.5)"
                                      : "linear-gradient(45deg, #3b82f6, #06b6d4)",
                                  color: "white",
                                  border: "none",
                                  padding: "12px 24px",
                                  borderRadius: "12px",
                                  fontSize: "16px",
                                  fontWeight: "bold",
                                  cursor:
                                    tournament.participantCount >=
                                      tournament.maxParticipants ||
                                    Date.now() < tournament.startTime
                                      ? "not-allowed"
                                      : "pointer",
                                  transition: "all 0.3s ease",
                                  opacity:
                                    tournament.participantCount >=
                                      tournament.maxParticipants ||
                                    Date.now() < tournament.startTime
                                      ? 0.5
                                      : 1,
                                }}
                                onMouseEnter={(e) => {
                                  if (
                                    tournament.participantCount <
                                      tournament.maxParticipants &&
                                    Date.now() >= tournament.startTime
                                  ) {
                                    e.currentTarget.style.transform =
                                      "translateY(-2px)";
                                    e.currentTarget.style.boxShadow =
                                      "0 8px 25px rgba(59,130,246,0.6)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (
                                    tournament.participantCount <
                                      tournament.maxParticipants &&
                                    Date.now() >= tournament.startTime
                                  ) {
                                    e.currentTarget.style.transform =
                                      "translateY(0px)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }
                                }}
                              >
                                {tournament.participantCount >=
                                tournament.maxParticipants
                                  ? "🔒 Full"
                                  : Date.now() < tournament.startTime
                                  ? "⏰ Starting Soon..."
                                  : "💰 Join & Race (Pay Entry Fee)"}
                              </button>
                            )}
                          </>
                        )}
                        {getCurrentTournamentStatus(tournament) === "ended" && (
                          <button
                            onClick={() => loadTournamentResults(tournament)}
                            style={{
                              background: tournament.finalized
                                ? "linear-gradient(45deg, #0891b2, #06b6d4)"
                                : "rgba(107,114,128,0.5)",
                              color: "white",
                              border: "none",
                              padding: "12px 24px",
                              borderRadius: "12px",
                              fontSize: "16px",
                              fontWeight: "bold",
                              cursor: tournament.finalized
                                ? "pointer"
                                : "not-allowed",
                              transition: "all 0.3s ease",
                              opacity: tournament.finalized ? 1 : 0.6,
                            }}
                            onMouseEnter={(e) => {
                              if (tournament.finalized) {
                                e.currentTarget.style.transform =
                                  "translateY(-2px)";
                                e.currentTarget.style.boxShadow =
                                  "0 8px 25px rgba(139,92,246,0.6)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (tournament.finalized) {
                                e.currentTarget.style.transform =
                                  "translateY(0px)";
                                e.currentTarget.style.boxShadow = "none";
                              }
                            }}
                          >
                            {tournament.finalized
                              ? "🏆 View Results"
                              : "⏳ Finalizing..."}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {loading && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  background: "rgba(59,130,246,0.1)",
                  borderRadius: "20px",
                  border: "2px solid rgba(59,130,246,0.3)",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "20px" }}>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      border: "4px solid rgba(59,130,246,0.3)",
                      borderTop: "4px solid #3b82f6",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      margin: "0 auto 20px auto",
                    }}
                  ></div>
                </div>
                <p
                  style={{
                    color: "#3b82f6",
                    fontSize: "24px",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                >
                  Loading tournaments...
                </p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "16px" }}>
                  Fetching tournament data from blockchain
                </p>
              </div>
            )}

            {!loading && tournaments.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  background: "rgba(59,130,246,0.1)",
                  borderRadius: "20px",
                  border: "2px solid rgba(59,130,246,0.3)",
                }}
              >
                <div style={{ fontSize: "64px", marginBottom: "20px" }}>🏆</div>
                <p
                  style={{
                    color: "#3b82f6",
                    fontSize: "24px",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                >
                  No tournaments available
                </p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "16px" }}>
                  Be the first to create one and start the competition!
                </p>
              </div>
            )}
          </>
        )}

        {showCreateModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 60,
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                borderRadius: "20px",
                padding: "30px",
                maxWidth: "500px",
                width: "90%",
                border: "2px solid rgba(255,255,255,0.1)",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              }}
            >
              <h3
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: "20px",
                  textAlign: "center",
                }}
              >
                🏆 Create New Tournament
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "14px",
                      marginBottom: "8px",
                      fontWeight: "bold",
                    }}
                  >
                    🏷️ Tournament Name
                  </label>
                  <input
                    type="text"
                    value={newTournament.name}
                    onChange={(e) =>
                      setNewTournament((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.1)",
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      color: "white",
                      fontSize: "16px",
                      outline: "none",
                      transition: "all 0.3s ease",
                    }}
                    placeholder="Epic Racing Championship"
                    onFocus={(e) => {
                      e.currentTarget.style.border = "2px solid #3b82f6";
                      e.currentTarget.style.background = "rgba(59,130,246,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.border =
                        "2px solid rgba(255,255,255,0.2)";
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.1)";
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "15px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "14px",
                        marginBottom: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      💰 Entry Fee (STT)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={newTournament.entryFee}
                      onChange={(e) =>
                        setNewTournament((prev) => ({
                          ...prev,
                          entryFee: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.1)",
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        color: "white",
                        fontSize: "16px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "14px",
                        marginBottom: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      ⏰ Duration (hours)
                    </label>
                    <input
                      type="number"
                      value={newTournament.duration}
                      onChange={(e) =>
                        setNewTournament((prev) => ({
                          ...prev,
                          duration: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.1)",
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        color: "white",
                        fontSize: "16px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "15px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "14px",
                        marginBottom: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      👥 Max Participants
                    </label>
                    <input
                      type="number"
                      value={newTournament.maxParticipants}
                      onChange={(e) =>
                        setNewTournament((prev) => ({
                          ...prev,
                          maxParticipants: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.1)",
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        color: "white",
                        fontSize: "16px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "14px",
                        marginBottom: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      🏆 Prize Pool (STT)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTournament.prizePool}
                      onChange={(e) =>
                        setNewTournament((prev) => ({
                          ...prev,
                          prizePool: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.1)",
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderRadius: "12px",
                        padding: "12px 16px",
                        color: "white",
                        fontSize: "16px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "30px",
                  gap: "15px",
                }}
              >
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "2px solid rgba(255,255,255,0.3)",
                    color: "white",
                    padding: "12px 24px",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createTournament}
                  disabled={loading || !newTournament.name.trim()}
                  style={{
                    background:
                      loading || !newTournament.name.trim()
                        ? "rgba(107,114,128,0.5)"
                        : "linear-gradient(45deg, #0891b2, #06b6d4)",
                    border: "none",
                    color: "white",
                    padding: "12px 24px",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor:
                      loading || !newTournament.name.trim()
                        ? "not-allowed"
                        : "pointer",
                    flex: 1,
                    opacity: loading || !newTournament.name.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? "⏳ Creating..." : "🚀 Create Tournament"}
                </button>
              </div>
            </div>
          </div>
        )}

        <TournamentResultsModal
          tournament={selectedTournamentResults}
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false);
            setSelectedTournamentResults(undefined as any);
          }}
          userAddress={address}
          selectedCarId={availableCarId || undefined}
        />
      </div>

      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxWidth: "400px",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background:
                toast.type === "success"
                  ? "linear-gradient(45deg, #6366f1, #059669)"
                  : toast.type === "error"
                  ? "linear-gradient(45deg, #ef4444, #dc2626)"
                  : toast.type === "warning"
                  ? "linear-gradient(45deg, #6366f1, #d97706)"
                  : "linear-gradient(45deg, #3b82f6, #2563eb)",
              color: "white",
              padding: "16px 20px",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "14px",
              fontWeight: "500",
              animation: "slideInRight 0.3s ease-out",
              cursor: "pointer",
            }}
            onClick={() => removeToast(toast.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>
                {toast.type === "success"
                  ? "✅"
                  : toast.type === "error"
                  ? "❌"
                  : toast.type === "warning"
                  ? "⚠️"
                  : "ℹ️"}
              </span>
              <span>{toast.message}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "white",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                opacity: 0.7,
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.5);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default TournamentLobby;
