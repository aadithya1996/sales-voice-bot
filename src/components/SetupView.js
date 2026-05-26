'use client';

import React, { useState } from 'react';
import FocusList from './FocusList';

export default function SetupView({
  onStartCall,
  focusList,
  repName = 'Elon Gates'
}) {
  const [showLogicModal, setShowLogicModal] = useState(false);

  // Computations for premium KPIs
  const totalDeals = focusList.length;
  const totalValue = focusList.reduce((acc, d) => acc + (d.amount || 0), 0);
  const averageDeal = totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0;
  
  const priorityBreakdown = {
    high: focusList.filter(d => d.classification?.priority >= 4).length,
    medium: focusList.filter(d => d.classification?.priority === 3).length,
    low: focusList.filter(d => d.classification?.priority <= 2).length
  };

  // Funnel calculations
  const stageCounts = {};
  focusList.forEach(d => {
    stageCounts[d.stage_label] = (stageCounts[d.stage_label] || 0) + 1;
  });

  const stagesList = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-slide-up">
      
      {/* Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Good morning, {repName}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Today is {todayStr} — here is your pipeline status.
          </p>
        </div>
        
        {/* Glow Action Button */}
        <button 
          className="btn-primary" 
          onClick={onStartCall}
          disabled={focusList.length === 0}
          style={{
            padding: '16px 36px',
            fontSize: '1.05rem',
            animation: 'pulseGlow 2s infinite ease-in-out'
          }}
        >
          🎙️ Start Daily Voice Review
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active Pipeline Value</span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '8px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
            ${totalValue.toLocaleString()}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--healthy)', marginTop: '6px' }}>↑ 4.2% from last week</p>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Open Opportunities</span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {totalDeals} Deals
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>4 in default pipeline</p>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Average Deal Size</span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            ${averageDeal.toLocaleString()}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>B2B SaaS contracts</p>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Action Urgency</span>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
            <span className="badge badge-urgent">{priorityBreakdown.high} Urgent</span>
            <span className="badge badge-attention">{priorityBreakdown.medium} Active</span>
            <span className="badge badge-faint">{priorityBreakdown.low} Safe</span>
          </div>
        </div>
      </div>

      {/* AI Logic Link */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowLogicModal(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-primary)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-body)'
          }}
        >
          🧠 How does AI prioritize deals?
        </button>
      </div>

      {/* Main Grid: Funnel and Activity on Left, Focus list on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '55% 45%', gap: '24px' }}>
        
        {/* Left Side: Funnel, Changes, Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Funnel Segmented Bar */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '16px' }}>Pipeline Deal Distribution</h4>
            <div style={{
              height: '24px',
              borderRadius: '6px',
              background: '#161b2e',
              overflow: 'hidden',
              display: 'flex',
              marginBottom: '16px'
            }}>
              {stagesList.map(([stage, count], idx) => {
                const colors = ['#6366f1', '#f59e0b', '#10b981', '#a855f7', '#ef4444', '#f5a623'];
                const color = colors[idx % colors.length];
                const percentage = (count / totalDeals) * 100;
                return (
                  <div 
                    key={stage} 
                    style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: color,
                      transition: 'all 0.5s ease'
                    }}
                    title={`${stage}: ${count}`}
                  />
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {stagesList.slice(0, 6).map(([stage, count], idx) => {
                const colors = ['#6366f1', '#f59e0b', '#10b981', '#a855f7', '#ef4444', '#f5a623'];
                const color = colors[idx % colors.length];
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {stage.replace('default', '')}: <b>{count}</b>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strategic Feature Vision & Value */}
          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              🚀 Daily Review Focus Room Strategy
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem', lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>📅 The Calendar Standup Workflow</strong>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  Automated calendar sync places a direct review link in the sales rep's daily standup event. Clicking the link opens this **Pipeline Review Focus Room** where the voice AI (Alex) leads a review of prioritized deals and contacts.
                </p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>⚙️ Write-Back & Forecast Readiness</strong>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  Reps talk naturally with the bot. The transcript is transcribed in real-time, converted into action queues, and synced back to HubSpot, followed by a summary email to their manager. This workflow can also run pipeline forecast reviews.
                </p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>💡 Business Value to the CRM</strong>
                <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li><b>Frictionless updates</b> keep CRM data highly accurate, driving higher software engagement and stickiness.</li>
                  <li><b>Daily manager reporting</b> enforces rep accountability without manual micro-management.</li>
                  <li><b>AI focus rooms</b> differentiate the CRM from standard databases.</li>
                </ul>
              </div>

              <div style={{
                background: 'rgba(245, 166, 35, 0.05)',
                border: '1px solid rgba(245, 166, 35, 0.15)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '6px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎯 North Star Metric
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span><b>Standup Review Completion Rate (SRCR):</b> The % of scheduled review calls completed by reps each week.</span>
                  <span><b>Manual CRM Time Saved:</b> Hours of admin data entry saved (estimated as 5 mins per sync action).</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Focus list preview — limit to 4 deals */}
        <div className="glass-panel" style={{ padding: '20px', maxHeight: '480px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '1.05rem' }}>Today&apos;s priority Focus List Preview</h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sorted by LLM priority · Top 4</span>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
            {focusList.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', padding: '40px 0', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '2.5rem' }}>📭</div>
                <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>No synchronized pipeline records found.</p>
                <p style={{ fontSize: '0.75rem', textAlign: 'center', opacity: 0.7 }}>Click &quot;Run Next Demo&quot; in the bottom bar to set up your pipeline.</p>
              </div>
            ) : (
              <FocusList deals={focusList.slice(0, 4)} compact={true} />
            )}
          </div>
        </div>
      </div>

      {/* AI Prioritization Logic Modal */}
      {showLogicModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 7, 12, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }} onClick={() => setShowLogicModal(false)}>
          <div style={{
            background: 'linear-gradient(180deg, #161b2e 0%, #0d1018 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '32px'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                🧠 AI Prioritization Logic
              </h3>
              <button
                onClick={() => setShowLogicModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              <p>
                Pipeline Pilot uses <strong style={{ color: 'var(--text-primary)' }}>GPT-4o</strong> to analyze every deal in your pipeline and assign a priority score (1–5) plus a category. Here is exactly what the model evaluates:
              </p>

              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Signals Weighed
                </h4>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '18px' }}>
                  <li><strong style={{ color: 'var(--text-primary)' }}>Days in stage</strong> — Deals stagnating longer than average get higher urgency.</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>Deal value</strong> — Larger ACV deals are flagged for executive attention.</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>Note sentiment</strong> — NLP scans CRM notes for blocker words (&ldquo;stuck,&rdquo; &ldquo;legal review,&rdquo; &ldquo;competitor&rdquo;).</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>Stage proximity</strong> — Late-stage deals (Contract Sent, Presentation) are prioritized over early discovery.</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>Last activity</strong> — Deals with no note or update in 7+ days get an &ldquo;At-Risk&rdquo; tag.</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Priority Categories
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-urgent">P5 · Urgent</span>
                    <span>Stale + high value + blocker notes. Needs immediate action.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-attention">P4 · At-Risk</span>
                    <span>Showing warning signals but still salvageable.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-progress">P3 · Active</span>
                    <span>Normal velocity, no blockers, standard follow-up.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-healthy">P2 · Close-Ready</span>
                    <span>Late stage, positive notes, low friction.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-celebration">P1 · Celebration</span>
                    <span>Recently won or about to close. Minimal action needed.</span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.78rem', opacity: 0.7, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                The voice bot always discusses deals in priority order (P5 first, P1 last). During the call, it surfaces the reasoning behind each priority so you can override or adjust in real time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
