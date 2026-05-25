'use client';

import React, { useState, useEffect } from 'react';

export default function PostCallReview({
  transcript,
  actions,
  onExecuteAll,
  onRemoveAction,
  executionProgress,
  callStats,
  onNewSession,
  repName = 'Elon Gates',
  repEmail = ''
}) {
  const [autoSyncSeconds, setAutoSyncSeconds] = useState(60);
  const [isAutoSyncActive, setIsAutoSyncActive] = useState(true);
  const [isAutoSyncCancelled, setIsAutoSyncCancelled] = useState(false);

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}m ${remaining}s`;
  };

  const getActionIcon = (type, status) => {
    if (status === 'executing') return '⏳';
    if (status === 'completed') return '✅';
    if (status === 'failed') return '❌';
    switch (type) {
      case 'crm_stage_move': return '➔';
      case 'crm_note': return '✍';
      case 'crm_flag_risk': return '⚠️';
      default: return '●';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'var(--healthy)';
      case 'failed': return 'var(--urgent)';
      case 'executing': return 'var(--attention)';
      default: return 'var(--text-secondary)';
    }
  };

  const getActionInsight = (action) => {
    switch (action.action_type) {
      case 'crm_stage_move':
        return `This will advance the deal to "${action.params?.target_stage || 'next stage'}" in HubSpot, moving it closer to Closed Won.`;
      case 'crm_note':
        return `This adds a contextual note to the deal record in HubSpot so the team has visibility on recent discussions.`;
      case 'crm_flag_risk':
        return `This marks the deal as at-risk in HubSpot with a clear rationale, triggering any configured alert workflows.`;
      default:
        return action.rationale || 'Queued from voice conversation.';
    }
  };

  // DEDUPLICATION: keep only the most recent action per (deal_id, action_type)
  const dedupedActions = React.useMemo(() => {
    const seen = new Map();
    // Process in reverse so the last one wins
    [...(actions || [])].reverse().forEach(act => {
      const key = `${act.deal_id}:${act.action_type}`;
      if (!seen.has(key)) {
        seen.set(key, act);
      }
    });
    return Array.from(seen.values()).reverse(); // restore original order
  }, [actions]);

  // Generate conversation summary
  const summary = React.useMemo(() => {
    const userMessages = transcript.filter(t => t.speaker === 'user').map(t => t.content);
    const dealsMentioned = [];
    transcript.forEach(turn => {
      if (turn.speaker === 'agent') {
        dedupedActions.forEach(a => {
          if (turn.content?.toLowerCase().includes(a.deal_name?.toLowerCase())) {
            dealsMentioned.push(a.deal_name);
          }
        });
      }
    });
    return {
      dealsDiscussed: [...new Set(dealsMentioned)],
      totalTurns: transcript.length,
      rapport: userMessages.some(m =>
        m?.toLowerCase().includes('day') ||
        m?.toLowerCase().includes('funny') ||
        m?.toLowerCase().includes('team') ||
        m?.toLowerCase().includes('standup')
      )
    };
  }, [transcript, dedupedActions]);

  // Group deduplicated actions by deal
  const groupedActions = {};
  dedupedActions.forEach(act => {
    if (!groupedActions[act.deal_name]) groupedActions[act.deal_name] = [];
    groupedActions[act.deal_name].push(act);
  });

  const isExecuting = executionProgress.total > 0 && executionProgress.completed < executionProgress.total;
  const isFinished = executionProgress.total > 0 && executionProgress.completed === executionProgress.total;
  const executionPercentage = executionProgress.total > 0
    ? Math.round((executionProgress.completed / executionProgress.total) * 100)
    : 0;

  const pendingCount = dedupedActions.filter(a => a.status === 'pending').length;
  const completedCount = dedupedActions.filter(a => a.status === 'completed').length;

  // 60-second auto-sync countdown
  useEffect(() => {
    if (!isAutoSyncActive || isAutoSyncCancelled || isExecuting || isFinished || dedupedActions.length === 0) {
      return;
    }
    if (autoSyncSeconds <= 0) {
      onExecuteAll();
      return;
    }
    const timer = setInterval(() => {
      setAutoSyncSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoSyncSeconds, isAutoSyncActive, isAutoSyncCancelled, isExecuting, isFinished, dedupedActions.length, onExecuteAll]);

  const handleCancelAutoSync = () => {
    setIsAutoSyncCancelled(true);
    setIsAutoSyncActive(false);
  };

  const handleManualSync = () => {
    setIsAutoSyncCancelled(true);
    setIsAutoSyncActive(false);
    onExecuteAll();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }} className="animate-slide-up">
      
      {/* Header Banner */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px', borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 7, 12, 0.4) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.15)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>
            ✅ Daily Review Completed
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {repName} discussed {summary.dealsDiscussed.length} opportunities in {formatDuration(callStats.duration)}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn-glass" onClick={() => {
            const text = transcript.map(t => `${t.speaker === 'agent' ? 'Alex' : repName}: ${t.content}`).join('\n');
            navigator.clipboard?.writeText(text);
            alert('Transcript copied to clipboard!');
          }}>
            📋 Copy Transcript
          </button>
          <button className="btn-primary" onClick={onNewSession} disabled={isExecuting}>
            ← Start New Review
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Call Duration</span>
          <h3 style={{ fontSize: '1.5rem', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>{formatDuration(callStats.duration)}</h3>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Deals Discussed</span>
          <h3 style={{ fontSize: '1.5rem', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>{summary.dealsDiscussed.length}</h3>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Actions Queued</span>
          <h3 style={{ fontSize: '1.5rem', marginTop: '8px', fontFamily: 'var(--font-mono)', color: dedupedActions.length > 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
            {dedupedActions.length}
          </h3>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rapport Check</span>
          <h3 style={{ fontSize: '1.5rem', marginTop: '8px', color: summary.rapport ? 'var(--healthy)' : 'var(--text-secondary)' }}>
            {summary.rapport ? '✓ Connected' : '—'}
          </h3>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '35% 65%', gap: '24px', flex: 1 }}>
        
        {/* Left: Summary + Auto-Sync */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Conversation Summary */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              What Was Discussed
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {summary.rapport && (
                <div style={{
                  background: 'rgba(245, 166, 35, 0.05)', border: '1px solid rgba(245, 166, 35, 0.15)', borderRadius: '8px', padding: '12px'
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>RAPPORT</span>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                    {repName} shared day updates, team moments, and concerns. Alex acknowledged and built connection before diving into pipeline.
                  </p>
                </div>
              )}
              
              {summary.dealsDiscussed.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                    DEALS REVIEWED
                  </span>
                  {summary.dealsDiscussed.map((deal, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0',
                      borderBottom: idx < summary.dealsDiscussed.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
                    }}>
                      <span style={{ fontSize: '1rem' }}>🏢</span>
                      <span style={{ fontSize: '0.85rem' }}>{deal}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CRM Write-Back Progress + Auto-Sync */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                CRM Write-Back
              </h4>
              <span className="badge badge-attention" style={{ fontSize: '0.7rem' }}>
                {completedCount}/{dedupedActions.length} Done
              </span>
            </div>
            
            {dedupedActions.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-faint)', textAlign: 'center', padding: '20px 0' }}>
                No CRM actions queued from this call.
              </div>
            ) : isFinished ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '14px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--healthy)',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                ✅ All {dedupedActions.length} actions successfully synced to HubSpot CRM.
              </div>
            ) : isExecuting ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                  {executionProgress.current}
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${executionPercentage}%`,
                    background: 'var(--healthy)', borderRadius: '3px', transition: 'width 0.5s ease'
                  }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {executionProgress.completed} of {executionProgress.total} completed
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {!isAutoSyncCancelled ? (
                  <>
                    {/* Auto-sync countdown */}
                    <div style={{
                      background: 'rgba(245, 166, 35, 0.06)', border: '1px solid rgba(245, 166, 35, 0.15)',
                      borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                          ⏱️ Auto-Sync in {autoSyncSeconds}s
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {dedupedActions.length} action{dedupedActions.length !== 1 ? 's' : ''} queued
                        </span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${(autoSyncSeconds / 60) * 100}%`,
                          background: 'linear-gradient(90deg, var(--accent-primary), #d97706)',
                          borderRadius: '2px', transition: 'width 1s linear'
                        }} />
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                        CRM updates will be pushed automatically. You can review and cancel below.
                      </p>
                      <button
                        className="btn-glass"
                        onClick={handleCancelAutoSync}
                        style={{ width: '100%', padding: '10px 0', fontSize: '0.85rem' }}
                      >
                        ✋ Cancel Auto-Sync
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={handleManualSync}
                    style={{ width: '100%', padding: '14px 0', fontSize: '0.95rem' }}
                  >
                    🚀 Write Back to HubSpot CRM Now
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Full Transcript + Deduped Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Full Transcript */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '400px' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Full Call Transcript
            </h4>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {transcript.map((turn, idx) => {
                const isAgent = turn.speaker === 'agent';
                return (
                  <div key={`post-${idx}`} style={{
                    display: 'flex', flexDirection: 'column',
                    paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)'
                  }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700,
                      color: isAgent ? 'var(--accent-primary)' : 'var(--text-secondary)'
                    }}>
                      {isAgent ? 'Alex (AI)' : repName} — {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <p style={{ fontSize: '0.82rem', marginTop: '4px', lineHeight: 1.35, color: 'rgba(255,255,255,0.85)' }}>
                      {turn.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deduped Actions Ledger */}
          {dedupedActions.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Actions to Sync
                </h4>
                <span className="badge badge-attention" style={{ fontSize: '0.7rem' }}>
                  {dedupedActions.length} Unique
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {Object.entries(groupedActions).map(([dealName, dealActions]) => (
                  <div key={dealName} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '14px' }}>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                      🏢 {dealName}
                    </h5>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {dealActions.map(act => (
                        <div key={act.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                          background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)',
                          padding: '14px', borderRadius: '10px'
                        }}>
                          <span style={{ fontSize: '1.1rem', color: getStatusColor(act.status), marginTop: '2px' }}>
                            {getActionIcon(act.action_type, act.status)}
                          </span>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                {act.action_type.replace('crm_', '').replace('_', ' ')}
                              </span>
                              {act.status === 'pending' && (
                                <button
                                  onClick={() => onRemoveAction(act.id)}
                                  style={{
                                    background: 'transparent', border: 'none', color: 'var(--text-faint)',
                                    cursor: 'pointer', fontSize: '14px', padding: '2px 6px'
                                  }}
                                  title="Remove action"
                                >
                                  ✕
                                </button>
                              )}
                              {act.status !== 'pending' && (
                                <span style={{ fontSize: '0.75rem', color: getStatusColor(act.status) }}>
                                  {act.status}
                                </span>
                              )}
                            </div>
                            
                            {act.params.note_text && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                                &ldquo;{act.params.note_text}&rdquo;
                              </p>
                            )}
                            {act.params.target_stage && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Target stage: <b>{act.params.target_stage}</b>
                              </p>
                            )}
                            
                            {/* Insight */}
                            <div style={{
                              marginTop: '8px', padding: '8px 10px',
                              background: 'rgba(245, 166, 35, 0.03)', borderRadius: '6px',
                              borderLeft: '2px solid rgba(245, 166, 35, 0.3)'
                            }}>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                <span style={{ fontWeight: 600 }}>💡 Why:</span> {getActionInsight(act)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email to Manager Section */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                📧 Send Summary to Manager
              </h4>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Preview and send a summary of this review session — including transcript highlights, agreed actions, and CRM write-back status — to your manager.
            </p>
            
            <button 
              className="btn-glass" 
              onClick={() => window.open('/preview', '_blank')}
              style={{ justifyContent: 'center', padding: '12px 0', fontSize: '0.9rem' }}
            >
              ✉️ Preview & Compose Email →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
