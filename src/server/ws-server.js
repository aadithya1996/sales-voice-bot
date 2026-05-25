require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const db = require('../lib/database');
const llm = require('../lib/llm');
const thoughtEmitter = require('../lib/thought-emitter');
const fs = require('fs');
const path = require('path');

const PORT = process.env.WS_PORT || 8080;
const NEXTJS_URL = process.env.NEXTJS_URL || 'http://localhost:3000';
const BRIDGE_SECRET = process.env.BRIDGE_SECRET;

/**
 * Forward events from ws-server.js (standalone process) to Next.js app
 * so the Dashboard SSE subscribers receive them in real time.
 */
async function forwardEvent(type, data) {
  try {
    const res = await fetch(`${NEXTJS_URL}/api/events/forward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: BRIDGE_SECRET, type, data })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`Bridge forward failed (${res.status}):`, text.substring(0, 200));
    }
  } catch (err) {
    // Bridge is best-effort; don't crash the voice call
    console.warn('Bridge forward error:', err.message);
  }
}

/**
 * Dual emit: sends to local thought-emitter AND bridges to Next.js
 */
function emitToDashboard(type, data) {
  thoughtEmitter.emit(type, data);
  forwardEvent(type, data);
}

/**
 * Get the rep name from a shared file written by the Dashboard.
 * Since ws-server.js can't access browser localStorage, the Dashboard
 * writes rep name to a file in the project root on onboarding.
 */
function getRepName() {
  try {
    const repFile = path.join(process.cwd(), '.rep-config.json');
    if (fs.existsSync(repFile)) {
      const config = JSON.parse(fs.readFileSync(repFile, 'utf8'));
      if (config.name) return config.name;
    }
  } catch (e) {}
  return process.env.REP_NAME || 'Sales Rep';
}

/**
 * Helper to save transcript turns.
 * Writes to local SQLite as a fallback and POSTs to master Next.js app.
 */
async function saveTranscriptTurn(sessionId, speaker, content) {
  try {
    db.saveTranscriptTurn(sessionId, speaker, content);
  } catch (localErr) {
    console.error('Failed to write transcript turn to local DB:', localErr.message);
  }

  try {
    const res = await fetch(`${NEXTJS_URL}/api/crm/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': BRIDGE_SECRET
      },
      body: JSON.stringify({ sessionId, speaker, content })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`HTTP saveTranscriptTurn failed (${res.status}):`, text.substring(0, 200));
    }
  } catch (err) {
    console.error('Failed to send transcript turn to Next.js API:', err.message);
  }
}

/**
 * Helper to queue CRM actions.
 * Writes to local SQLite as a fallback and POSTs to master Next.js app.
 */
async function queueAction(sessionId, dealId, dealName, actionType, params, rationale) {
  let actionId = null;
  try {
    actionId = db.queueAction(sessionId, dealId, dealName, actionType, params, rationale);
  } catch (localErr) {
    console.error('Failed to queue action in local DB:', localErr.message);
  }

  try {
    const res = await fetch(`${NEXTJS_URL}/api/crm/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': BRIDGE_SECRET
      },
      body: JSON.stringify({
        sessionId,
        dealId,
        dealName,
        actionType,
        params,
        rationale
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.actionId) {
        console.log(`Action successfully queued in Next.js. Remote ID: ${data.actionId}`);
        if (!actionId) {
          actionId = data.actionId;
        }
      } else {
        console.warn('Next.js API queueAction returned success: false', data);
      }
    } else {
      const text = await res.text().catch(() => '');
      console.warn(`HTTP queueAction failed (${res.status}):`, text.substring(0, 200));
    }
  } catch (err) {
    console.error('Failed to send queueAction to Next.js API:', err.message);
  }

  return actionId || require('crypto').randomUUID();
}

function startWebSocketServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  app.get('/health', (req, res) => {
    res.send({ status: 'ok', provider: llm.provider, isMock: llm.isMock });
  });

  wss.on('connection', async (ws, req) => {
    // Extract call_id from path: /llm-websocket/:call_id
    const urlParts = req.url.split('/');
    const callId = urlParts[urlParts.length - 1] || 'default_session';
    
    console.log(`Retell Custom LLM: Connected for Call ID/Session ID: ${callId}`);
    emitToDashboard('thinking', { text: 'Preparing today\'s pipeline review focus list...' });

    // 1. Fetch classified focus list from Next.js or local SQLite database
    let focusList = [];
    try {
      console.log(`Fetching focus list from Next.js API: ${NEXTJS_URL}/api/crm/focus-list`);
      const response = await fetch(`${NEXTJS_URL}/api/crm/focus-list`, {
        headers: {
          'x-bridge-secret': BRIDGE_SECRET
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.focusList)) {
          focusList = data.focusList;
          console.log(`Successfully fetched ${focusList.length} deals from Next.js API.`);
        } else {
          console.warn('Next.js API returned unsuccessful or invalid focus list:', data);
          focusList = db.getClassifiedDeals();
        }
      } else {
        console.warn(`Next.js API responded with status ${response.status}. Falling back to local database.`);
        focusList = db.getClassifiedDeals();
      }
    } catch (e) {
      console.error('Failed to fetch focus list from Next.js API. Falling back to local database:', e.message);
      try {
        focusList = db.getClassifiedDeals();
      } catch (localErr) {
        console.error('Error loading focus list from local DB:', localErr);
      }
    }

    const urgentCount = focusList.filter(d => d.classification?.priority >= 4).length;
    const winsCount = focusList.filter(d => d.classification?.category === 'CELEBRATE').length;

    // 2. Prepare system prompt with injected JSON data
    const focusListJson = JSON.stringify(
      focusList.map(d => ({
        id: d.id,
        dealname: d.dealname,
        amount: d.amount,
        stage: d.stage_label,
        days_in_stage: d.days_in_stage,
        contact: d.contact ? `${d.contact.firstname} ${d.contact.lastname} (${d.contact.company})` : 'None',
        priority: d.classification?.priority || 2,
        category: d.classification?.category || 'NOTE_NEEDED',
        reasoning: d.classification?.reasoning || '',
        recommended_actions: d.classification?.recommended_actions || []
      })),
      null,
      2
    );

    const repName = getRepName();
    const systemPrompt = `You are Alex, an AI sales operations assistant. You're ${repName}'s personal morning pipeline review partner.

TODAY'S FOCUS LIST:
${focusListJson}

SUMMARY STATS FOR REVIEW:
- Total deals: ${focusList.length}
- Urgent cases (Priority 4-5): ${urgentCount}
- Recent Closed Won wins to celebrate: ${winsCount}

BEHAVIOR RULES:
1. OPENING GREETING (MANDATORY): Start with energy and empathy. Say "Hey ${repName}!" enthusiastically. Then ask genuinely: "How did your day go? Any funny moments, shout-outs from the team, or concerns you want to raise before we jump into the pipeline?" LISTEN to their response. Acknowledge what they share — celebrate wins, empathize with frustrations, laugh at funny moments. This rapport-building is CRITICAL. Only move to deals after they've shared.

2. Once they say they're ready, transition smoothly: "Awesome, thanks for sharing! Let's get your pipeline sorted. We have ${focusList.length} deals to review today, including ${urgentCount} that need immediate attention."

3. Walk through each priority deal one at a time, starting with the most urgent (highest priority).
4. Explain WHY it needs attention using the reasoning from the classification.
5. Suggest specific CRM actions (stage moves, adding notes, or flagging risks).
6. When the rep agrees to an action, confirm it: "Got it, I'll queue that action for after our call."
7. If the rep disagrees or wants to skip, move on gracefully.
8. Be conversational, concise, and actionable — like a sharp colleague and trusted teammate, not a robot. KEEP responses relatively short (2-3 sentences max) so they sound natural in audio.
9. If there are wins (category: 'CELEBRATE'), make sure to celebrate them with the rep.
10. When done reviewing all focus deals, ask if there is anything else before finishing.
11. CLOSING: End with encouragement. "Great session today, ${repName}. You crushed it. Talk to you tomorrow!"

CRITICAL: When you decide to queue an action, you MUST output it in your response between [ACTION] and [/ACTION] tags. 
Supported Action Formats:
- Stage move: [ACTION]{"type":"crm_stage_move","deal_id":"DEAL_ID","deal_name":"DEAL_NAME","params":{"target_stage":"STAGE_ID"},"rationale":"RATIONALE"}[/ACTION]
- Add note: [ACTION]{"type":"crm_note","deal_id":"DEAL_ID","deal_name":"DEAL_NAME","params":{"note_text":"NOTE_BODY"},"rationale":"RATIONALE"}[/ACTION]
- Flag risk: [ACTION]{"type":"crm_flag_risk","deal_id":"DEAL_ID","deal_name":"DEAL_NAME","params":{"note_text":"RISK_DESCRIPTION"},"rationale":"RATIONALE"}[/ACTION]

Only output actions after the rep explicitly agrees or when you recommend it and assume consent based on the conversation context.`;

    const conversationHistory = [
      { role: 'system', content: systemPrompt }
    ];

    // Send first response (greetings)
    let firstGreetingText = `Hey ${repName}! How did your day go? Any funny moments, shout-outs from the team, or concerns you want to raise before we jump into the pipeline?`;
    
    // In mock mode, if we don't have records, give a friendly default
    if (focusList.length === 0) {
      firstGreetingText = `Hey ${repName}! Welcome back. It looks like you haven't synchronized your CRM database yet. Go ahead and click 'Sync CRM' in the dashboard, and I'll build your focus list.`;
    }

    conversationHistory.push({ role: 'assistant', content: firstGreetingText });
    
    ws.send(JSON.stringify({
      response_id: 1,
      content: firstGreetingText,
      content_complete: true,
      end_of_call: false
    }));

    emitToDashboard('speaking', { text: firstGreetingText, isPartial: false });
    await saveTranscriptTurn(callId, 'agent', firstGreetingText);

    // Handle messages from Retell
    ws.on('message', async (messageData) => {
      try {
        const message = JSON.parse(messageData);
        // console.log('Retell WebSocket received:', message);

        if (message.interaction_type === 'ping_pong') {
          ws.send(JSON.stringify({
            response_type: 'ping_pong',
            timestamp: message.timestamp
          }));
          return;
        }

        if (message.interaction_type === 'update_only') {
          // Live transcript update from user speaking
          const userTranscript = message.transcript?.[message.transcript.length - 1]?.content;
          if (userTranscript) {
            emitToDashboard('speaking_user', { text: userTranscript });
            await saveTranscriptTurn(callId, 'user', userTranscript);
          }
          return;
        }

        if (message.interaction_type === 'response_required') {
          // User finished speaking. We must compile history and generate response
          const transcriptHistory = message.transcript || [];
          
          // Re-align history
          const formattedHistory = [
            { role: 'system', content: systemPrompt }
          ];

          transcriptHistory.forEach(turn => {
            formattedHistory.push({
              role: turn.speaker === 'agent' ? 'assistant' : 'user',
              content: turn.content
            });
          });

          emitToDashboard('thinking', { text: 'Analyzing response...' });

          let currentResponseText = '';
          let pendingActionBuffer = '';
          let isInsideActionTag = false;
          let responseId = message.response_id;

          try {
            await llm.streamChatResponse(formattedHistory, async (chunk) => {
              let textToOutput = '';

              // Buffer and parse [ACTION] tags so we don't stream raw JSON tags to the speaker
              for (let char of chunk) {
                pendingActionBuffer += char;

                if (!isInsideActionTag) {
                  // Look for [ACTION] tag start
                  const startTagIndex = pendingActionBuffer.indexOf('[ACTION]');
                  if (startTagIndex !== -1) {
                    // Send everything up to [ACTION]
                    textToOutput += pendingActionBuffer.substring(0, startTagIndex);
                    pendingActionBuffer = pendingActionBuffer.substring(startTagIndex);
                    isInsideActionTag = true;
                  } else {
                    // Check if we are partially matching '[ACTION]'
                    const matchProgress = '[ACTION]'.startsWith(pendingActionBuffer);
                    if (!matchProgress) {
                      textToOutput += pendingActionBuffer;
                      pendingActionBuffer = '';
                    }
                  }
                } else {
                  // Inside action tag, look for [/ACTION]
                  const endTagIndex = pendingActionBuffer.indexOf('[ /ACTION]'); // handle spaces
                  const endTagIndexAlt = pendingActionBuffer.indexOf('[/ACTION]');
                  const actualEndIndex = endTagIndexAlt !== -1 ? endTagIndexAlt : endTagIndex;

                  if (actualEndIndex !== -1) {
                    const fullActionString = pendingActionBuffer.substring(0, actualEndIndex + 9);
                    pendingActionBuffer = pendingActionBuffer.substring(actualEndIndex + 9);
                    isInsideActionTag = false;

                    // Parse the action JSON!
                    try {
                      const jsonMatch = fullActionString.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
                      if (jsonMatch && jsonMatch[1]) {
                        const actionData = JSON.parse(jsonMatch[1].trim());
                        console.log('Parsed queued CRM action from voice bot:', actionData);
                        
                        // Queue in SQLite db and Next.js master
                        const actionId = await queueAction(
                          callId,
                          actionData.deal_id,
                          actionData.deal_name,
                          actionData.type,
                          actionData.params,
                          actionData.rationale
                        );

                        // Broadcast to SSE via bridge
                        emitToDashboard('action_queued', {
                          id: actionId,
                          deal_id: actionData.deal_id,
                          deal_name: actionData.deal_name,
                          action_type: actionData.type,
                          params: actionData.params,
                          rationale: actionData.rationale,
                          status: 'pending'
                        });
                      }
                    } catch (e) {
                      console.error('Failed to parse action JSON from LLM response:', e);
                    }
                  }
                }
              }

              if (textToOutput) {
                currentResponseText += textToOutput;
                // Emit partial utterance to Dashboard (live typing, not yet finalized)
                emitToDashboard('speaking', { text: currentResponseText, isPartial: true });
                
                // Send text to Retell
                ws.send(JSON.stringify({
                  response_id: responseId,
                  content: textToOutput,
                  content_complete: false,
                  end_of_call: false
                }));
              }
            });

            // Stream complete — finalize the utterance
            ws.send(JSON.stringify({
              response_id: responseId,
              content: '',
              content_complete: true,
              end_of_call: false
            }));
            
            // Emit the finalized complete utterance to Dashboard
            emitToDashboard('speaking', { text: currentResponseText, isPartial: false });

            // Save agent message to history and DB
            conversationHistory.push({ role: 'assistant', content: currentResponseText });
            await saveTranscriptTurn(callId, 'agent', currentResponseText);

          } catch (streamError) {
            console.error('Error streaming LLM response in WebSocket:', streamError);
            ws.send(JSON.stringify({
              response_id: responseId,
              content: 'Sorry, I hit a snag retrieving that information.',
              content_complete: true,
              end_of_call: false
            }));
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      console.log(`Retell Custom LLM: Connection closed for session ${callId}`);
      // Emit call ended event to Dashboard
      emitToDashboard('call_ended', { sessionId: callId, duration: 0 });
      emitToDashboard('thinking', { text: 'Call session ended. Preparing CRM action review...' });
    });
  });

  server.listen(PORT, () => {
    console.log(`Retell Custom LLM WebSocket server listening on port ${PORT}`);
  });
}

// Support running directly as a standalone CLI node process
if (require.main === module) {
  startWebSocketServer();
}

module.exports = {
  startWebSocketServer
};
