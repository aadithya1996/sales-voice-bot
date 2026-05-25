'use client';

import React from 'react';
import DealCard from './DealCard';

export default function VoicePanel({
  callStatus,
  currentDeal,
  dealQueue,
  currentDealIndex = 0,
  onEndCall,
  onMuteToggle,
  isMuted,
  callDuration,
  volume = 1
}) {
  
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-slide-left">
      
      {/* Voice Status & Waveform */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: callStatus === 'active' ? 'var(--healthy)' : 'var(--attention)',
              boxShadow: callStatus === 'active' ? '0 0 10px var(--healthy)' : 'none',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {callStatus === 'active' ? 'Call Session Active' : 'Connecting Audio...'}
            </span>
          </div>
          <span style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
            {formatTime(callDuration)}
          </span>
        </div>

        {/* Waveform Visualizer */}
        <div style={{
          height: '60px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '12px',
          overflow: 'hidden',
          padding: '0 20px'
        }}>
          {Array.from({ length: 24 }).map((_, idx) => {
            // Distribute dynamic volume scaling to make it look like a spectrum analyzer
            const scale = Math.max(0.1, (volume / 10) * (Math.sin((idx / 23) * Math.PI) * 0.9 + 0.1));
            // Add a little randomness so it feels alive
            const heightFactor = Math.min(100, Math.round(scale * 100 * (0.8 + Math.random() * 0.4)));
            
            return (
              <div
                key={idx}
                style={{
                  width: '4px',
                  height: `${heightFactor}%`,
                  borderRadius: '2px',
                  background: isMuted 
                    ? 'var(--text-faint)' 
                    : 'linear-gradient(to top, var(--accent-primary) 0%, var(--accent-hover) 100%)',
                  transition: 'height 0.12s ease-in-out',
                  opacity: isMuted ? 0.3 : 0.8
                }}
              />
            );
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Alex</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AI Sales Operations Assistant</span>
        </div>
      </div>

      {/* Deal Spotlight (Active Deal Details) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Spotlight Deal
        </h4>
        
        {currentDeal ? (
          <div className="glass-panel active" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className={`badge ${
                  currentDeal.classification?.priority >= 4 
                    ? 'badge-urgent' 
                    : currentDeal.classification?.priority === 3 
                      ? 'badge-attention' 
                      : 'badge-faint'
                }`} style={{ marginBottom: '8px' }}>
                  Priority {currentDeal.classification?.priority || 2} · {currentDeal.classification?.category || 'Review'}
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{currentDeal.dealname}</h3>
              </div>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                ${currentDeal.amount?.toLocaleString()}
              </h3>
            </div>

            {/* Stage Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Current Stage</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
                  {currentDeal.stage_label.replace('default', '')}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Days in Stage</span>
                <span style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 600,
                  color: currentDeal.days_in_stage > 8 ? 'var(--urgent)' : 'var(--text-primary)'
                }}>
                  {currentDeal.days_in_stage} days {currentDeal.days_in_stage > 8 ? '⚠️' : ''}
                </span>
              </div>
            </div>

            {/* Contact details */}
            {currentDeal.contact && (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Decision Maker</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentDeal.contact.firstname} {currentDeal.contact.lastname}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>{currentDeal.contact.company} · {currentDeal.contact.email}</span>
              </div>
            )}

            {/* AI Recommendation Context */}
            {currentDeal.classification && (
              <div style={{ marginTop: 'auto', background: 'rgba(245, 166, 35, 0.04)', borderLeft: '3px solid var(--accent-primary)', padding: '12px', borderRadius: '0 8px 8px 0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  AI Reasoning
                </span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {currentDeal.classification.reasoning}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>No active deal selected</span>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
        <button 
          onClick={onMuteToggle}
          className="btn-glass"
          style={{ justifyContent: 'center', borderColor: isMuted ? 'var(--urgent)' : 'var(--glass-border)' }}
        >
          {isMuted ? '🎙️ Unmute' : '🎙️ Mute Mic'}
        </button>
        <button 
          onClick={onEndCall} 
          className="btn-danger" 
          style={{ justifyContent: 'center' }}
        >
          🛑 Hang Up & Review Updates
        </button>
      </div>

    </div>
  );
}
