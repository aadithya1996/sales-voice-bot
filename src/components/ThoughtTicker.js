'use client';

import React from 'react';

export default function ThoughtTicker({ thoughts = [], activeThought = '' }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      background: 'rgba(10, 13, 26, 0.75)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--glass-border)',
      padding: '12px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 100,
      boxShadow: '0 -8px 32px rgba(0,0,0,0.5)'
    }}>
      {/* Pulse Dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-primary)',
          boxShadow: '0 0 10px var(--accent-primary)',
          animation: 'pulseGlow 1.5s infinite ease-in-out'
        }} />
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--accent-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap'
        }}>
          AI THOUGHT STREAM:
        </span>
      </div>

      {/* Main active thought ticker text */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <p style={{
          fontSize: '0.82rem',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'all 0.3s ease',
          opacity: 0.95
        }} key={activeThought}>
          {activeThought || 'Awaiting conversation topics...'}
        </p>
      </div>

      {/* Historical preview queue (very compact, shows only latest 1 item) */}
      {thoughts.length > 1 && (
        <div style={{
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          borderLeft: '1px solid var(--text-faint)',
          paddingLeft: '16px',
          display: 'none', // hide on very narrow screens
          maxWidth: '200px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          Prior: "{thoughts[1]}"
        </div>
      )}
    </div>
  );
}
