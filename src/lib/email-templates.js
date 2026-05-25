// Email Template Builder for Pipeline Pilot
// Shared between preview page and API route

export function buildEmailHtml({ subject, dealsDiscussed, actionsList, completedActions, pendingActions, callStats, summary, repName }) {
  const duration = callStats?.duration
    ? `${Math.floor(callStats.duration / 60)}m ${callStats.duration % 60}s`
    : 'N/A';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const statsRow = `
    <tr>
      <td style="padding:0 0 32px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td width="32%" style="background:#fafafa;border-radius:12px;padding:20px 8px;text-align:center;vertical-align:top;">
              <p style="font-size:26px;font-weight:800;color:#d97706;margin:0;letter-spacing:-0.02em;">${duration}</p>
              <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin:6px 0 0;font-weight:600;">Duration</p>
            </td>
            <td width="2%">&nbsp;</td>
            <td width="32%" style="background:#fafafa;border-radius:12px;padding:20px 8px;text-align:center;vertical-align:top;">
              <p style="font-size:26px;font-weight:800;color:#d97706;margin:0;letter-spacing:-0.02em;">${dealsDiscussed.length}</p>
              <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin:6px 0 0;font-weight:600;">Deals Reviewed</p>
            </td>
            <td width="2%">&nbsp;</td>
            <td width="32%" style="background:#fafafa;border-radius:12px;padding:20px 8px;text-align:center;vertical-align:top;">
              <p style="font-size:26px;font-weight:800;color:#d97706;margin:0;letter-spacing:-0.02em;">${actionsList.length}</p>
              <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin:6px 0 0;font-weight:600;">Actions Queued</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const dealsSection = dealsDiscussed.length > 0
    ? dealsDiscussed.map((d, idx) => {
        const borderColor = idx === 0 ? '#ef4444' : idx === 1 ? '#f97316' : idx === 2 ? '#f5a623' : '#94a3b8';
        return `
          <tr>
            <td style="padding:0 0 10px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background:#ffffff;border:1px solid #eaeaea;border-radius:10px;padding:14px 18px;border-left:4px solid ${borderColor};">
                    <p style="font-size:14px;font-weight:700;color:#1a1a2e;margin:0;">${d}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
      }).join('')
    : `<tr><td style="padding:14px 0;color:#999;font-size:14px;">No deals were discussed</td></tr>`;

  const actionItems = actionsList.length > 0
    ? (() => {
        // Group actions by deal name
        const byDeal = {};
        actionsList.forEach(a => {
          const deal = a.deal_name || 'Unnamed Deal';
          if (!byDeal[deal]) byDeal[deal] = [];
          byDeal[deal].push(a);
        });
        return Object.entries(byDeal).map(([dealName, dealActions]) => {
          const actionCards = dealActions.map(a => {
            const statusIcon = a.status === 'completed' ? '✅' : '⏳';
            const statusColor = a.status === 'completed' ? '#10b981' : '#f59e0b';
            const statusBg = a.status === 'completed' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)';
            const statusBorder = a.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)';
            const typeLabel = (a.action_type || 'crm_note').replace('crm_', '').replace(/_/g, ' ').toUpperCase();
            const detail = a.params?.note_text
              ? `<p style="font-size:12px;color:#888;margin:6px 0 0 0;font-style:italic;line-height:1.5;">&ldquo;${escapeHtml(a.params.note_text)}&rdquo;</p>`
              : a.params?.target_stage
                ? `<p style="font-size:12px;color:#888;margin:6px 0 0 0;line-height:1.5;">Target stage: <strong>${escapeHtml(a.params.target_stage)}</strong></p>`
                : '';
            return `
              <tr>
                <td style="padding:0 0 8px 0;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="background:#fafafa;border:1px solid #eaeaea;border-radius:8px;padding:10px 14px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="vertical-align:middle;">
                              <span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:3px 8px;border-radius:4px;">${typeLabel}</span>
                            </td>
                            <td align="right" style="vertical-align:middle;">
                              <span style="display:inline-block;background:${statusBg};color:${statusColor};font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;border:1px solid ${statusBorder};">${statusIcon} ${a.status === 'completed' ? 'Synced' : 'Pending'}</span>
                            </td>
                          </tr>
                        </table>
                        ${detail}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;
          }).join('');
          return `
            <tr>
              <td style="padding:0 0 16px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="background:#ffffff;border:1px solid #eaeaea;border-radius:10px;padding:16px 18px;">
                      <p style="font-size:14px;font-weight:700;color:#1a1a2e;margin:0 0 10px 0;line-height:1.4;">🏢 ${dealName}</p>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        ${actionCards}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
        }).join('');
      })()
    : `<tr><td style="padding:14px 0;color:#999;font-size:14px;">No actions were queued.</td></tr>`;

  const syncBanner = `
    <tr>
      <td style="padding:0 0 32px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="background:${pendingActions.length === 0 ? '#f0fdf4' : '#fffbeb'};border:1px solid ${pendingActions.length === 0 ? '#bbf7d0' : '#fcd34d'};border-radius:10px;padding:18px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td width="36" style="vertical-align:top;padding:2px 0 0 0;">
                    <span style="font-size:22px;">${pendingActions.length === 0 ? '✅' : '⏳'}</span>
                  </td>
                  <td style="vertical-align:top;">
                    <p style="font-size:15px;font-weight:700;color:${pendingActions.length === 0 ? '#15803d' : '#92400e'};margin:0 0 4px 0;">
                      ${completedActions.length} of ${actionsList.length} actions written back to HubSpot
                    </p>
                    <p style="font-size:13px;color:${pendingActions.length === 0 ? '#22c55e' : '#b45309'};margin:0;line-height:1.5;">
                      ${pendingActions.length > 0
                        ? `${pendingActions.length} action(s) pending sync. Open Pipeline Pilot to finalize.`
                        : 'All queued actions have been successfully synced to your CRM.'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const rapportSection = summary?.rapport ? `
    <tr>
      <td style="padding:0 0 32px 0;">
        <p style="font-size:12px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px 0;">Team Pulse</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:16px 20px;">
              <p style="font-size:14px;color:#92400e;margin:0;line-height:1.6;">
                🌟 ${repName || 'Sales Rep'} shared team updates, shout-outs, and day highlights during the rapport check-in. Team morale appears positive.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .stats { display: block !important; }
      .stat { width: 100% !important; display: block !important; margin-bottom: 8px !important; }
      .mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr><td align="center" style="padding:24px 0;">
      <table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="620" style="max-width:620px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e 0%,#0f1020 100%);padding:36px 40px 32px 40px;" class="mobile-padding">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding:0 0 16px 0;">
                  <span style="display:inline-block;width:36px;height:36px;background:linear-gradient(135deg,#f5a623 0%,#d97706 100%);border-radius:8px;text-align:center;line-height:36px;font-size:18px;">⚡</span>
                </td>
              </tr>
              <tr>
                <td>
                  <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.02em;">Pipeline Pilot</h1>
                  <p style="color:rgba(255,255,255,0.65);font-size:14px;margin:6px 0 0 0;font-weight:500;">Daily Pipeline Review Summary</p>
                </td>
              </tr>
              <tr>
                <td style="padding-top:20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="background:rgba(245,166,35,0.12);border:1px solid rgba(245,166,35,0.25);border-radius:8px;padding:8px 14px;">
                        <p style="color:#f5a623;font-size:12px;font-weight:600;margin:0;">${repName || 'Sales Rep'} · ${today}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 40px 40px;" class="mobile-padding">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <!-- Stats -->
              ${statsRow}

              <!-- Deals Discussed -->
              <tr>
                <td style="padding:0 0 16px 0;">
                  <p style="font-size:12px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px 0;">Deals Discussed</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    ${dealsSection}
                  </table>
                </td>
              </tr>

              <!-- Actions Agreed -->
              <tr>
                <td style="padding:24px 0 16px 0;">
                  <p style="font-size:12px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px 0;">Actions Agreed</p>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    ${actionItems}
                  </table>
                </td>
              </tr>

              <!-- CRM Sync -->
              ${syncBanner}

              <!-- Team Pulse -->
              ${rapportSection}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;padding:24px 40px;border-top:1px solid #eaeaea;" class="mobile-padding">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="text-align:center;">
                  <p style="font-size:12px;color:#888;margin:0;font-weight:600;">Sent by <span style="color:#d97706;">Pipeline Pilot</span> AI Assistant</p>
                  <p style="font-size:11px;color:#aaa;margin:6px 0 0 0;">This is an automated summary of a daily pipeline review session.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildEmailText({ subject, dealsDiscussed, actionsList, completedActions, pendingActions, callStats, summary, repName }) {
  const duration = callStats?.duration
    ? `${Math.floor(callStats.duration / 60)}m ${callStats.duration % 60}s`
    : 'N/A';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const dealsText = dealsDiscussed.length > 0
    ? dealsDiscussed.map((d, i) => `${i + 1}. ${d}`).join('\n')
    : 'No deals were discussed.';

  const actionsText = actionsList.length > 0
    ? (() => {
        const byDeal = {};
        actionsList.forEach(a => {
          const deal = a.deal_name || 'Unnamed Deal';
          if (!byDeal[deal]) byDeal[deal] = [];
          byDeal[deal].push(a);
        });
        return Object.entries(byDeal).map(([dealName, dealActions]) => {
          const actionLines = dealActions.map(a => {
            const status = a.status === 'completed' ? '✅ SYNCED' : '⏳ PENDING';
            const typeLabel = (a.action_type || 'crm_note').replace('crm_', '').replace(/_/g, ' ').toUpperCase();
            const detail = a.params?.note_text
              ? `\n      Note: "${a.params.note_text}"`
              : a.params?.target_stage
                ? `\n      Target: ${a.params.target_stage}`
                : '';
            return `   • ${typeLabel} ${status}${detail}`;
          }).join('\n');
          return `🏢 ${dealName}\n${actionLines}`;
        }).join('\n\n');
      })()
    : 'No actions were queued.';

  return `PIPELINE PILOT — DAILY REVIEW SUMMARY
═════════════════════════════════════════

${repName || 'Sales Rep'} · ${today}

═════════════════════════════════════════
CALL STATS
═════════════════════════════════════════
Duration:        ${duration}
Deals Reviewed:  ${dealsDiscussed.length}
Actions Queued:  ${actionsList.length}
CRM Synced:      ${completedActions.length} / ${actionsList.length}

═════════════════════════════════════════
DEALS DISCUSSED
═════════════════════════════════════════
${dealsText}

═════════════════════════════════════════
ACTIONS AGREED
═════════════════════════════════════════
${actionsText}

═════════════════════════════════════════
CRM WRITE-BACK STATUS
═════════════════════════════════════════
${completedActions.length} of ${actionsList.length} actions written back to HubSpot.
${pendingActions.length > 0 ? `${pendingActions.length} action(s) still pending sync.` : 'All actions synced successfully.'}

${summary?.rapport ? `═════════════════════════════════════════
TEAM PULSE
═════════════════════════════════════════
${repName || 'Sales Rep'} shared team updates, shout-outs, and day highlights during the rapport check-in. Team morale appears positive.

` : ''}═════════════════════════════════════════
Sent by Pipeline Pilot AI Assistant
This is an automated summary of a daily pipeline review.
`;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
