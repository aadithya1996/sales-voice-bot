'use client';

import React from 'react';

export default function StatusIndicator({ status, label = '', size = 'medium' }) {
  const getDotStyle = () => {
    const base = {
      borderRadius: '50%',
      display: 'inline-block',
      transition: 'all 0.3s ease'
    };

    const dimensions = size === 'small' 
      ? { width: '8px', height: '8px' } 
      : size === 'large' 
        ? { width: '16px', height: '16px' } 
        : { width: '11px', height: '11px' };

    let stateStyles = {};

    switch (status) {
      case 'active':
      case 'done':
        stateStyles = {
          background: 'var(--healthy)',
          boxShadow: '0 0 10px var(--healthy)'
        };
        break;

      case 'processing':
        stateStyles = {
          background: 'var(--accent-primary)',
          boxShadow: '0 0 10px var(--accent-primary)',
          animation: 'pulseGlow 1.5s infinite ease-in-out'
        };
        break;

      case 'error':
        stateStyles = {
          background: 'var(--urgent)',
          boxShadow: '0 0 10px var(--urgent)'
        };
        break;

      case 'idle':
      default:
        stateStyles = {
          background: 'var(--text-faint)'
        };
        break;
    }

    return { ...base, ...dimensions, ...stateStyles };
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={getDotStyle()} />
      {label && (
        <span style={{ 
          fontSize: size === 'small' ? '0.75rem' : '0.85rem', 
          color: status === 'idle' ? 'var(--text-secondary)' : 'var(--text-primary)',
          fontWeight: 600
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
