import { useState, useEffect } from "react";
import Web3Provider from "./providers/Web3Provider";
import EnhancedCarRaceGame from "./components/EnhancedCarRaceGame";
import TournamentLobby from "./components/TournamentLobby";
import Leaderboard from "./components/Leaderboard";
import SpectatorMode from "./components/SpectatorMode";
import ConnectButton from "./components/ConnectButton";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useRacingContract } from "./hooks/useRacingContract";
import { DataStreamsProvider, useDataStreams } from "./hooks/useDataStreams";
import somniaLogo from "./assets/somnia-logo.jpeg";

type GameView = "menu" | "racing" | "tournament" | "leaderboard";

function GameWrapper() {
  const { isConnected } = useAccount();

  // Initialize Somnia Data Streams
  const { isInitialized, error: dataStreamsError } = useDataStreams();

  useEffect(() => {
    if (isInitialized) {
      console.log('✅ Somnia Data Streams ready!');
    }
    if (dataStreamsError) {
      console.error('❌ Data Streams error:', dataStreamsError);
    }
  }, [isInitialized, dataStreamsError]);
  const {
    selectedCar,
    playerCars,
    loading: carLoading,
    mintStarterCar,
    isPending,
    refetchCars,
  } = useRacingContract();
  const [currentView, setCurrentView] = useState<GameView>("menu");
  const [activeTournamentId, setActiveTournamentId] = useState<number | null>(
    null
  );
  const [completedTournaments, setCompletedTournaments] = useState<Set<number>>(new Set());
  const [mintingStatus, setMintingStatus] = useState<
    "idle" | "wallet_confirm" | "confirming" | "success" | "error" | "rejected"
  >("idle");
  const [mintingMessage, setMintingMessage] = useState<string>("");
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);
  const [hasSuccessfullyMinted, setHasSuccessfullyMinted] =
    useState<boolean>(false);
  const [showSpectatorMode, setShowSpectatorMode] = useState<boolean>(false);

  const { isSuccess: isConfirmed, isError: isConfirmError } =
    useWaitForTransactionReceipt({
      hash: currentTxHash as `0x${string}`,
      query: { enabled: !!currentTxHash },
    });

  useEffect(() => {
    if (isConfirmed && mintingStatus === "confirming") {
      setMintingStatus("success");
      setHasSuccessfullyMinted(true);
      setMintingMessage(
        " Congratulations! You have successfully purchased your first NFT car!"
      );

      refetchCars();

      setTimeout(() => {
        setMintingMessage("🎮 Entering the game...");

        refetchCars();
      }, 2000);

      setTimeout(() => {
        setCurrentView("menu");
        setMintingStatus("idle");
        setMintingMessage("");
        setCurrentTxHash(null);

        setTimeout(() => {
          if (playerCars.length === 0) {
            setHasSuccessfullyMinted(false);
          }
        }, 3000);
      }, 3500);
    } else if (isConfirmError && mintingStatus === "confirming") {
      setMintingStatus("error");
      setMintingMessage(" Transaction failed on blockchain. Please try again.");

      setTimeout(() => {
        setMintingStatus("idle");
        setMintingMessage("");
        setCurrentTxHash(null);
        setHasSuccessfullyMinted(false);
      }, 2000);
    }
  }, [isConfirmed, isConfirmError, mintingStatus]);

  const handleStartRace = (tournamentId?: number) => {
    setActiveTournamentId(tournamentId || null);
    setCurrentView("racing");
  };

  const handleTournamentCompleted = (tournamentId: number) => {
    console.log(`🏆 Tournament ${tournamentId} completed! Marking as completed.`);
    setCompletedTournaments(prev => new Set([...prev, tournamentId]));
  };

  const handleNavigateToTournaments = () => {
    setActiveTournamentId(null);
    setCurrentView("tournament");
  };

  const handleNavigateToMenu = () => {
    setActiveTournamentId(null);
    setCurrentView("menu");
  };

  const handleMintStarterCar = async () => {
    try {
      setMintingStatus("wallet_confirm");
      setMintingMessage("💳 Please confirm the transaction in your wallet...");

      const txHash = await mintStarterCar();

      setCurrentTxHash(txHash);
      setMintingStatus("confirming");
      setMintingMessage("⏳ Waiting for blockchain confirmation...");
    } catch (error: any) {
      console.error("Minting error:", error);

      if (
        error.message?.includes("User rejected") ||
        error.message?.includes("user rejected") ||
        error.code === 4001
      ) {
        setMintingStatus("rejected");
        setMintingMessage(
          "❌ Transaction rejected by user. Please try again when ready."
        );
      } else if (error.message?.includes("insufficient")) {
        setMintingStatus("error");
        setMintingMessage(
          "❌ Insufficient funds. You need at least 0.01 STT to mint a Starter Racer."
        );
      } else if (error.message?.includes("Already has starter car")) {
        setMintingStatus("error");
        setMintingMessage(
          "❌ You already have a starter car. Please refresh the page."
        );
      } else {
        setMintingStatus("error");
        setMintingMessage(
          "❌ Minting failed. Please check your wallet and try again."
        );
      }

      setTimeout(() => {
        setMintingStatus("idle");
        setMintingMessage("");
        setCurrentTxHash(null);
        setHasSuccessfullyMinted(false);
      }, 2000);
    }
  };

  if (!isConnected) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 50,
          }}
        >
          <ConnectButton />
        </div>

        <div
          style={{
            textAlign: "center",
            color: "white",
            maxWidth: "600px",
            padding: "20px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <img 
              src={somniaLogo} 
              alt="Somnia Logo" 
              style={{ 
                width: "100px", 
                height: "100px", 
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid rgba(255,255,255,0.3)"
              }} 
            />
          </div>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              marginBottom: "20px",
              background: "linear-gradient(45deg, #ffd700, #ff6b6b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Somnia Racing
          </h1>
          <p
            style={{
              fontSize: "24px",
              marginBottom: "30px",
              opacity: 0.9,
            }}
          >
            The Ultimate Blockchain Racing Experience
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
              marginBottom: "40px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                padding: "20px",
                borderRadius: "15px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div style={{ fontSize: "30px", marginBottom: "10px" }}>🏆</div>
              <h3 style={{ marginBottom: "10px", color: "#ffd700" }}>
                Compete & Earn
              </h3>
              <p style={{ fontSize: "14px", opacity: 0.8 }}>
                Join tournaments, win STT prizes, and climb the global
                leaderboard
              </p>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                padding: "20px",
                borderRadius: "15px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div style={{ fontSize: "30px", marginBottom: "10px" }}>🚗</div>
              <h3 style={{ marginBottom: "10px", color: "#00ff88" }}>
                Collect NFT Cars
              </h3>
              <p style={{ fontSize: "14px", opacity: 0.8 }}>
                Mint, customize, and breed unique racing cars with different
                stats
              </p>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                padding: "20px",
                borderRadius: "15px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div style={{ fontSize: "30px", marginBottom: "10px" }}>⚡</div>
              <h3 style={{ marginBottom: "10px", color: "#ff6b6b" }}>
                Lightning Fast
              </h3>
              <p style={{ fontSize: "14px", opacity: 0.8 }}>
                Built on Somnia for lightning-fast ~100 ms confirmations and ultra-low, sub-cent fees.
              </p>
            </div>
          </div>

          <div
            style={{
              fontSize: "18px",
              opacity: 0.7,
              marginBottom: "20px",
            }}
          >
            Connect your EVM wallet to start racing!
          </div>
        </div>
      </div>
    );
  }

  console.log("🔍 App state:", {
    isConnected,
    carLoading,
    playerCarsLength: playerCars.length,
    hasSuccessfullyMinted,
    mintingStatus,
    currentView,
  });

  if (
    isConnected &&
    !carLoading &&
    playerCars.length === 0 &&
    !hasSuccessfullyMinted
  ) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          position: "relative",
          paddingTop: "30px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 50,
          }}
        >
          <ConnectButton />
        </div>

        <div
          style={{
            textAlign: "center",
            color: "white",
            maxWidth: "600px",
            padding: "20px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ marginBottom: "15px" }}>
            <img 
              src={somniaLogo} 
              alt="Somnia Logo" 
              style={{ 
                width: "70px", 
                height: "70px", 
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.3)"
              }} 
            />
          </div>
          <h1
            style={{
              fontSize: "36px",
              fontWeight: "bold",
              marginBottom: "15px",
              background: "linear-gradient(45deg, #ffd700, #ff6b6b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Welcome to Somnia Racing!
          </h1>
          <p
            style={{
              fontSize: "20px",
              marginBottom: "25px",
              opacity: 0.9,
            }}
          >
            You need to mint your first NFT car to start racing
          </p>

          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.3)",
              borderRadius: "20px",
              padding: "25px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
              maxWidth: "500px",
            }}
          >
            <h3 style={{ marginBottom: "15px", fontSize: "22px" }}>
              🚗 Get Your Starter Racer
            </h3>
            <p style={{ marginBottom: "15px", opacity: 0.8, fontSize: "15px" }}>
              Mint your first NFT car to enter the world of blockchain racing!
            </p>

            <div
              style={{
                marginBottom: "20px",
                padding: "12px",
                backgroundColor: "rgba(255, 215, 0, 0.1)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 215, 0, 0.3)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#ffd700",
                }}
              >
                💰 Price: 0.01 STT
              </p>
            </div>

            {mintingMessage && (
              <div
                style={{
                  marginBottom: "25px",
                  marginTop: "15px",
                  padding: "16px 20px",
                  borderRadius: "12px",
                  minHeight: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    mintingStatus === "success"
                      ? "rgba(16, 185, 129, 0.1)"
                      : mintingStatus === "error" ||
                        mintingStatus === "rejected"
                      ? "rgba(239, 68, 68, 0.1)"
                      : "rgba(59, 130, 246, 0.1)",
                  border: `1px solid ${
                    mintingStatus === "success"
                      ? "rgba(16, 185, 129, 0.3)"
                      : mintingStatus === "error" ||
                        mintingStatus === "rejected"
                      ? "rgba(239, 68, 68, 0.3)"
                      : "rgba(59, 130, 246, 0.3)"
                  }`,
                  color:
                    mintingStatus === "success"
                      ? "#6366f1"
                      : mintingStatus === "error" ||
                        mintingStatus === "rejected"
                      ? "#ef4444"
                      : "#0891b2",
                }}
              >
                {(mintingStatus === "wallet_confirm" ||
                  mintingStatus === "confirming") && (
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
                        borderTop: "2px solid #0891b2",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                    <span style={{ fontSize: "16px", fontWeight: "600" }}>
                      {mintingMessage}
                    </span>
                  </div>
                )}
                {mintingStatus !== "wallet_confirm" &&
                  mintingStatus !== "confirming" && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "600",
                        lineHeight: "1.4",
                      }}
                    >
                      {mintingMessage}
                    </p>
                  )}
              </div>
            )}

            <button
              onClick={handleMintStarterCar}
              disabled={
                mintingStatus === "wallet_confirm" ||
                mintingStatus === "confirming" ||
                mintingStatus === "success" ||
                isPending
              }
              style={{
                backgroundColor:
                  mintingStatus === "success"
                    ? "#059669"
                    : mintingStatus === "wallet_confirm" ||
                      mintingStatus === "confirming" ||
                      isPending
                    ? "#6b7280"
                    : "#6366f1",
                color: "white",
                padding: "16px 32px",
                borderRadius: "12px",
                border: "none",
                cursor:
                  mintingStatus === "wallet_confirm" ||
                  mintingStatus === "confirming" ||
                  mintingStatus === "success" ||
                  isPending
                    ? "not-allowed"
                    : "pointer",
                fontSize: "18px",
                fontWeight: "bold",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                transition: "all 0.3s ease",
                opacity:
                  mintingStatus === "success"
                    ? 1
                    : mintingStatus === "wallet_confirm" ||
                      mintingStatus === "confirming" ||
                      isPending
                    ? 0.6
                    : 1,
                minWidth: "250px",
              }}
              onMouseEnter={(e) => {
                if (
                  mintingStatus !== "wallet_confirm" &&
                  mintingStatus !== "confirming" &&
                  mintingStatus !== "success" &&
                  !isPending
                ) {
                  e.currentTarget.style.backgroundColor = "#059669";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (
                  mintingStatus !== "wallet_confirm" &&
                  mintingStatus !== "confirming" &&
                  mintingStatus !== "success" &&
                  !isPending
                ) {
                  e.currentTarget.style.backgroundColor = "#6366f1";
                  e.currentTarget.style.transform = "translateY(0px)";
                }
              }}
            >
              {mintingStatus === "wallet_confirm" ? (
                "💳 Confirm in Wallet..."
              ) : mintingStatus === "confirming" ? (
                "⏳ Confirming on Blockchain..."
              ) : mintingStatus === "success" ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid transparent",
                      borderTop: "2px solid #fff",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                  🎮 Redirecting to Game...
                </div>
              ) : (
                "🚗 Mint Starter Racer (0.01 STT)"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {currentView !== "racing" && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            right: "20px",
            zIndex: 50,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "6px",
              background: "rgba(0,0,0,0.3)",
              padding: "8px 12px",
              borderRadius: "20px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            <button
              onClick={() => {
                setCurrentView("menu");
                setActiveTournamentId(null);
              }}
              style={{
                background:
                  currentView === "menu"
                    ? "linear-gradient(45deg, #ff6b6b, #ffd700)"
                    : "transparent",
                color: currentView === "menu" ? "#000" : "#fff",
                border:
                  currentView === "menu"
                    ? "none"
                    : "1px solid rgba(255,255,255,0.2)",
                padding: "8px 12px",
                borderRadius: "15px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                transition: "all 0.3s ease",
                boxShadow:
                  currentView === "menu"
                    ? "0 4px 15px rgba(255,107,107,0.4)"
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (currentView !== "menu") {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "menu") {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateY(0px)";
                }
              }}
            >
              🏎️ Race
            </button>

            <button
              onClick={() => setCurrentView("tournament")}
              style={{
                background:
                  currentView === "tournament"
                    ? "linear-gradient(45deg, #8b5cf6, #06b6d4)"
                    : "transparent",
                color: currentView === "tournament" ? "#000" : "#fff",
                border:
                  currentView === "tournament"
                    ? "none"
                    : "1px solid rgba(255,255,255,0.2)",
                padding: "8px 12px",
                borderRadius: "15px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                transition: "all 0.3s ease",
                boxShadow:
                  currentView === "tournament"
                    ? "0 4px 15px rgba(139,92,246,0.4)"
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (currentView !== "tournament") {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "tournament") {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateY(0px)";
                }
              }}
            >
              🏆 Tournaments
            </button>

            <button
              onClick={() => setCurrentView("leaderboard")}
              style={{
                background:
                  currentView === "leaderboard"
                    ? "linear-gradient(45deg, #6366f1, #ffd700)"
                    : "transparent",
                color: currentView === "leaderboard" ? "#000" : "#fff",
                border:
                  currentView === "leaderboard"
                    ? "none"
                    : "1px solid rgba(255,255,255,0.2)",
                padding: "8px 12px",
                borderRadius: "15px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                transition: "all 0.3s ease",
                boxShadow:
                  currentView === "leaderboard"
                    ? "0 4px 15px rgba(16,185,129,0.4)"
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (currentView !== "leaderboard") {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "leaderboard") {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateY(0px)";
                }
              }}
            >
              📊 Leaderboard
            </button>

            <button
              onClick={() => setShowSpectatorMode(true)}
              style={{
                background: "linear-gradient(45deg, #a855f7, #ec4899)",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "15px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(168, 85, 247, 0.4)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(168, 85, 247, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(168, 85, 247, 0.4)";
              }}
            >
              📺 Watch Live Races
            </button>
          </div>

          <ConnectButton />
        </div>
      )}

      {currentView === "menu" && (
        <EnhancedCarRaceGame
          onNavigateToTournaments={handleNavigateToTournaments}
          onNavigateToMenu={handleNavigateToMenu}
        />
      )}

      {currentView === "racing" && (
        <EnhancedCarRaceGame
          activeTournamentId={activeTournamentId}
          onTournamentCompleted={handleTournamentCompleted}
          onNavigateToTournaments={handleNavigateToTournaments}
          onNavigateToMenu={handleNavigateToMenu}
        />
      )}

      {currentView === "tournament" && (
        <TournamentLobby
          onStartRace={handleStartRace}
          onClose={() => setCurrentView("menu")}
          selectedCarId={selectedCar?.id}
          completedTournamentsFromApp={completedTournaments}
        />
      )}

      {currentView === "leaderboard" && (
        <Leaderboard onClose={() => setCurrentView("menu")} />
      )}

      {showSpectatorMode && (
        <SpectatorMode onClose={() => setShowSpectatorMode(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Web3Provider>
        <DataStreamsProvider>
          <style>
            {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
          </style>
          <GameWrapper />
        </DataStreamsProvider>
      </Web3Provider>
    </ErrorBoundary>
  );
}

export default App;
