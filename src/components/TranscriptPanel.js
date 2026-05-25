'use client';

import React, { useEffect, useRef } from 'react';

export default function TranscriptPanel({ transcript, liveAgentText, callStatus, currentDealName }) {
  const transcriptEndRef = useRef(null);

  // Auto-scroll to bottom when transcript changes
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, liveAgentText]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }} className="animate-slide-right">
      
      {/* Live Transcript Panel */}
      <div className="glass-panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Call Transcript
          </h4>
          {currentDealName && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', background: 'rgba(245,166,35,0.08)', padding: '3px 10px', borderRadius: '4px' }}>
              Discussing: {currentDealName}
            </span>
          )}
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
          {transcript.length === 0 && !liveAgentText ? (
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '12px' }}>
              <StatusIndicatorMock />
              <p style={{ fontSize: '0.85rem' }}>
                {callStatus === 'active' ? 'Agent is speaking... transcript will appear here.' : 'Awaiting agent connection...'}
              </p>
            </div>
          ) : (
            <>
              {transcript.map((bubble, idx) => {
                const isAgent = bubble.speaker === 'agent';
                const bubbleId = `bubble-${idx}-${bubble.timestamp || idx}`;
                return (
                  <div
                    key={bubbleId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignSelf: isAgent ? 'flex-start' : 'flex-end',
                      maxWidth: '85%',
                    }}
                  >
                    <span style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '4px',
                      alignSelf: isAgent ? 'flex-start' : 'flex-end',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}>
                      {isAgent ? 'Alex (AI)' : 'You'}
                    </span>
                    
                    <div style={{
                      background: isAgent ? 'var(--glass-bg)' : 'rgba(245, 166, 35, 0.12)',
                      border: '1px solid',
                      borderColor: isAgent ? 'var(--glass-border)' : 'rgba(245, 166, 35, 0.25)',
                      padding: '12px 16px',
                      borderRadius: isAgent ? '4px 16px 16px 16px' : '16px 16px 4px 16px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.45,
                    }}>
                      {bubble.content}
                    </div>
                  </div>
                );
              })}
              
              {/* Live typing indicator */}
              {liveAgentText && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: 'flex-start',
                  maxWidth: '85%',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}>
                    Alex (AI)
                  </span>
                  <div style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    padding: '12px 16px',
                    borderRadius: '4px 16px 16px 16px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    lineHeight: 1.45,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '6px'
                  }}>
                    <span>{liveAgentText}</span>
                    <TypingDots />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
}

function StatusIndicatorMock() {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'wave 1s infinite 0.1s' }} />
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'wave 1s infinite 0.2s' }} />
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'wave 1s infinite 0.3s' }} />
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '3px', paddingBottom: '2px' }}>
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-secondary)', animation: 'pulse 1.2s infinite 0s' }} />
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-secondary)', animation: 'pulse 1.2s infinite 0.2s' }} />
      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-secondary)', animation: 'pulse 1.2s infinite 0.4s' }} />
    </div>
  );
}
