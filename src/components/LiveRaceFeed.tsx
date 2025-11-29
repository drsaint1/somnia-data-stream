import React, { useEffect, useState } from 'react';
import { useLiveRaces } from '../hooks/useDataStreams';

/**
 * Live Race Feed Component
 * Displays real-time race events using Somnia Data Streams
 */
const LiveRaceFeed: React.FC = () => {
  const { liveRaces } = useLiveRaces();
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    // Keep only the last 10 events
    setRecentEvents((prev) => {
      const newEvents = [...liveRaces, ...prev].slice(0, 10);
      return newEvents;
    });
  }, [liveRaces]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🏁 Live Race Feed</h3>
        <div style={styles.badge}>Powered by Somnia Data Streams</div>
      </div>

      <div style={styles.feedContainer}>
        {recentEvents.length === 0 ? (
          <div style={styles.empty}>
            <p>📡 Waiting for live race events...</p>
            <p style={styles.emptySubtext}>
              Real-time updates will appear here when races start
            </p>
          </div>
        ) : (
          <div style={styles.eventList}>
            {recentEvents.map((event, index) => (
              <div key={`${event.raceId}-${index}`} style={styles.eventCard}>
                <div style={styles.eventHeader}>
                  <span style={styles.eventType}>
                    {getEventIcon(event.type)} {getEventTitle(event.type)}
                  </span>
                  <span style={styles.eventTime}>
                    {formatTime(Number(event.timestamp))}
                  </span>
                </div>

                <div style={styles.eventDetails}>
                  <div style={styles.eventRow}>
                    <span style={styles.eventLabel}>Player:</span>
                    <span style={styles.eventValue}>
                      {formatAddress(event.player)}
                    </span>
                  </div>

                  {event.trackName && (
                    <div style={styles.eventRow}>
                      <span style={styles.eventLabel}>Track:</span>
                      <span style={styles.eventValue}>{event.trackName}</span>
                    </div>
                  )}

                  {event.lapNumber && (
                    <div style={styles.eventRow}>
                      <span style={styles.eventLabel}>Lap:</span>
                      <span style={styles.eventValue}>{event.lapNumber}</span>
                    </div>
                  )}

                  {event.currentPosition && (
                    <div style={styles.eventRow}>
                      <span style={styles.eventLabel}>Position:</span>
                      <span style={styles.eventValue}>
                        #{event.currentPosition}
                      </span>
                    </div>
                  )}

                  {event.finalPosition && (
                    <div style={styles.eventRow}>
                      <span style={styles.eventLabel}>Finished:</span>
                      <span style={{...styles.eventValue, ...getPositionStyle(event.finalPosition)}}>
                        {getPositionText(event.finalPosition)}
                      </span>
                    </div>
                  )}

                  {event.rewardsEarned && (
                    <div style={styles.eventRow}>
                      <span style={styles.eventLabel}>Rewards:</span>
                      <span style={styles.rewardValue}>
                        {Number(event.rewardsEarned)} RACE
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const getEventIcon = (type: string) => {
  switch (type) {
    case 'start':
      return '🚦';
    case 'progress':
      return '🏎️';
    case 'finish':
      return '🏁';
    default:
      return '📊';
  }
};

const getEventTitle = (type: string) => {
  switch (type) {
    case 'start':
      return 'Race Started';
    case 'progress':
      return 'Lap Completed';
    case 'finish':
      return 'Race Finished';
    default:
      return 'Race Event';
  }
};

const getPositionText = (position: number) => {
  switch (position) {
    case 1:
      return '🥇 1st Place';
    case 2:
      return '🥈 2nd Place';
    case 3:
      return '🥉 3rd Place';
    default:
      return `#${position}`;
  }
};

const getPositionStyle = (position: number) => {
  if (position === 1) {
    return { color: '#FFD700', fontWeight: 'bold' };
  } else if (position === 2) {
    return { color: '#C0C0C0', fontWeight: 'bold' };
  } else if (position === 3) {
    return { color: '#CD7F32', fontWeight: 'bold' };
  }
  return {};
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: '20px',
    padding: '25px',
    maxWidth: '600px',
    margin: '20px auto',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    border: '2px solid rgba(124, 58, 237, 0.3)',
  },
  header: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #a855f7, #ec4899)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  badge: {
    fontSize: '11px',
    padding: '4px 12px',
    background: 'rgba(124, 58, 237, 0.2)',
    border: '1px solid rgba(124, 58, 237, 0.4)',
    borderRadius: '12px',
    color: '#a855f7',
  },
  feedContainer: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '15px',
    padding: '15px',
    minHeight: '400px',
    maxHeight: '600px',
    overflowY: 'auto' as const,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptySubtext: {
    fontSize: '14px',
    marginTop: '10px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  eventCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
    animation: 'slideIn 0.3s ease',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  eventType: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  eventTime: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  eventDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  eventRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  eventLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  eventValue: {
    color: '#ffffff',
    fontWeight: '500',
  },
  rewardValue: {
    color: '#10b981',
    fontWeight: 'bold',
  },
};

export default LiveRaceFeed;
