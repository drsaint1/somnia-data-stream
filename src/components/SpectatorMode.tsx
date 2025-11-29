import React from 'react';
import LiveRaceFeed from './LiveRaceFeed';
import { useLiveRaces, useLiveLeaderboard } from '../hooks/useDataStreams';

interface SpectatorModeProps {
  onClose: () => void;
}

/**
 * Spectator Mode Component
 * Watch live races happening in real-time using Somnia Data Streams
 */
const SpectatorMode: React.FC<SpectatorModeProps> = ({ onClose }) => {
  const { liveRaces } = useLiveRaces();
  const { leaderboard } = useLiveLeaderboard();

  const activeRaces = liveRaces.filter((race) => !race.finalPosition);
  const completedRaces = liveRaces.filter((race) => race.finalPosition);

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              📺 Spectator Mode
            </h2>
            <p style={styles.subtitle}>
              Watch live races powered by Somnia Data Streams
            </p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Stats Bar */}
        <div style={styles.statsBar}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{activeRaces.length}</div>
            <div style={styles.statLabel}>Active Races</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{completedRaces.length}</div>
            <div style={styles.statLabel}>Completed</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{leaderboard.length}</div>
            <div style={styles.statLabel}>Live Leaderboard</div>
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.content}>
          {/* Active Races Section */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🏁 Active Races</h3>
            {activeRaces.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No active races at the moment</p>
                <p style={styles.emptySubtext}>
                  Races will appear here when players start racing
                </p>
              </div>
            ) : (
              <div style={styles.raceGrid}>
                {activeRaces.slice(0, 6).map((race, index) => (
                  <div key={`active-${race.raceId}-${index}`} style={styles.raceCard}>
                    <div style={styles.raceHeader}>
                      <span style={styles.raceBadge}>LIVE</span>
                      <span style={styles.raceTime}>
                        {race.trackName || 'Racing'}
                      </span>
                    </div>
                    <div style={styles.raceInfo}>
                      <div style={styles.raceRow}>
                        <span>Player:</span>
                        <span style={styles.raceValue}>
                          {`${race.player?.slice(0, 6)}...${race.player?.slice(-4)}`}
                        </span>
                      </div>
                      {race.lapNumber && (
                        <div style={styles.raceRow}>
                          <span>Current Lap:</span>
                          <span style={styles.raceValue}>{race.lapNumber}</span>
                        </div>
                      )}
                      {race.currentPosition && (
                        <div style={styles.raceRow}>
                          <span>Position:</span>
                          <span style={styles.positionBadge}>
                            #{race.currentPosition}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Feed Section */}
          <div style={styles.feedSection}>
            <LiveRaceFeed />
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerBadge}>
            ⚡ Powered by Somnia Data Streams - Real-time blockchain reactivity
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
  },
  container: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    borderRadius: '24px',
    padding: '32px',
    maxWidth: '1400px',
    width: '95%',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '2px solid rgba(168, 85, 247, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #a855f7, #ec4899)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  closeButton: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#ef4444',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center' as const,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  content: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
    overflow: 'hidden',
  },
  section: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '16px',
    padding: '20px',
    overflow: 'auto',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  emptySubtext: {
    fontSize: '14px',
    marginTop: '8px',
    color: 'rgba(255, 255, 255, 0.3)',
  },
  raceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  raceCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
  },
  raceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  raceBadge: {
    fontSize: '10px',
    padding: '4px 8px',
    background: '#ef4444',
    borderRadius: '6px',
    fontWeight: 'bold',
    animation: 'pulse 2s infinite',
  },
  raceTime: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  raceInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  raceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  raceValue: {
    color: '#ffffff',
    fontWeight: '500',
  },
  positionBadge: {
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  feedSection: {
    overflow: 'auto',
  },
  footer: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'center' as const,
  },
  footerBadge: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
};

export default SpectatorMode;
