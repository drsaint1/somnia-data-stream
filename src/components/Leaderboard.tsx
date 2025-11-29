import React, { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { readContract } from "wagmi/actions";
import { config } from "../config/web3Config";
import {
  RACING_CONTRACT_ADDRESS,
  RACING_ABI,
} from "../hooks/useRacingContract";
import { useLiveLeaderboard } from "../hooks/useDataStreams";

interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName: string;
  bestScore: number;
  level: number;
  totalXP: number;
  totalTokensEarned: number;
  isCurrentPlayer?: boolean;
}

interface LeaderboardProps {
  onClose: () => void;
}

type SortBy = "score" | "level" | "tokens";

const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [loading, setLoading] = useState(true);
  const [currentPlayerRank, setCurrentPlayerRank] = useState<number | null>(
    null
  );
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { leaderboard: liveLeaderboardData } = useLiveLeaderboard();
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);

  // Track live updates from Data Streams
  useEffect(() => {
    if (liveLeaderboardData && liveLeaderboardData.length > 0) {
      setLiveUpdateCount((prev) => prev + 1);
      console.log("📊 Live leaderboard update received via Data Streams");
    }
  }, [liveLeaderboardData]);

  const { data: currentPlayerStats } = useReadContract({
    address: RACING_CONTRACT_ADDRESS,
    abi: RACING_ABI,
    functionName: "getPlayerStats",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    const buildContractBasedLeaderboard = async () => {
      setLoading(true);

      try {
        const leaderboardData = await readContract(config, {
          address: RACING_CONTRACT_ADDRESS,
          abi: RACING_ABI,
          functionName: "getLeaderboard",
          args: [100n],
        });

        const [players, scores, levels, totalXPs, carCounts] = leaderboardData;

        if (players.length === 0) {
          setLeaderboard([]);
          setCurrentPlayerRank(null);
          setLastRefresh(new Date());
          setLoading(false);
          return;
        }

        const leaderboardEntries: LeaderboardEntry[] = players.map(
          (playerAddress, index) => {
            const isCurrentPlayer =
              address && playerAddress.toLowerCase() === address.toLowerCase();

            const bestScore = Number(scores[index]);

            console.log(
              `👤 Player ${
                index + 1
              }: ${playerAddress} - Score: ${bestScore}, Level: ${Number(
                levels[index]
              )}, XP: ${Number(totalXPs[index])}, Cars: ${Number(
                carCounts[index]
              )}`
            );

            return {
              rank: index + 1,
              address: playerAddress,
              displayName: isCurrentPlayer
                ? `${playerAddress.slice(0, 6)}... (You)`
                : `${playerAddress.slice(0, 6)}...`,
              bestScore,
              level: Number(levels[index]),
              totalXP: Number(totalXPs[index]),
              totalTokensEarned: 0,
              isCurrentPlayer: !!isCurrentPlayer,
            };
          }
        );

        const leaderboardWithTokens: LeaderboardEntry[] = await Promise.all(
          leaderboardEntries.map(async (entry) => {
            try {
              const tokenBalance = await readContract(config, {
                address: RACING_CONTRACT_ADDRESS,
                abi: RACING_ABI,
                functionName: "getTokenBalance",
                args: [entry.address as `0x${string}`],
              });
              const earnedTokens = Number(tokenBalance) / 1e18;

              return {
                ...entry,
                totalTokensEarned: earnedTokens,
              };
            } catch (error) {
              console.warn(
                `Failed to fetch earned tokens for ${entry.address}:`,
                error
              );
              return entry;
            }
          })
        );

        leaderboardWithTokens.sort((a, b) => {
          switch (sortBy) {
            case "score":
              return b.bestScore - a.bestScore;
            case "level":
              return b.level - a.level;
            case "tokens":
              return b.totalTokensEarned - a.totalTokensEarned;
            default:
              return b.bestScore - a.bestScore;
          }
        });

        leaderboardEntries.forEach((player, index) => {
          player.rank = index + 1;
        });

        const currentPlayerEntry = leaderboardEntries.find(
          (p) => p.isCurrentPlayer
        );
        if (currentPlayerEntry) {
          setCurrentPlayerRank(currentPlayerEntry.rank);
        } else {
          setCurrentPlayerRank(null);
        }

        setLeaderboard(leaderboardWithTokens);
        setLastRefresh(new Date());
      } catch (error) {
        console.error("❌ Failed to build contract-based leaderboard:", error);

        if (address && currentPlayerStats) {
          const [level, totalXP] = currentPlayerStats;

          const bestScore = 0;

          let earnedTokens = 0;
          try {
            const tokenBalance = await readContract(config, {
              address: RACING_CONTRACT_ADDRESS,
              abi: RACING_ABI,
              functionName: "getTokenBalance",
              args: [address],
            });
            earnedTokens = Number(tokenBalance) / 1e18;
          } catch (tokenError) {
            console.warn(
              "Failed to fetch current player's earned tokens:",
              tokenError
            );
          }

          const fallbackPlayer: LeaderboardEntry = {
            rank: 1,
            address: address,
            displayName: `${address.slice(0, 6)}... (You)`,
            bestScore,
            level: Number(level),
            totalXP: Number(totalXP),
            totalTokensEarned: earnedTokens,
            isCurrentPlayer: true,
          };

          setLeaderboard([fallbackPlayer]);
          setCurrentPlayerRank(1);
          console.log(
            "🔄 Showing fallback leaderboard with current player only"
          );
        } else {
          setLeaderboard([]);
          setCurrentPlayerRank(null);
        }
      } finally {
        setLoading(false);
      }
    };

    buildContractBasedLeaderboard();
  }, [address, currentPlayerStats, sortBy]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        console.log("🔄 Auto-refreshing leaderboard...");
        setLastRefresh(new Date());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading]);

  const handleRefresh = () => {
    setLoading(true);
    setLastRefresh(new Date());
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "#fbbf24";
      case 2:
        return "#d1d5db";
      case 3:
        return "#d97706";
      default:
        return "#ffffff";
    }
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toLocaleString();
  };

  const sortLabels = {
    score: "Best Score",
    level: "Level",
    tokens: "Tokens Earned",
  };

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        <div
          style={{
            background: "#111827", // bg-gray-900
            borderRadius: "8px",
            padding: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid transparent",
                borderTop: "2px solid #fbbf24",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <span style={{ color: "white" }}>Loading leaderboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "#111827",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "1280px",
          width: "100%",
          margin: "0 16px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "30px",
                fontWeight: "bold",
                color: "white",
                display: "flex",
                alignItems: "center",
                margin: 0,
                gap: "12px",
              }}
            >
              🏆 Global Leaderboard
              {liveUpdateCount > 0 && (
                <span
                  style={{
                    fontSize: "12px",
                    padding: "4px 12px",
                    background: "linear-gradient(90deg, #10b981, #059669)",
                    borderRadius: "12px",
                    fontWeight: "normal",
                    animation: "pulse 2s infinite",
                  }}
                >
                  🔴 LIVE via Data Streams
                </span>
              )}
            </h2>
            {address && currentPlayerRank && (
              <p
                style={{
                  fontSize: "14px",
                  color: "#fbbf24",
                  marginTop: "4px",
                  margin: "4px 0 0 0",
                }}
              >
                Your current rank: #{currentPlayerRank}
              </p>
            )}
            {address && !currentPlayerRank && (
              <p
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                  marginTop: "4px",
                  margin: "4px 0 0 0",
                }}
              >
                🎮 Start playing to appear on the leaderboard!
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={handleRefresh}
              disabled={loading}
              style={{
                background: loading ? "#6b7280" : "#10b981",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "#059669";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "#10b981";
                }
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid transparent",
                      borderTop: "2px solid #fff",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                  Refreshing...
                </>
              ) : (
                <>🔄 Refresh</>
              )}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "#4b5563",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#374151";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#4b5563";
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <span
              style={{
                color: "#9ca3af",
                fontSize: "14px",
                alignSelf: "center",
              }}
            >
              Sort by:
            </span>
            {(Object.keys(sortLabels) as SortBy[]).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  background: sortBy === sort ? "#8b5cf6" : "#374151",
                  color: sortBy === sort ? "white" : "#d1d5db",
                }}
                onMouseEnter={(e) => {
                  if (sortBy !== sort) {
                    e.currentTarget.style.background = "#4b5563";
                  }
                }}
                onMouseLeave={(e) => {
                  if (sortBy !== sort) {
                    e.currentTarget.style.background = "#374151";
                  }
                }}
              >
                {sortLabels[sort]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", textAlign: "left" }}>
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#1e293b",
                }}
              >
                <tr
                  style={{
                    borderBottom: "1px solid #374151",
                  }}
                >
                  <th
                    style={{
                      paddingBottom: "12px",
                      color: "#9ca3af",
                      fontWeight: "600",
                    }}
                  >
                    Rank
                  </th>
                  <th
                    style={{
                      paddingBottom: "12px",
                      color: "#9ca3af",
                      fontWeight: "600",
                    }}
                  >
                    Player
                  </th>
                  <th
                    style={{
                      paddingBottom: "12px",
                      color: "#9ca3af",
                      fontWeight: "600",
                    }}
                  >
                    Level
                  </th>
                  <th
                    style={{
                      paddingBottom: "12px",
                      color: "#9ca3af",
                      fontWeight: "600",
                    }}
                  >
                    Best Score
                  </th>
                  <th
                    style={{
                      paddingBottom: "12px",
                      color: "#9ca3af",
                      fontWeight: "600",
                    }}
                  >
                    Total XP
                  </th>
                  <th
                    style={{
                      paddingBottom: "12px",
                      color: "#9ca3af",
                      fontWeight: "600",
                    }}
                  >
                    Tokens Earned
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr
                    key={`${entry.address}-${index}`}
                    style={{
                      borderBottom: "1px solid #1e293b",
                      background: entry.isCurrentPlayer
                        ? "rgba(59,130,246,0.3)"
                        : "transparent",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = entry.isCurrentPlayer
                        ? "rgba(59,130,246,0.4)"
                        : "#1e293b";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = entry.isCurrentPlayer
                        ? "rgba(59,130,246,0.3)"
                        : "transparent";
                    }}
                  >
                    <td style={{ padding: "12px 0" }}>
                      <span
                        style={{
                          fontWeight: "bold",
                          fontSize: "18px",
                          color: getRankColor(entry.rank),
                        }}
                      >
                        {getRankIcon(entry.rank)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 0" }}>
                      <div>
                        <div
                          style={{
                            fontWeight: "600",
                            color: entry.isCurrentPlayer ? "#60a5fa" : "white",
                          }}
                        >
                          {entry.displayName}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            fontFamily: "monospace",
                          }}
                        >
                          {entry.address.slice(0, 10)}...
                          {entry.address.slice(-4)}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 0" }}>
                      <div
                        style={{
                          color: "white",
                          fontWeight: "bold",
                          fontSize: "18px",
                        }}
                      >
                        {entry.level}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px 0",
                        color: "#34d399",
                        fontWeight: "bold",
                        fontSize: "18px",
                      }}
                    >
                      {entry.bestScore.toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 0" }}>
                      <div
                        style={{
                          color: "#a78bfa",
                          fontWeight: "500",
                        }}
                      >
                        {entry.totalXP.toLocaleString()}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px 0",
                        color: "#fbbf24",
                        fontWeight: "bold",
                      }}
                    >
                      {formatTokens(entry.totalTokensEarned)} FAST
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #374151",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "16px",
              textAlign: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                {leaderboard.length}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                }}
              >
                Total Players
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#34d399",
                }}
              >
                {formatTokens(
                  leaderboard.reduce(
                    (sum, entry) => sum + entry.totalTokensEarned,
                    0
                  )
                )}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                }}
              >
                Total Tokens
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#fbbf24",
                }}
              >
                {leaderboard
                  .reduce((sum, entry) => sum + entry.totalXP, 0)
                  .toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                }}
              >
                Total XP
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#a78bfa",
                }}
              >
                {Math.max(
                  ...leaderboard.map((entry) => entry.bestScore)
                ).toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#9ca3af",
                }}
              >
                Highest Score
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid #374151",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "white",
                marginBottom: "12px",
                margin: "0 0 12px 0",
              }}
            >
              🎮 Game Statistics
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "16px",
                fontSize: "14px",
              }}
            >
              <div
                style={{
                  background: "#1e293b",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    color: "#60a5fa",
                    fontWeight: "bold",
                  }}
                >
                  {leaderboard.filter((entry) => entry.level >= 10).length}
                </div>
                <div style={{ color: "#9ca3af" }}>Level 10+ Players</div>
              </div>
              <div
                style={{
                  background: "#1e293b",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    color: "#34d399",
                    fontWeight: "bold",
                  }}
                >
                  {
                    leaderboard.filter((entry) => entry.bestScore >= 15000)
                      .length
                  }
                </div>
                <div style={{ color: "#9ca3af" }}>15K+ Score</div>
              </div>
              <div
                style={{
                  background: "#1e293b",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    color: "#fbbf24",
                    fontWeight: "bold",
                  }}
                >
                  {
                    leaderboard.filter(
                      (entry) => entry.totalTokensEarned >= 10000
                    ).length
                  }
                </div>
                <div style={{ color: "#9ca3af" }}>10K+ Tokens</div>
              </div>
              <div
                style={{
                  background: "#1e293b",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    color: "#a78bfa",
                    fontWeight: "bold",
                  }}
                >
                  {leaderboard.filter((entry) => entry.level >= 15).length}
                </div>
                <div style={{ color: "#9ca3af" }}>Level 15+</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <p
            style={{
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            📊 Contract-based leaderboard • Auto-refreshes every 30s
          </p>
          <p
            style={{
              fontSize: "11px",
              color: "#4b5563",
              marginTop: "4px",
            }}
          >
            💡 Last updated: {lastRefresh.toLocaleTimeString()} • Data directly
            from smart contract
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;
