'use client';

import React from 'react';

export default function DealCard({ deal, isActive = false, isCompact = false, onClick }) {
  
  const getCategoryColor = (category) => {
    switch (category) {
      case 'CELEBRATE': return 'var(--celebration)';
      case 'AT_RISK': return 'var(--urgent)';
      case 'FOLLOW_UP_URGENT': return 'var(--attention)';
      case 'STAGE_ADVANCE': return 'var(--in-progress)';
      case 'CLOSE_READY': return 'var(--healthy)';
      default: return 'var(--text-secondary)';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    if (priority >= 4) return 'badge-urgent';
    if (priority === 3) return 'badge-attention';
    return 'badge-faint';
  };

  const borderLeftColor = deal.classification 
    ? getCategoryColor(deal.classification.category) 
    : 'var(--text-faint)';

  if (isCompact) {
    // Compact Deal Card (for morning dashboard side panel preview or deal queues)
    return (
      <div 
        onClick={onClick}
        className={`glass-panel ${isActive ? 'active' : ''}`}
        style={{
          borderLeft: `4px solid ${borderLeftColor}`,
          padding: '12px 16px',
          cursor: onClick ? 'pointer' : 'default',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <h5 style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {deal.dealname}
          </h5>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {deal.stage_label ? deal.stage_label.replace('default', '') : deal.dealstage}
          </span>
        </div>
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 650, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', display: 'block' }}>
            ${deal.amount?.toLocaleString()}
          </span>
          {deal.classification && (
            <span style={{ fontSize: '0.65rem', color: getCategoryColor(deal.classification.category), fontWeight: 700 }}>
              P{deal.classification.priority}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full Details Deal Card (for detailed focus lists)
  return (
    <div 
      onClick={onClick}
      className={`glass-panel ${isActive ? 'active' : ''}`}
      style={{
        borderLeft: `4px solid ${borderLeftColor}`,
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <span className={`badge ${getPriorityBadgeClass(deal.classification?.priority)}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
              Priority {deal.classification?.priority || 2}
            </span>
            {deal.classification && (
              <span style={{ fontSize: '0.72rem', color: getCategoryColor(deal.classification.category), fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {deal.classification.category.replace('_', ' ')}
              </span>
            )}
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{deal.dealname}</h4>
        </div>

        <span style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
          ${deal.amount?.toLocaleString()}
        </span>
      </div>

      {deal.contact && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          🏢 {deal.contact.company} · 👤 {deal.contact.firstname} {deal.contact.lastname}
        </div>
      )}

      {deal.classification && (
        <p style={{ 
          fontSize: '0.82rem', 
          lineHeight: 1.4, 
          color: 'var(--text-primary)',
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.03)',
          padding: '8px 12px',
          borderRadius: '6px'
        }}>
          {deal.classification.reasoning}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', marginTop: '4px' }}>
        <span style={{ textTransform: 'capitalize' }}>Stage: <b>{deal.stage_label ? deal.stage_label.replace('default', '') : deal.dealstage}</b></span>
        <span>Days in stage: <b style={{ color: deal.days_in_stage > 8 ? 'var(--urgent)' : 'inherit' }}>{deal.days_in_stage}d</b></span>
      </div>
    </div>
  );
}
