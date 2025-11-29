import React, { useState, useEffect } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { useRacingContract, CarNFT } from "../hooks/useRacingContract";

interface CarGarageProps {
  onClose: () => void;
}

type TabType = "overview" | "staking";

interface Notification {
  id: string;
  type: "success" | "error" | "info" | "loading";
  title: string;
  message: string;
  duration?: number;
}

const CarGarage: React.FC<CarGarageProps> = ({ onClose }) => {
  const {
    playerCars,
    loading,
    stakeCar,
    unstakeCar,
    isPending,
    refetchCars,
    getRarityName,
    getRarityColor,
    getStakingRewards,
  } = useRacingContract();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [stakingRewards, setStakingRewards] = useState<Map<number, number>>(
    new Map()
  );
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingStakeUpdates, setPendingStakeUpdates] = useState<Set<number>>(
    new Set()
  );

  const { isSuccess: isTxConfirmed, isError: isTxError } =
    useWaitForTransactionReceipt({
      hash: currentTxHash as `0x${string}`,
      query: { enabled: !!currentTxHash },
    });

  useEffect(() => {
    if (isTxConfirmed && currentTxHash) {
      addNotification({
        type: "success",
        title: "Transaction Confirmed!",
        message: actionInProgress?.includes("staking")
          ? "Your car has been successfully staked and is now earning XP!"
          : "Your car has been successfully unstaked and XP rewards have been claimed!",
        duration: 5000,
      });

      setTimeout(() => {
        refetchCars();
        setActionInProgress(null);
        setCurrentTxHash(null);
        setPendingStakeUpdates(new Set());
      }, 1000);
    }

    if (isTxError && currentTxHash) {
      addNotification({
        type: "error",
        title: "Transaction Failed",
        message: "The transaction was rejected or failed. Please try again.",
        duration: 5000,
      });

      setActionInProgress(null);
      setCurrentTxHash(null);
      setPendingStakeUpdates(new Set());
    }
  }, [isTxConfirmed, isTxError, currentTxHash, actionInProgress]);

  const addNotification = (notification: Omit<Notification, "id">) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id };
    setNotifications((prev) => [...prev, newNotification]);

    if (notification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    const updateStakingRewards = () => {
      const newRewards = new Map<number, number>();
      playerCars.forEach((car) => {
        if (car.isStaked) {
          const rewards = getStakingRewards(car);
          newRewards.set(car.id, rewards);
        }
      });
      setStakingRewards(newRewards);
    };

    updateStakingRewards();

    const interval = setInterval(updateStakingRewards, 30000);
    return () => clearInterval(interval);
  }, [playerCars, getStakingRewards]);

  const handleStakeCar = async (car: CarNFT) => {
    if (car.isStaked) return;

    try {
      setActionInProgress(`staking-${car.id}`);
      setPendingStakeUpdates((prev) => new Set([...prev, car.id]));

     
      addNotification({
        type: "info",
        title: "Staking Car...",
        message: `Please confirm the transaction in your wallet to stake ${car.name}`,
        duration: 3000,
      });

      const txHash = await stakeCar(car.id);

      if (txHash) {
        setCurrentTxHash(txHash);

        
        addNotification({
          type: "loading",
          title: "Transaction Submitted",
          message: `Staking ${car.name}... Waiting for confirmation.`,
          duration: 8000,
        });
      }
    } catch (error: any) {
      console.error("Failed to stake car:", error);

      let errorMessage = "Failed to stake car. Please try again.";
      if (error.message?.includes("rejected")) {
        errorMessage = "Transaction was rejected in wallet.";
      } else if (error.message?.includes("insufficient")) {
        errorMessage = "Insufficient funds to pay gas fees.";
      }

      addNotification({
        type: "error",
        title: "Staking Failed",
        message: errorMessage,
        duration: 5000,
      });

      setActionInProgress(null);
      setPendingStakeUpdates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(car.id);
        return newSet;
      });
    }
  };

  const handleUnstakeCar = async (car: CarNFT) => {
    if (!car.isStaked) return;

    try {
      setActionInProgress(`unstaking-${car.id}`);
      setPendingStakeUpdates((prev) => new Set([...prev, car.id]));

      const currentRewards = stakingRewards.get(car.id) || 0;

      addNotification({
        type: "info",
        title: "Unstaking Car...",
        message: `Please confirm to unstake ${car.name} and claim ${currentRewards} XP`,
        duration: 3000,
      });

      const txHash = await unstakeCar(car.id);

      if (txHash) {
        setCurrentTxHash(txHash);

        // Update notification for transaction submitted
        addNotification({
          type: "loading",
          title: "Transaction Submitted",
          message: `Unstaking ${car.name} and claiming ${currentRewards} XP... Waiting for confirmation.`,
          duration: 8000,
        });
      }
    } catch (error: any) {
      console.error("Failed to unstake car:", error);

      let errorMessage = "Failed to unstake car. Please try again.";
      if (error.message?.includes("rejected")) {
        errorMessage = "Transaction was rejected in wallet.";
      } else if (error.message?.includes("insufficient")) {
        errorMessage = "Insufficient funds to pay gas fees.";
      }

      addNotification({
        type: "error",
        title: "Unstaking Failed",
        message: errorMessage,
        duration: 5000,
      });

      setActionInProgress(null);
      setPendingStakeUpdates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(car.id);
        return newSet;
      });
    }
  };

  const getCarStatusText = (car: CarNFT) => {
    if (pendingStakeUpdates.has(car.id)) {
      if (car.isStaked) {
        return "Unstaking...";
      } else {
        return "Staking...";
      }
    }

    if (car.isStaked) {
      const timeStaked = Math.floor(
        (Date.now() - car.stakedTime * 1000) / 1000
      );
      const daysStaked = Math.floor(timeStaked / (24 * 60 * 60));
      const hoursStaked = Math.floor((timeStaked % (24 * 60 * 60)) / (60 * 60));

      if (daysStaked > 0) {
        return `Staked for ${daysStaked}d ${hoursStaked}h`;
      } else {
        return `Staked for ${hoursStaked}h`;
      }
    }
    return "Available";
  };

  const getCarStatusColor = (car: CarNFT) => {
    if (pendingStakeUpdates.has(car.id)) {
      return "#8b5cf6";
    }
    return car.isStaked ? "#fbbf24" : "#6366f1";
  };

  const stakedCars = playerCars.filter((car) => car.isStaked);
  const availableCars = playerCars.filter((car) => !car.isStaked);

  const tabs = [
    { id: "overview", label: "🏠 Overview", count: playerCars.length },
    { id: "staking", label: "⚡ Staking", count: stakedCars.length },
  ];

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
            background: "#111827",
            borderRadius: "8px",
            padding: "32px",
            textAlign: "center",
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
              margin: "0 auto 16px",
            }}
          ></div>
          <span style={{ color: "white" }}>Loading your garage...</span>
        </div>
      </div>
    );
  }

  const renderCarCard = (car: CarNFT, showStakingControls: boolean = false) => (
    <div
      key={car.id}
      style={{
        background: "linear-gradient(135deg, #1e293b 0%, #111827 100%)",
        borderRadius: "12px",
        padding: "20px",
        border: car.isStaked ? "2px solid #fbbf24" : "1px solid #374151",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: getCarStatusColor(car),
          color: "white",
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: "600",
        }}
      >
        {pendingStakeUpdates.has(car.id)
          ? car.isStaked
            ? "⏳ UNSTAKING"
            : "⏳ STAKING"
          : car.isStaked
          ? "⚡ STAKED"
          : "🟢 AVAILABLE"}
      </div>

      <div style={{ marginBottom: "16px" }}>
        <h3
          style={{
            color: "white",
            margin: "0 0 4px 0",
            fontSize: "18px",
            fontWeight: "bold",
            paddingRight: "80px",
          }}
        >
          {car.name}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              color: getRarityColor(car.rarity),
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {getRarityName(car.rarity)}
          </span>
          <span style={{ color: "#6b7280", fontSize: "12px" }}>
            ID #{car.id}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{ color: "#ef4444", fontSize: "18px", fontWeight: "bold" }}
          >
            {car.speed}
          </div>
          <div style={{ color: "#9ca3af", fontSize: "11px" }}>SPEED</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{ color: "#0891b2", fontSize: "18px", fontWeight: "bold" }}
          >
            {car.handling}
          </div>
          <div style={{ color: "#9ca3af", fontSize: "11px" }}>HANDLING</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{ color: "#6366f1", fontSize: "18px", fontWeight: "bold" }}
          >
            {car.acceleration}
          </div>
          <div style={{ color: "#9ca3af", fontSize: "11px" }}>ACCEL</div>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <span style={{ color: "#a78bfa", fontSize: "12px" }}>Experience</span>
          <span style={{ color: "#a78bfa", fontSize: "12px" }}>
            {car.experience} XP
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#fbbf24", fontSize: "12px" }}>Wins/Races</span>
          <span style={{ color: "#fbbf24", fontSize: "12px" }}>
            {car.wins}/{car.races}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            background: car.isStaked
              ? "rgba(251, 191, 36, 0.1)"
              : "rgba(16, 185, 129, 0.1)",
            padding: "8px 12px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: getCarStatusColor(car),
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            {getCarStatusText(car)}
          </div>
          {car.isStaked && stakingRewards.has(car.id) && (
            <div
              style={{ color: "#a78bfa", fontSize: "11px", marginTop: "2px" }}
            >
              Pending: +{stakingRewards.get(car.id)} XP
            </div>
          )}
        </div>
      </div>

      {showStakingControls && (
        <div style={{ display: "flex", gap: "8px" }}>
          {!car.isStaked ? (
            <button
              onClick={() => handleStakeCar(car)}
              disabled={actionInProgress === `staking-${car.id}` || isPending}
              style={{
                flex: 1,
                background:
                  actionInProgress === `staking-${car.id}`
                    ? "#6b7280"
                    : "#6366f1",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor:
                  actionInProgress === `staking-${car.id}`
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.3s ease",
                opacity: actionInProgress === `staking-${car.id}` ? 0.6 : 1,
              }}
            >
              {actionInProgress === `staking-${car.id}`
                ? "⏳ Staking..."
                : "⚡ Stake Car"}
            </button>
          ) : (
            <button
              onClick={() => handleUnstakeCar(car)}
              disabled={actionInProgress === `unstaking-${car.id}` || isPending}
              style={{
                flex: 1,
                background:
                  actionInProgress === `unstaking-${car.id}`
                    ? "#6b7280"
                    : "#6366f1",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor:
                  actionInProgress === `unstaking-${car.id}`
                    ? "not-allowed"
                    : "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.3s ease",
                opacity: actionInProgress === `unstaking-${car.id}` ? 0.6 : 1,
              }}
            >
              {actionInProgress === `unstaking-${car.id}`
                ? "⏳ Unstaking..."
                : "💰 Claim & Unstake"}
            </button>
          )}
        </div>
      )}
    </div>
  );

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
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#111827",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "1400px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #374151",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                color: "white",
                margin: "0 0 4px 0",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              🏠 Car Garage
            </h2>
            <p style={{ color: "#9ca3af", margin: 0, fontSize: "14px" }}>
              Manage your NFT racing cars • Stake for XP rewards
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#4b5563",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ✕ Close
          </button>
        </div>

        <div
          style={{
            padding: "0 24px",
            borderBottom: "1px solid #374151",
            display: "flex",
            gap: "4px",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              style={{
                background: activeTab === tab.id ? "#1e293b" : "transparent",
                color: activeTab === tab.id ? "white" : "#9ca3af",
                border: "none",
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid #fbbf24"
                    : "2px solid transparent",
                transition: "all 0.3s ease",
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
          {playerCars.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "60px", marginBottom: "16px" }}>🏗️</div>
              <h3 style={{ color: "white", marginBottom: "8px" }}>
                No Cars Yet
              </h3>
              <p style={{ color: "#9ca3af" }}>
                Mint your first car to get started!
              </p>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "20px",
                    }}
                  >
                    {playerCars.map((car) => renderCarCard(car, true))}
                  </div>
                </div>
              )}

              {activeTab === "staking" && (
                <div>
                  <div style={{ marginBottom: "24px" }}>
                    <h3 style={{ color: "white", marginBottom: "8px" }}>
                      ⚡ Staking Overview
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "16px",
                        marginBottom: "24px",
                      }}
                    >
                      <div
                        style={{
                          background: "rgba(251, 191, 36, 0.1)",
                          padding: "16px",
                          borderRadius: "8px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "#fbbf24",
                            fontSize: "24px",
                            fontWeight: "bold",
                          }}
                        >
                          {stakedCars.length}
                        </div>
                        <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                          Cars Staked
                        </div>
                      </div>
                      <div
                        style={{
                          background: "rgba(167, 139, 250, 0.1)",
                          padding: "16px",
                          borderRadius: "8px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "#a78bfa",
                            fontSize: "24px",
                            fontWeight: "bold",
                          }}
                        >
                          {Array.from(stakingRewards.values()).reduce(
                            (sum, reward) => sum + reward,
                            0
                          )}
                        </div>
                        <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                          Pending XP
                        </div>
                      </div>
                      <div
                        style={{
                          background: "rgba(16, 185, 129, 0.1)",
                          padding: "16px",
                          borderRadius: "8px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "#6366f1",
                            fontSize: "24px",
                            fontWeight: "bold",
                          }}
                        >
                          100
                        </div>
                        <div style={{ color: "#9ca3af", fontSize: "12px" }}>
                          XP per Day
                        </div>
                      </div>
                    </div>
                  </div>

                  {stakedCars.length > 0 ? (
                    <div>
                      <h4 style={{ color: "white", marginBottom: "16px" }}>
                        🔥 Currently Staked
                      </h4>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(280px, 1fr))",
                          gap: "20px",
                          marginBottom: "32px",
                        }}
                      >
                        {stakedCars.map((car) => renderCarCard(car, true))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                        ⚡
                      </div>
                      <h3 style={{ color: "white", marginBottom: "8px" }}>
                        No Cars Staked
                      </h3>
                      <p style={{ color: "#9ca3af" }}>
                        Stake your cars to earn 100 XP per day passively!
                      </p>
                    </div>
                  )}

                  {availableCars.length > 0 && (
                    <div>
                      <h4 style={{ color: "white", marginBottom: "16px" }}>
                        🚗 Available to Stake
                      </h4>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(280px, 1fr))",
                          gap: "20px",
                        }}
                      >
                        {availableCars.map((car) => renderCarCard(car, true))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
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
        {notifications.map((notification) => (
          <div
            key={notification.id}
            style={{
              background:
                notification.type === "success"
                  ? "linear-gradient(45deg, #6366f1, #059669)"
                  : notification.type === "error"
                  ? "linear-gradient(45deg, #ef4444, #dc2626)"
                  : notification.type === "loading"
                  ? "linear-gradient(45deg, #8b5cf6, #7c3aed)"
                  : "linear-gradient(45deg, #0891b2, #2563eb)",
              color: "white",
              padding: "16px",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.1)",
              animation: "slideInRight 0.3s ease-out",
              cursor: "pointer",
            }}
            onClick={() => removeNotification(notification.id)}
          >
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}
            >
              <div style={{ fontSize: "20px", marginTop: "2px" }}>
                {notification.type === "success" && "✅"}
                {notification.type === "error" && "❌"}
                {notification.type === "loading" && "⏳"}
                {notification.type === "info" && "ℹ️"}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: "4px",
                    fontSize: "14px",
                  }}
                >
                  {notification.title}
                </div>
                <div
                  style={{ fontSize: "13px", opacity: 0.9, lineHeight: "1.4" }}
                >
                  {notification.message}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notification.id);
                }}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "white",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideInRight {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default CarGarage;
