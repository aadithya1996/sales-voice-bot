'use client';

import React, { useState } from 'react';

/**
 * RepOnboarding — First-run modal that asks for the sales rep's name.
 * This personalizes the AI greeting during voice calls.
 */
export default function RepOnboarding({ isOpen, onComplete }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    onComplete({ name: name.trim() });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 7, 12, 0.92)',
      backdropFilter: 'blur(16px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #161b2e 0%, #0d1018 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '480px',
        padding: '40px 36px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            margin: '0 auto 16px',
            boxShadow: '0 0 24px rgba(245, 166, 35, 0.3)'
          }}>
            👋
          </div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '8px' }}>
            Welcome to Pipeline Pilot
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Let&apos;s personalize your AI assistant before we review your pipeline.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Elon Gates"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.25)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.85rem',
              color: 'var(--urgent)'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px 0',
              fontSize: '1rem',
              fontWeight: 700,
              marginTop: '4px'
            }}
          >
            Continue →
          </button>
        </form>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textAlign: 'center', lineHeight: 1.5 }}>
          Your name is stored locally and used to personalize the AI voice assistant&apos;s greeting.
        </p>
      </div>
    </div>
  );
}
