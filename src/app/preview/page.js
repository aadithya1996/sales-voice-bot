'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buildEmailHtml, buildEmailText } from '@/lib/email-templates';

export default function EmailPreviewPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState(null);
  const [managerEmail, setManagerEmail] = useState('');
  const [showTextVersion, setShowTextVersion] = useState(false);
  const [copyStatus, setCopyStatus] = useState('idle'); // idle | copied
  const [downloadStatus, setDownloadStatus] = useState('idle'); // idle | downloaded
  const [isLoaded, setIsLoaded] = useState(false);

  // Load session data from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pipeline_pilot_last_session');
      if (raw) {
        const data = JSON.parse(raw);
        setSessionData(data);
      }
    } catch (e) {
      console.error('Failed to load session data:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  if (!isLoaded) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>Loading session data...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div style={styles.container}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem' }}>📭</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>No Session Data Found</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.5 }}>
            Complete a voice call first to generate a summary preview.
            After your call ends, this page will show the email summary automatically.
          </p>
          <button
            className="btn-primary"
            onClick={() => router.push('/')}
            style={{ padding: '12px 28px', fontSize: '0.95rem', marginTop: '8px' }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { transcript, actions, callStats, repName } = sessionData;

  const summary = {
    dealsDiscussed: extractDealsDiscussed(transcript, actions),
    rapport: transcript?.some(t =>
      t.speaker === 'user' &&
      (t.content?.toLowerCase().includes('day') ||
       t.content?.toLowerCase().includes('team') ||
       t.content?.toLowerCase().includes('funny'))
    ) || false
  };

  const duration = callStats?.duration
    ? `${Math.floor(callStats.duration / 60)}m ${callStats.duration % 60}s`
    : 'N/A';

  const completedActions = (actions || []).filter(a => a.status === 'completed');
  const pendingActions = (actions || []).filter(a => a.status === 'pending');

  const subject = `${repName || 'Sales Rep'} reviewed ${summary.dealsDiscussed.length} deals · ${actions?.length || 0} actions queued · Pipeline Pilot`;

  const emailHtml = buildEmailHtml({
    subject,
    dealsDiscussed: summary.dealsDiscussed,
    actionsList: actions || [],
    completedActions,
    pendingActions,
    callStats,
    summary,
    repName
  });

  const emailText = buildEmailText({
    subject,
    dealsDiscussed: summary.dealsDiscussed,
    actionsList: actions || [],
    completedActions,
    pendingActions,
    callStats,
    summary,
    repName
  });

  // Build mailto link with pre-filled subject and body
  const mailtoHref = useMailtoLink(managerEmail, subject, emailText);

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(emailHtml);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (e) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = emailHtml;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([emailHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-pilot-summary-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadStatus('downloaded');
    setTimeout(() => setDownloadStatus('idle'), 2000);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📧 Email Preview</h1>
          <p style={styles.subtitle}>
            Review how the summary will look before sending to your manager.
          </p>
        </div>
        <button style={styles.closeBtn} onClick={() => router.push('/')}>
          ✕ Close Preview
        </button>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>To</label>
          <input
            type="email"
            value={managerEmail}
            onChange={(e) => setManagerEmail(e.target.value)}
            placeholder="manager@company.com"
            style={styles.input}
          />
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label}>Subject</label>
          <input
            type="text"
            value={subject}
            readOnly
            style={{ ...styles.input, background: 'rgba(255,255,255,0.03)', cursor: 'not-allowed' }}
          />
        </div>

        <div style={styles.toggleRow}>
          <button
            style={showTextVersion ? styles.toggleBtnInactive : styles.toggleBtnActive}
            onClick={() => setShowTextVersion(false)}
          >
            📄 HTML Version
          </button>
          <button
            style={showTextVersion ? styles.toggleBtnActive : styles.toggleBtnInactive}
            onClick={() => setShowTextVersion(true)}
          >
            📝 Text Version
          </button>
        </div>
      </div>

      {/* Preview */}
      <div style={styles.previewFrame}>
        {showTextVersion ? (
          <pre style={styles.textPreview}>{emailText}</pre>
        ) : (
          <div
            style={styles.htmlPreview}
            dangerouslySetInnerHTML={{ __html: emailHtml }}
          />
        )}
      </div>

      {/* Footer Actions */}
      <div style={styles.footer}>
        <div style={styles.footerButtons}>
          <button style={styles.secondaryBtn} onClick={() => router.push('/')}>
            ← Back to Review
          </button>

          <div style={styles.actionGroup}>
            <button
              style={copyStatus === 'copied' ? styles.successBtn : styles.secondaryBtn}
              onClick={handleCopyHtml}
              title="Copy HTML to clipboard for pasting into Gmail, Outlook, etc."
            >
              {copyStatus === 'copied' ? '✅ Copied!' : '📋 Copy HTML'}
            </button>

            <button
              style={downloadStatus === 'downloaded' ? styles.successBtn : styles.secondaryBtn}
              onClick={handleDownloadHtml}
              title="Download as .html file"
            >
              {downloadStatus === 'downloaded' ? '✅ Saved!' : '💾 Download .html'}
            </button>

            <a
              href={mailtoHref}
              style={styles.sendBtn}
              onClick={(e) => {
                if (!managerEmail || !managerEmail.includes('@')) {
                  e.preventDefault();
                  alert('Please enter a valid manager email address');
                }
              }}
              title="Opens your default email app with pre-filled content"
            >
              📨 Open in Mail App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Build a mailto: link with pre-filled subject and body
function useMailtoLink(to, subject, body) {
  const params = new URLSearchParams();
  if (to) params.set('to', to);
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  return `mailto:${to || ''}?${params.toString()}`;
}

// Extract deals discussed from transcript + actions
function extractDealsDiscussed(transcript, actions) {
  const deals = new Set();
  // From actions (most reliable)
  (actions || []).forEach(a => {
    if (a.deal_name) deals.add(a.deal_name);
  });
  // From transcript (fallback)
  (transcript || []).forEach(t => {
    if (t.speaker === 'agent') {
      const text = t.content?.toLowerCase() || '';
      if (text.includes('data')) deals.add('DataGuard - ByteSync');
      if (text.includes('scale')) deals.add('ScaleManager - TechToScale');
      if (text.includes('ai')) deals.add('AI Suite - Veritech');
      if (text.includes('cloud')) deals.add('CloudOptimize - CloudPort');
    }
  });
  return Array.from(deals);
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#05070c',
    backgroundImage: 'radial-gradient(circle at 50% -20%, #171b30 0%, #05070c 80%)',
    color: '#e2e8f0',
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(245, 166, 35, 0.2)',
    borderTop: '3px solid #f5a623',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    margin: 0,
    fontFamily: 'var(--font-heading)'
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    marginTop: '4px'
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '20px'
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.25)',
    color: '#e2e8f0',
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%',
    maxWidth: '400px'
  },
  toggleRow: {
    display: 'flex',
    gap: '8px'
  },
  toggleBtnActive: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #f5a623',
    background: 'rgba(245, 166, 35, 0.1)',
    color: '#f5a623',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  toggleBtnInactive: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: '0.85rem',
    cursor: 'pointer'
  },
  previewFrame: {
    flex: 1,
    background: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    minHeight: '400px'
  },
  htmlPreview: {
    width: '100%',
    height: '100%',
    minHeight: '400px',
    overflow: 'auto'
  },
  textPreview: {
    margin: 0,
    padding: '24px',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    color: '#333',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    maxHeight: '600px',
    overflow: 'auto'
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.08)'
  },
  footerButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  actionGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  secondaryBtn: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: '0.9rem',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  sendBtn: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #f5a623 0%, #d97706 100%)',
    color: '#000',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(245, 166, 35, 0.3)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  successBtn: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    fontSize: '0.9rem',
    cursor: 'default',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  }
};
