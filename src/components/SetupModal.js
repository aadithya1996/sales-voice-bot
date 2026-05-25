'use client';

import React, { useState, useEffect } from 'react';
import FocusList from './FocusList';
import StatusIndicator from './StatusIndicator';

export default function SetupModal({
  isOpen,
  onClose,
  onStartCall,
  syncStatus,
  syncProgress,
  classifyStatus,
  classifyProgress,
  seedStatus,
  seedProgress,
  clearStatus,
  clearProgress,
  focusList,
  onSeed,
  onSync,
  onClassify,
  onClear,
  repName,
  onRepChange
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [localName, setLocalName] = useState(repName || '');

  // Auto-advance steps when operations complete
  useEffect(() => {
    // Step 1 (index 0): Rep Profile — auto-complete if name exists
    if (repName && !completedSteps.includes(0)) {
      setCompletedSteps(prev => [...prev, 0]);
      if (currentStep === 0) setCurrentStep(1);
    }
    if (clearStatus === 'done' && !completedSteps.includes(1)) {
      setCompletedSteps(prev => [...prev, 1]);
      setCurrentStep(2);
    }
    if (seedStatus === 'done' && !completedSteps.includes(2)) {
      setCompletedSteps(prev => [...prev, 2]);
      setCurrentStep(3);
    }
    if (syncStatus === 'done' && !completedSteps.includes(3)) {
      setCompletedSteps(prev => [...prev, 3]);
      setCurrentStep(4);
    }
    if (classifyStatus === 'done' && !completedSteps.includes(4)) {
      setCompletedSteps(prev => [...prev, 4]);
    }
  }, [repName, clearStatus, seedStatus, syncStatus, classifyStatus, completedSteps, currentStep]);

  // Sync local inputs when props change
  useEffect(() => {
    setLocalName(repName || '');
  }, [repName]);

  if (!isOpen) return null;

  const handleSaveRep = () => {
    if (localName.trim()) {
      onRepChange({ name: localName.trim() });
    }
  };

  const isRepValid = localName.trim().length > 0;
  const isReady = focusList.length > 0 && classifyStatus === 'done';
  const completedCount = completedSteps.length;

  const steps = [
    {
      number: 1,
      title: 'Rep Profile',
      icon: '👤',
      description: 'Enter your name so the AI voice assistant knows who you are and can greet you personally during the call.',
      isRepStep: true
    },
    {
      number: 2,
      title: 'Clear Previous Demo',
      icon: '🧹',
      description: 'Remove previously seeded demo contacts and deals from your HubSpot CRM. This keeps your HubSpot clean and prevents clutter from old test data. Recommended before each new demo session.',
      status: clearStatus,
      progress: clearProgress,
      action: onClear,
      actionLabel: clearStatus === 'clearing' ? 'Clearing...' : clearStatus === 'done' ? '✓ Cleared' : 'Clear Previous Demo',
      disabled: clearStatus === 'clearing'
    },
    {
      number: 3,
      title: 'Seed Demo Data',
      icon: '🌱',
      description: 'AI generates exactly 4 realistic B2B deals with rich context, then writes them to your HubSpot CRM (contacts, deals, notes). After that, they sync back to the local database. This tests the full round-trip: HubSpot → Local → Voice → Actions → HubSpot.',
      status: seedStatus,
      progress: seedProgress,
      action: onSeed,
      actionLabel: seedStatus === 'seeding' ? 'Seeding...' : seedStatus === 'done' ? '✓ Seeded' : 'Seed Demo Data',
      disabled: seedStatus === 'seeding' || clearStatus === 'clearing' || !completedSteps.includes(1)
    },
    {
      number: 4,
      title: 'Sync HubSpot CRM',
      icon: '🔄',
      description: 'Pull real contacts, deals, pipeline stages, and notes from your HubSpot account into the local cache. This keeps the AI assistant working with your live sales pipeline data. Required if you want to review actual deals during the voice call.',
      status: syncStatus,
      progress: syncProgress,
      action: onSync,
      actionLabel: syncStatus === 'syncing' ? `Syncing (${syncProgress.progress}%)` : syncStatus === 'done' ? '✓ Synced' : 'Sync HubSpot CRM',
      disabled: syncStatus === 'syncing' || seedStatus === 'seeding' || clearStatus === 'clearing' || !completedSteps.includes(2)
    },
    {
      number: 5,
      title: 'Run AI Prioritization',
      icon: '🧠',
      description: 'The LLM (GPT-4o or Gemini) analyzes every deal and assigns a priority score (1-5) and category: Urgent Follow-Up, Stage Advance, At-Risk, Close-Ready, or Celebration. This is what the voice bot uses to decide which deals to talk about first.',
      status: classifyStatus,
      progress: classifyProgress,
      action: onClassify,
      actionLabel: classifyStatus === 'classifying' ? `Analyzing (${classifyProgress.progress}%)` : classifyStatus === 'done' ? '✓ Prioritized' : 'Run AI Prioritization',
      disabled: classifyStatus === 'classifying' || focusList.length === 0 || syncStatus === 'syncing' || clearStatus === 'clearing' || !completedSteps.includes(3)
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 7, 12, 0.85)',
      backdropFilter: 'blur(12px)',
      zIndex: 100,
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
        maxWidth: '720px',
        maxHeight: '85vh',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '32px 32px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ 
                fontSize: '1.75rem', 
                fontFamily: 'var(--font-heading)', 
                fontWeight: 800,
                marginBottom: '8px'
              }}>
                🚀 Welcome to Pipeline Pilot
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Set up your pipeline in 5 steps, then start your AI voice review.
              </p>
            </div>
            <button 
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Skip Setup →
            </button>
          </div>

          {/* Overall Progress */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '0.8rem', 
              marginBottom: '8px',
              color: 'var(--text-secondary)'
            }}>
              <span>Setup Progress</span>
              <span>{completedCount}/5 steps completed</span>
            </div>
            <div style={{
              height: '6px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(completedCount / 5) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent-primary), #d97706)',
                borderRadius: '3px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {steps.map((step, idx) => {
            const isActive = currentStep === idx;
            const isCompleted = completedSteps.includes(idx);
            const showProgress = step.status === 'syncing' || step.status === 'classifying' || step.status === 'seeding' || step.status === 'clearing';
            
            return (
              <div key={idx} style={{
                padding: '20px',
                borderRadius: '12px',
                border: isActive ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                background: isActive ? 'rgba(245, 166, 35, 0.03)' : 'rgba(255,255,255,0.02)',
                opacity: step.disabled && !isCompleted ? 0.6 : 1,
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {/* Step Number */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isCompleted ? 'var(--healthy)' : isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0
                  }}>
                    {isCompleted ? '✓' : step.icon}
                  </div>
                  
                  {/* Step Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                        {step.number}. {step.title}
                      </h3>
                      
                      {step.isRepStep ? (
                        <button
                          className={isCompleted ? 'btn-glass' : 'btn-primary'}
                          onClick={handleSaveRep}
                          disabled={!isRepValid || isCompleted}
                          style={{ 
                            fontSize: '0.8rem', 
                            padding: '8px 16px',
                            opacity: !isRepValid || isCompleted ? 0.5 : 1,
                            cursor: !isRepValid || isCompleted ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isCompleted ? '✓ Saved' : 'Save Profile'}
                        </button>
                      ) : (
                        <button
                          className={isCompleted ? 'btn-glass' : step.number === 3 ? 'btn-primary' : 'btn-glass'}
                          onClick={step.action}
                          disabled={step.disabled}
                          style={{ 
                            fontSize: '0.8rem', 
                            padding: '8px 16px',
                            opacity: step.disabled ? 0.5 : 1,
                            cursor: step.disabled ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {showProgress && <StatusIndicator status="processing" size="small" />}
                          {step.actionLabel}
                        </button>
                      )}
                    </div>
                    
                    <p style={{ 
                      fontSize: '0.82rem', 
                      color: 'var(--text-secondary)', 
                      lineHeight: 1.5,
                      marginBottom: step.isRepStep || showProgress ? '12px' : '0'
                    }}>
                      {step.description}
                    </p>

                    {/* Rep Profile Input */}
                    {step.isRepStep && (
                      <div style={{ marginTop: '10px', maxWidth: '320px' }}>
                        <label style={inputLabelStyle}>Your Name</label>
                        <input
                          type="text"
                          value={localName}
                          onChange={(e) => setLocalName(e.target.value)}
                          placeholder="Elon Gates"
                          style={inputStyle}
                          disabled={isCompleted}
                        />
                      </div>
                    )}

                    {/* Progress Bar */}
                    {showProgress && !step.isRepStep && (
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          fontSize: '0.75rem', 
                          color: 'var(--text-secondary)',
                          marginBottom: '6px'
                        }}>
                          <span>{step.progress.status}</span>
                          <span>{step.progress.progress}%</span>
                        </div>
                        <div style={{
                          height: '4px',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${step.progress.progress}%`,
                            background: 'var(--accent-primary)',
                            borderRadius: '2px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Flow Explanation */}
        <div style={{
          padding: '20px 32px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(245, 166, 35, 0.02)'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem' }}>🗺️</span>
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                How Data Flows in This System
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>1</span>
                  <span><b>Clear</b> removes previously seeded demo contacts and deals from HubSpot to keep your CRM clean.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>2</span>
                  <span><b>Seed</b> asks GPT-4o to generate exactly 4 realistic B2B deals, then writes them directly to your HubSpot CRM.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>3</span>
                  <span><b>Sync</b> pulls everything from HubSpot (seeded demo data + any pre-existing real data) into the local SQLite database.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>4</span>
                  <span><b>Classify</b> runs GPT-4o over every deal in the local DB to assign priority scores and categories.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>5</span>
                  <span><b>Voice Call</b> reads the prioritized deals from local DB. Only the top 4 deals are discussed during the demo call.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>6</span>
                  <span><b>Write-Back</b> on the review screen executes queued actions via HubSpot REST API — notes, stage moves, and risk flags.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '24px 32px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {isReady ? (
              <span style={{ color: 'var(--healthy)' }}>✅ Pipeline ready! {focusList.length} deals prioritized.</span>
            ) : (
              <span>Complete all 5 steps to enable voice review.</span>
            )}
          </div>
          
          <button
            className="btn-primary"
            onClick={onClose}
            disabled={!isReady}
            style={{ 
              padding: '12px 24px',
              opacity: !isReady ? 0.5 : 1,
              cursor: !isReady ? 'not-allowed' : 'pointer'
            }}
          >
            {isReady ? 'Start Pipeline Review →' : 'Complete setup first'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputLabelStyle = {
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '4px',
  display: 'block'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.25)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
  fontFamily: 'var(--font-body)'
};
