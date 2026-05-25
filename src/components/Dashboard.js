'use client';

import React, { useState, useEffect, useRef } from 'react';
import SetupView from './SetupView';
import SetupModal from './SetupModal';
import RepOnboarding from './RepOnboarding';
import VoicePanel from './VoicePanel';
import CallPulsePanel from './CallPulsePanel';
import PostCallReview from './PostCallReview';
import ThoughtTicker from './ThoughtTicker';

export default function Dashboard() {
  // App States: 'setup' | 'call' | 'review'
  const [appState, setAppState] = useState('setup');

  // Rep Identity (persisted in localStorage)
  const [repName, setRepName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Modal State
  const [showSetupModal, setShowSetupModal] = useState(true);
  
  // Data States
  const [focusList, setFocusList] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  
  // Operations Statuses
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'done' | 'error'
  const [syncProgress, setSyncProgress] = useState({ progress: 0, status: '' });
  const [classifyStatus, setClassifyStatus] = useState('idle'); // 'idle' | 'classifying' | 'done' | 'error'
  const [classifyProgress, setClassifyProgress] = useState({ progress: 0, status: '' });
  const [seedStatus, setSeedStatus] = useState('idle'); // 'idle' | 'seeding' | 'done'
  const [seedProgress, setSeedProgress] = useState({ progress: 0, status: '' });
  const [clearStatus, setClearStatus] = useState('idle'); // 'idle' | 'clearing' | 'done'
  const [clearProgress, setClearProgress] = useState({ progress: 0, status: '' });
  
  // Call States
  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'connecting' | 'active' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentDealIndex, setCurrentDealIndex] = useState(0);
  const [volume, setVolume] = useState(1); // 0 to 10 for audio visualizer
  const [llmThoughts, setLlmThoughts] = useState([]);
  const [activeThought, setActiveThought] = useState('Welcome back. Press "Start Pipeline Review" to initiate voice walk-through.');
  
  // Live agent text being typed (partial utterance during LLM streaming)
  const [liveAgentText, setLiveAgentText] = useState('');
  
  // Execution Stats
  const [executionProgress, setExecutionProgress] = useState({ total: 0, completed: 0, current: '' });

  const retellClientRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const volumeSimulationRef = useRef(null);

  // Load rep identity from localStorage or server on mount
  useEffect(() => {
    const loadRep = async () => {
      try {
        // Try localStorage first
        const savedName = localStorage.getItem('pipeline_pilot_rep_name');
        if (savedName) {
          setRepName(savedName);
          // CRITICAL: also write to shared file so ws-server.js can read it
          await fetch('/api/rep-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: savedName })
          });
          return;
        }
        // Fallback: check server config file
        const res = await fetch('/api/rep-config');
        const data = await res.json();
        if (data.name) {
          setRepName(data.name);
          localStorage.setItem('pipeline_pilot_rep_name', data.name);
          return;
        }
        setShowOnboarding(true);
      } catch (e) {
        console.error('Failed to load rep identity:', e);
        setShowOnboarding(true);
      }
    };
    loadRep();
  }, []);

  const handleOnboardingComplete = async ({ name }) => {
    setRepName(name);
    localStorage.setItem('pipeline_pilot_rep_name', name);
    // Write to shared file so ws-server.js can read the rep name
    try {
      await fetch('/api/rep-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
    } catch (e) {
      console.error('Failed to write rep config:', e);
    }
    setShowOnboarding(false);
  };

  const handleRepChange = async ({ name }) => {
    setRepName(name);
    localStorage.setItem('pipeline_pilot_rep_name', name);
    try {
      await fetch('/api/rep-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
    } catch (e) {
      console.error('Failed to write rep config:', e);
    }
  };

  // 1. Establish SSE thought-stream connection
  useEffect(() => {
    const eventSource = new EventSource('/api/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;

        switch (type) {
          case 'sync_progress':
            setSyncStatus(data.progress === 100 ? 'done' : 'syncing');
            setSyncProgress({ progress: data.progress, status: data.status });
            if (data.progress === 100) {
              fetchFocusList();
            }
            break;

          case 'clear_progress':
            setClearStatus(data.progress === 100 ? 'done' : 'clearing');
            setClearProgress({ progress: data.progress, status: data.status });
            if (data.progress === 100 && data.success) {
              // Reset seed status so user can seed fresh data
              setSeedStatus('idle');
              setSeedProgress({ progress: 0, status: '' });
            }
            break;

          case 'classification_progress':
            setClassifyStatus(data.progress === 100 ? 'done' : 'classifying');
            setClassifyProgress({ progress: data.progress, status: data.status });
            if (data.progress === 100) {
              fetchFocusList();
            }
            break;

          case 'thinking':
            setActiveThought(data.text);
            setLlmThoughts(prev => [data.text, ...prev.slice(0, 4)]);
            break;

          case 'speaking':
            // data.isPartial: true = still streaming, false = utterance complete
            if (data.isPartial) {
              // Live typing — show in the typing indicator, don't add to transcript yet
              setLiveAgentText(data.text);
              setActiveThought(`Alex speaking: "${data.text.substring(0, 80)}${data.text.length > 80 ? '...' : ''}"`);
            } else {
              // Utterance complete — finalize into transcript
              setLiveAgentText('');
              setTranscript(prev => {
                // Only append if this exact text isn't already the last agent bubble
                const last = prev[prev.length - 1];
                if (last && last.speaker === 'agent' && last.content === data.text) {
                  return prev; // Already there
                }
                return [...prev, {
                  speaker: 'agent',
                  content: data.text,
                  timestamp: new Date().toISOString()
                }];
              });
              setActiveThought('Alex is listening...');
            }

            // Auto-detect which deal the agent is talking about and update spotlight
            setFocusList(currentFocusList => {
              const agentText = data.text.toLowerCase();
              for (let i = 0; i < currentFocusList.length; i++) {
                const dealName = currentFocusList[i].dealname?.toLowerCase();
                if (dealName && agentText.includes(dealName)) {
                  setCurrentDealIndex(i);
                  break;
                }
              }
              return currentFocusList;
            });
            break;

          case 'speaking_user':
            // User spoke — finalize any pending agent text first, then add user bubble
            setLiveAgentText('');
            setTranscript(prev => {
              const last = prev[prev.length - 1];
              if (last && last.speaker === 'user' && last.content === data.text) {
                return prev; // Already there
              }
              return [...prev, {
                speaker: 'user',
                content: data.text,
                timestamp: new Date().toISOString()
              }];
            });
            break;

          case 'action_queued':
            // Add a recommended CRM action to decisions list
            setDecisions(prev => {
              // Avoid duplicates
              if (prev.some(a => a.id === data.id)) return prev;
              return [...prev, data];
            });
            break;

          case 'action_executing':
            setDecisions(prev => prev.map(a => a.id === data.actionId ? { ...a, status: 'executing' } : a));
            setExecutionProgress(prev => ({ ...prev, current: `Updating ${data.dealName}...` }));
            break;

          case 'action_complete':
            setDecisions(prev => prev.map(a => a.id === data.actionId ? { ...a, status: data.status, result: data.result || data.error } : a));
            setExecutionProgress(prev => {
              const completedCount = prev.completed + 1;
              return {
                ...prev,
                completed: completedCount,
                current: completedCount === prev.total ? 'All updates completed!' : prev.current
              };
            });
            break;

          case 'call_ended':
            // WebSocket server signaled call ended — transition to review
            setCallStatus('ended');
            setAppState('review');
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
            if (volumeSimulationRef.current) clearInterval(volumeSimulationRef.current);
            break;
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = (e) => {
      console.warn('SSE disconnected. Reconnecting...');
    };

    // Load initial focus list
    fetchFocusList();

    return () => {
      eventSource.close();
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (volumeSimulationRef.current) clearInterval(volumeSimulationRef.current);
    };
  }, []);

  // 2. Fetch focus list from SQLite DB
  const fetchFocusList = async () => {
    try {
      const res = await fetch('/api/crm/focus-list');
      const data = await res.json();
      if (data.success) {
        setFocusList(data.focusList);
      }
    } catch (e) {
      console.error('Failed to load focus list:', e);
    }
  };

  // 2a. Auto-detect completed operations if SSE events were missed
  useEffect(() => {
    // If we have deals but sync is still 'syncing', the SSE must have dropped
    if (focusList.length > 0 && syncStatus === 'syncing') {
      console.log('Auto-detect: Sync completed (deals found, SSE likely dropped)');
      setSyncStatus('done');
      setSyncProgress({ progress: 100, status: 'Sync complete!' });
    }
    
    // If we have classified deals but classify is still 'classifying'
    const hasClassifications = focusList.some(d => d.classification !== null);
    if (hasClassifications && classifyStatus === 'classifying') {
      console.log('Auto-detect: Classification completed (classifications found)');
      setClassifyStatus('done');
      setClassifyProgress({ progress: 100, status: 'Classification complete!' });
    }
  }, [focusList, syncStatus, classifyStatus]);

  // 3. Setup commands
  const handleClear = async () => {
    setClearStatus('clearing');
    setClearProgress({ progress: 5, status: 'Checking for previous demo data...' });
    try {
      const res = await fetch('/api/demo/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setClearStatus('done');
        setClearProgress({ progress: 100, status: data.message || 'HubSpot cleared!' });
        // Reset downstream states
        setSeedStatus('idle');
        setSeedProgress({ progress: 0, status: '' });
        setSyncStatus('idle');
        setSyncProgress({ progress: 0, status: '' });
        setClassifyStatus('idle');
        setClassifyProgress({ progress: 0, status: '' });
        setFocusList([]);
        setTimeout(() => setClearStatus('idle'), 3000);
      }
    } catch (e) {
      setClearStatus('idle');
      setClearProgress({ progress: 0, status: e.message });
      alert('Clear failed: ' + e.message);
    }
  };

  const handleSeed = async () => {
    setSeedStatus('seeding');
    setSeedProgress({ progress: 10, status: 'Initializing demo dataset...' });
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSeedStatus('done');
        setSeedProgress({ progress: 100, status: 'Demo data seeded successfully!' });
        fetchFocusList();
        setTimeout(() => setSeedStatus('idle'), 3000);
      }
    } catch (e) {
      setSeedStatus('idle');
      setSeedProgress({ progress: 0, status: e.message });
      alert('Seeding failed: ' + e.message);
    }
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    setSyncProgress({ progress: 5, status: 'Initializing sync request...' });
    try {
      await fetch('/api/crm/sync', { method: 'POST' });
    } catch (e) {
      setSyncStatus('error');
      setSyncProgress({ progress: 0, status: e.message });
    }
  };

  const handleClassify = async () => {
    setClassifyStatus('classifying');
    setClassifyProgress({ progress: 10, status: 'Starting deal analytics...' });
    try {
      await fetch('/api/crm/classify', { method: 'POST' });
    } catch (e) {
      setClassifyStatus('error');
      setClassifyProgress({ progress: 0, status: e.message });
    }
  };

  // 4. Start voice call with Retell SDK
  const handleStartCall = async () => {
    // Ensure rep name is synced to shared file before Retell connects
    if (repName) {
      try {
        await fetch('/api/rep-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: repName })
        });
      } catch (e) {
        console.warn('Could not sync rep name before call:', e);
      }
    }

    setAppState('call');
    setCallStatus('connecting');
    setTranscript([]);
    setDecisions([]);
    setCallDuration(0);
    setCurrentDealIndex(0);

    try {
      const res = await fetch('/api/retell/web-call', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to start call');
      }

      setSessionId(data.call_id);

      // Dynamically import RetellWebClient to prevent server-side window errors
      const { RetellWebClient } = await import('retell-client-js-sdk');
      const client = new RetellWebClient();
      retellClientRef.current = client;

      client.on('call_started', () => {
        setCallStatus('active');
        console.log('Voice call actively connected.');
        startDurationTimer();
        startVolumeSimulation();
      });

      client.on('call_ended', () => {
        setCallStatus('ended');
        console.log('Voice call ended.');
        handleEndCall();
      });

      client.on('error', (err) => {
        console.error('Retell SDK error:', err);
        setCallStatus('active'); // Keep simulation running
        startDurationTimer();
        startVolumeSimulation();
      });

      await client.startCall({
        accessToken: data.access_token,
        sampleRate: 48000
      });

    } catch (err) {
      console.warn('Mic access / Retell credentials missing. Loading SIMULATED review call...', err);
      // Sensible Fallback Simulation for seamless demonstration
      setCallStatus('active');
      startDurationTimer();
      startVolumeSimulation();
      simulateMockVoiceSession();
    }
  };

  const handleEndCall = () => {
    if (retellClientRef.current) {
      try {
        retellClientRef.current.stopCall();
      } catch (e) {}
    }
    
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    if (volumeSimulationRef.current) clearInterval(volumeSimulationRef.current);
    
    setCallStatus('ended');
    
    // Save session data to localStorage for the email preview page
    try {
      localStorage.setItem('pipeline_pilot_last_session', JSON.stringify({
        sessionId,
        transcript,
        actions: decisions,
        callStats: {
          duration: callDuration,
          dealsReviewed: focusList.length,
          actionsDecided: decisions.length
        },
        repName,
        endedAt: new Date().toISOString()
      }));
    } catch (e) {}
    
    setTimeout(() => {
      setAppState('review');
    }, 1000);
  };

  const handleMuteToggle = () => {
    // Mute/unmute microphone
    setIsMuted(!isMuted);
    // In real Retell client, we toggle microhpone track:
    // retellClientRef.current?.toggleMute();
  };

  const startDurationTimer = () => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // Simulates waveform node peaks for aesthetics
  const startVolumeSimulation = () => {
    if (volumeSimulationRef.current) clearInterval(volumeSimulationRef.current);
    volumeSimulationRef.current = setInterval(() => {
      // Fluctuate volume based on speaking events
      const isSpeaking = Math.random() > 0.4;
      setVolume(isSpeaking ? Math.floor(Math.random() * 8) + 2 : 1);
    }, 120);
  };

  // Simulate rich local sales bot conversations if API credentials are mock
  const simulateMockVoiceSession = async () => {
    setSessionId('session_mock_' + Math.random().toString(36).substring(7));
    
    const sleep = (ms) => new Promise(r => r(2000));
    
    const rep = repName || 'Elon Gates';
    // Greeting with rapport building
    const greetingText = `Hey ${rep}! How did your day go? Any funny moments, shout-outs from the team, or concerns you want to raise before we jump into the pipeline?`;
    
    setActiveThought("Welcoming Senthil and building rapport...");
    setTranscript([{ speaker: 'agent', content: greetingText, timestamp: new Date().toISOString() }]);

    // Senthil shares about his day
    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'user', content: `Hey Alex! Day was good actually. Had a hilarious moment in standup where the intern tried to demo the feature upside down. Team is buzzing about the new release. No major concerns, just the usual pipeline stress.`, timestamp: new Date().toISOString() }]);
    }, 3500);

    // Alex acknowledges and transitions
    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'agent', content: 'Haha, upside down demo? That\'s classic! Love the energy. Okay, whenever you\'re ready, let\'s get your pipeline sorted. We have deals to review today.', timestamp: new Date().toISOString() }]);
    }, 6000);

    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'user', content: 'Ready! Let\'s dive in.', timestamp: new Date().toISOString() }]);
    }, 8500);

    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'agent', content: `Awesome, thanks for sharing! Let's get your pipeline sorted. We have ${focusList.length || 4} deals to review today, including some that need attention. Let's start with the most urgent: TechCorp Enterprise.`, timestamp: new Date().toISOString() }]);
      setCurrentDealIndex(0);
    }, 10500);

    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'user', content: 'Yes, what is the status of TechCorp?', timestamp: new Date().toISOString() }]);
    }, 17000);

    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'agent', content: 'TechCorp Enterprise has been in Qualified to Buy for 12 days. The client is waiting on integration docs. I recommend logging a risk flag and following up.', timestamp: new Date().toISOString() }]);
      
      const actId = 'act_mock_1';
      setDecisions(prev => [...prev, {
        id: actId,
        deal_id: 'd1',
        deal_name: 'TechCorp Enterprise Platform',
        action_type: 'crm_flag_risk',
        params: { note_text: 'Flagging risk due to 12 days stale in Qualified to Buy.' },
        rationale: 'Stale 12 days in stage',
        status: 'pending'
      }]);
    }, 21000);

    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'user', content: 'Makes sense. Queue that up. What about Acme Industries?', timestamp: new Date().toISOString() }]);
      setCurrentDealIndex(1);
    }, 26000);

    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'agent', content: 'Acme Industries Data Suite is in Contract Sent. Marcus has concerns about the data residency clause. Shall we add a CRM note regarding this?', timestamp: new Date().toISOString() }]);
      
      const actId = 'act_mock_2';
      setDecisions(prev => [...prev, {
        id: actId,
        deal_id: 'd2',
        deal_name: 'Acme Industries Data Suite',
        action_type: 'crm_note',
        params: { note_text: 'Marcus Johnson flagged concerns about data residency clause in legal review.' },
        rationale: 'Capture contract blocker',
        status: 'pending'
      }]);
    }, 30000);

    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'user', content: 'Yes, add the note. Also, if they sign, let\'s advance it.', timestamp: new Date().toISOString() }]);
    }, 35000);

    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'agent', content: 'Perfect. I\'ve added the note. I will also queue a stage move to Closed Won so we are ready once they sign.', timestamp: new Date().toISOString() }]);
      const actId = 'act_mock_3';
      setDecisions(prev => [...prev, {
        id: actId,
        deal_id: 'd2',
        deal_name: 'Acme Industries Data Suite',
        action_type: 'crm_stage_move',
        params: { target_stage: 'closedwon' },
        rationale: 'Advance once contract is cleared',
        status: 'pending'
      }]);
    }, 38000);

    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'user', content: 'Excellent, let\'s wrap up.', timestamp: new Date().toISOString() }]);
    }, 43000);

    setTimeout(() => {
      setTranscript(prev => [...prev, { speaker: 'agent', content: `Great session today, ${rep}. You crushed it. I've queued 3 CRM updates and we covered the pipeline. Talk to you tomorrow!`, timestamp: new Date().toISOString() }]);
    }, 46500);
  };

  // 5. Execute all queued CRM actions
  const handleExecuteAllActions = async () => {
    setExecutionProgress({ total: decisions.length, completed: 0, current: 'Starting HubSpot executions...' });
    
    try {
      const res = await fetch('/api/crm/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error);
      }
    } catch (e) {
      alert('Failed to execute actions: ' + e.message);
      // Simulation fallback for mock mode
      setExecutionProgress({ total: decisions.length, completed: 0, current: 'Mock Execution Starting...' });
      for (let i = 0; i < decisions.length; i++) {
        const action = decisions[i];
        setDecisions(prev => prev.map(a => a.id === action.id ? { ...a, status: 'executing' } : a));
        await new Promise(r => setTimeout(r, 1200));
        setDecisions(prev => prev.map(a => a.id === action.id ? { ...a, status: 'completed', result: 'Successfully synced to mock HubSpot' } : a));
        setExecutionProgress(prev => ({
          ...prev,
          completed: i + 1,
          current: `Updated ${action.deal_name}`
        }));
      }
      setExecutionProgress(prev => ({ ...prev, current: 'All mock updates completed!' }));
    }
  };

  // 6. Remove a queued action
  const handleRemoveAction = async (actionId) => {
    try {
      const res = await fetch(`/api/crm/actions?actionId=${actionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDecisions(prev => prev.filter(a => a.id !== actionId));
      }
    } catch (e) {
      // Fallback local deletion
      setDecisions(prev => prev.filter(a => a.id !== actionId));
    }
  };

  const handleNewSession = () => {
    setAppState('setup');
    setTranscript([]);
    setDecisions([]);
    setCallDuration(0);
    fetchFocusList();
  };

  const isPipelineReady = focusList.length > 0 && classifyStatus === 'done';
  const completedSteps = [
    repName,
    clearStatus === 'done',
    seedStatus === 'done',
    syncStatus === 'done',
    classifyStatus === 'done'
  ].filter(Boolean).length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: 'var(--bg-deepest)',
      backgroundImage: 'radial-gradient(circle at 50% -20%, #171b30 0%, #05070c 80%)'
    }}>
      
      {/* Rep Onboarding — first-time name/email capture */}
      <RepOnboarding
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      {/* Setup Modal - Pops up initially */}
      <SetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onStartCall={handleStartCall}
        syncStatus={syncStatus}
        syncProgress={syncProgress}
        classifyStatus={classifyStatus}
        classifyProgress={classifyProgress}
        seedStatus={seedStatus}
        seedProgress={seedProgress}
        clearStatus={clearStatus}
        clearProgress={clearProgress}
        focusList={focusList}
        onSeed={handleSeed}
        onSync={handleSync}
        onClassify={handleClassify}
        onClear={handleClear}
        repName={repName}
        onRepChange={handleRepChange}
      />
      
      {/* Top Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 32px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'rgba(5, 7, 12, 0.4)',
        backdropFilter: 'blur(10px)',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#000000',
            boxShadow: '0 0 15px rgba(245, 166, 35, 0.4)'
          }}>⚡</div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              Pipeline Pilot
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AI-Driven Sales Operations Assistant</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Environment Status Indicators */}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
            <span>CRM: <b style={{ color: 'var(--healthy)' }}>HubSpot Connected</b></span>
            <span>LLM: <b style={{ color: 'var(--accent-primary)', textTransform: 'uppercase' }}>{process.env.NEXT_PUBLIC_LLM_PROVIDER || 'openai'} API</b></span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div style={{
        flex: 1,
        padding: '24px 32px 70px 32px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {appState === 'setup' && (
          <SetupView
            onStartCall={handleStartCall}
            syncStatus={syncStatus}
            syncProgress={syncProgress}
            classifyStatus={classifyStatus}
            classifyProgress={classifyProgress}
            seedStatus={seedStatus}
            focusList={focusList}
            onSeed={handleSeed}
            onSync={handleSync}
            onClassify={handleClassify}
            repName={repName || 'Elon Gates'}
          />
        )}

        {appState === 'call' && (
          <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '24px', flex: 1 }}>
            <VoicePanel
              callStatus={callStatus}
              currentDeal={focusList[currentDealIndex]}
              dealQueue={focusList}
              currentDealIndex={currentDealIndex}
              onEndCall={handleEndCall}
              onMuteToggle={handleMuteToggle}
              isMuted={isMuted}
              callDuration={callDuration}
              volume={volume}
            />
            <CallPulsePanel
              transcript={transcript}
              liveAgentText={liveAgentText}
              callStatus={callStatus}
              callDuration={callDuration}
              currentDealName={focusList[currentDealIndex]?.dealname}
              focusList={focusList}
            />
          </div>
        )}

        {appState === 'review' && (
          <PostCallReview
            transcript={transcript}
            actions={decisions}
            onExecuteAll={handleExecuteAllActions}
            onRemoveAction={handleRemoveAction}
            executionProgress={executionProgress}
            callStats={{
              duration: callDuration,
              dealsReviewed: focusList.length,
              actionsDecided: decisions.length
            }}
            onNewSession={handleNewSession}
            repName={repName || 'Elon Gates'}
          />
        )}
      </div>

      {/* Compact Bottom Bar - Data Loader Control */}
      {appState === 'setup' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 32px',
          background: 'rgba(22, 27, 46, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          zIndex: 90,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Pipeline Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isPipelineReady ? 'var(--healthy)' : 'var(--attention)',
                boxShadow: isPipelineReady ? '0 0 8px var(--healthy)' : '0 0 8px var(--attention)'
              }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {isPipelineReady ? '✅ Pipeline Ready' : '⚡ Setup in Progress'}
              </span>
            </div>
            
            {/* Stats */}
            {focusList.length > 0 && (
              <div style={{ 
                fontSize: '0.8rem', 
                color: 'var(--text-secondary)',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                paddingLeft: '16px',
                display: 'flex',
                gap: '12px'
              }}>
                <span>{focusList.length} deals</span>
                <span>{focusList.filter(d => d.classification?.priority >= 4).length} urgent</span>
                <span>{completedSteps}/5 steps done</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Quick status indicators */}
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
              {seedStatus === 'done' && (
                <span style={{ color: 'var(--healthy)', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                  🌱 Demo
                </span>
              )}
              {syncStatus === 'done' && (
                <span style={{ color: 'var(--healthy)', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                  🔄 CRM
                </span>
              )}
              {classifyStatus === 'done' && (
                <span style={{ color: 'var(--healthy)', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                  🧠 AI
                </span>
              )}
            </div>

            {/* Run Next Demo Button */}
            <button
              className="btn-glass"
              onClick={() => setShowSetupModal(true)}
              style={{ 
                fontSize: '0.85rem', 
                padding: '8px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🔄 Run Next Demo
            </button>
          </div>
        </div>
      )}

      {/* Persistent Bottom AI Thought Ticker during call state */}
      {appState === 'call' && (
        <ThoughtTicker thoughts={llmThoughts} activeThought={activeThought} />
      )}
    </div>
  );
}
