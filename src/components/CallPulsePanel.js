'use client';

import React, { useEffect, useRef, useMemo } from 'react';

export default function CallPulsePanel({ transcript, liveAgentText, callStatus, callDuration, currentDealName, focusList }) {
  const scrollRef = useRef(null);

  // Auto-detect which deals have been discussed from agent utterances
  const discussedDeals = useMemo(() => {
    const discussed = new Map(); // dealName -> { name, index, timestamp }
    
    transcript.forEach(turn => {
      if (turn.speaker === 'agent') {
        focusList.forEach((deal, idx) => {
          const dealName = deal.dealname;
          const lowerDeal = dealName.toLowerCase();
          const lowerText = (turn.content || '').toLowerCase();
          
          // Check if deal name (or significant part) appears in agent speech
          if (lowerText.includes(lowerDeal) || 
              lowerText.includes(lowerDeal.split(' ')[0])) {
            if (!discussed.has(dealName)) {
              discussed.set(dealName, {
                name: dealName,
                index: idx,
                amount: deal.amount,
                stage: deal.stage_label,
                priority: deal.classification?.priority,
                timestamp: turn.timestamp
              });
            }
          }
        });
      }
    });
    
    return Array.from(discussed.values()).sort((a, b) => a.index - b.index);
  }, [transcript, focusList]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getPulseStatus = () => {
    if (callStatus === 'connecting') return { label: 'Connecting...', color: 'var(--attention)', icon: '🔗' };
    if (liveAgentText) return { label: 'Alex is speaking...', color: 'var(--accent-primary)', icon: '🗣️' };
    if (callStatus === 'active') return { label: 'Listening...', color: 'var(--healthy)', icon: '👂' };
    return { label: 'Call ended', color: 'var(--text-secondary)', icon: '⏹️' };
  };

  const pulse = getPulseStatus();
  const pulseDot = liveAgentText ? 'speaking' : callStatus === 'active' ? 'listening' : 'idle';

  return (
    <div style={styles.container} className="animate-slide-right">
      
      {/* Live Call Pulse Header */}
      <div style={styles.pulseHeader}>
        <div style={styles.pulseRow}>
          <div style={styles.pulseBadge}>
            <span style={styles.pulseIcon}>{pulse.icon}</span>
            <div style={styles.pulseDotWrapper}>
              <div style={{
                ...styles.pulseDot,
                background: pulse.color,
                animation: pulseDot === 'speaking' ? 'pulseGlow 0.8s infinite' : pulseDot === 'listening' ? 'pulseGlow 1.5s infinite' : 'none'
              }} />
            </div>
            <span style={{ ...styles.pulseLabel, color: pulse.color }}>{pulse.label}</span>
          </div>
          <span style={styles.duration}>{formatTime(callDuration)}</span>
        </div>
        
        {/* Current utterance preview (single line, not full transcript) */}
        {liveAgentText && (
          <div style={styles.liveText}>
            <span style={styles.liveTextLabel}>Alex:</span>
            <span style={styles.liveTextContent}>{liveAgentText}</span>
            <TypingDots />
          </div>
        )}
      </div>

      {/* Deals Discussed Section */}
      <div style={styles.dealsSection}>
        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Deals Discussed</h4>
          <span style={styles.badge}>{discussedDeals.length} / {focusList.length}</span>
        </div>

        <div ref={scrollRef} style={styles.dealsList}>
          {discussedDeals.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>🎙️</span>
              <p style={styles.emptyText}>Waiting for Alex to start reviewing deals...</p>
            </div>
          ) : (
            discussedDeals.map((deal, idx) => (
              <div key={deal.name} style={{
                ...styles.dealCard,
                borderLeftColor: getPriorityColor(deal.priority)
              }}>
                <div style={styles.dealRow}>
                  <span style={styles.dealNumber}>{idx + 1}</span>
                  <div style={styles.dealInfo}>
                    <span style={styles.dealName}>{deal.name}</span>
                    <div style={styles.dealMeta}>
                      <span style={styles.dealAmount}>${deal.amount?.toLocaleString()}</span>
                      <span style={styles.dealStage}>{deal.stage}</span>
                    </div>
                  </div>
                  <span style={{ ...styles.dealPriority, color: getPriorityColor(deal.priority) }}>
                    P{deal.priority || '-'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upcoming Deals (not yet discussed) */}
      {discussedDeals.length > 0 && discussedDeals.length < focusList.length && (
        <div style={styles.upcomingSection}>
          <span style={styles.upcomingLabel}>Up Next</span>
          <div style={styles.upcomingList}>
            {focusList
              .filter(d => !discussedDeals.some(dd => dd.name === d.dealname))
              .slice(0, 2)
              .map(deal => (
                <span key={deal.dealname} style={styles.upcomingItem}>{deal.dealname}</span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getPriorityColor(priority) {
  if (priority >= 5) return '#ef4444';
  if (priority === 4) return '#f97316';
  if (priority === 3) return '#f5a623';
  return '#94a3b8';
}

function TypingDots() {
  return (
    <div style={styles.dots}>
      <div style={{ ...styles.dot, animationDelay: '0s' }} />
      <div style={{ ...styles.dot, animationDelay: '0.2s' }} />
      <div style={{ ...styles.dot, animationDelay: '0.4s' }} />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
    paddingRight: '4px'
  },
  pulseHeader: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  pulseRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pulseBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  pulseIcon: {
    fontSize: '1rem'
  },
  pulseDotWrapper: {
    display: 'flex',
    alignItems: 'center'
  },
  pulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor'
  },
  pulseLabel: {
    fontSize: '0.8rem',
    fontWeight: 600
  },
  duration: {
    fontSize: '0.9rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-primary)',
    fontWeight: 700
  },
  liveText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(245, 166, 35, 0.04)',
    border: '1px solid rgba(245, 166, 35, 0.12)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '0.85rem'
  },
  liveTextLabel: {
    color: 'var(--accent-primary)',
    fontWeight: 700,
    fontSize: '0.75rem',
    textTransform: 'uppercase'
  },
  liveTextContent: {
    color: 'var(--text-primary)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  dots: {
    display: 'flex',
    gap: '3px',
    alignItems: 'center'
  },
  dot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    animation: 'pulse 1.2s infinite'
  },
  dealsSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '20px',
    overflow: 'hidden'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px'
  },
  sectionTitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 700,
    margin: 0
  },
  badge: {
    fontSize: '0.75rem',
    color: 'var(--accent-primary)',
    background: 'rgba(245, 166, 35, 0.08)',
    padding: '3px 10px',
    borderRadius: '12px'
  },
  dealsList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '12px',
    color: 'var(--text-secondary)'
  },
  emptyIcon: {
    fontSize: '2rem',
    opacity: 0.5
  },
  emptyText: {
    fontSize: '0.85rem',
    textAlign: 'center'
  },
  dealCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '12px 14px',
    borderLeft: '3px solid',
    transition: 'all 0.2s ease'
  },
  dealRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  dealNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(245, 166, 35, 0.1)',
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0
  },
  dealInfo: {
    flex: 1,
    minWidth: 0
  },
  dealName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  dealMeta: {
    display: 'flex',
    gap: '10px',
    marginTop: '3px'
  },
  dealAmount: {
    fontSize: '0.75rem',
    color: 'var(--accent-primary)',
    fontFamily: 'var(--font-mono)'
  },
  dealStage: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  dealPriority: {
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0
  },
  upcomingSection: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px dashed rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '12px 16px'
  },
  upcomingLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
    display: 'block'
  },
  upcomingList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  upcomingItem: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    background: 'rgba(255,255,255,0.03)',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.05)'
  }
};
