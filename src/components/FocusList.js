'use client';

import React from 'react';
import DealCard from './DealCard';

export default function FocusList({ deals, compact = false, currentDealIndex = -1 }) {
  if (!deals || deals.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No priority items in focus list today.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {deals.map((deal, idx) => (
        <div 
          key={deal.id} 
          style={{ 
            animation: `slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.08}s both` 
          }}
        >
          <DealCard
            deal={deal}
            isActive={idx === currentDealIndex}
            isCompact={compact}
          />
        </div>
      ))}
    </div>
  );
}
