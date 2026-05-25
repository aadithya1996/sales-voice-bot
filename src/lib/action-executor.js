const db = require('./database');
const hubspot = require('./hubspot');

async function executeAction(actionId, emitter = null) {
  const database = db.initDB();
  const action = database.prepare('SELECT * FROM action_queue WHERE id = ?').all(actionId)[0];
  
  if (!action) {
    throw new Error(`Action ${actionId} not found in database.`);
  }

  const emitEvent = (type, data) => {
    if (emitter) {
      emitter.emit(type, { actionId, dealId: action.deal_id, dealName: action.deal_name, ...data });
    }
  };

  console.log(`Executing Action [${action.action_type}] on Deal ${action.deal_name}...`);
  db.updateActionStatus(actionId, 'executing');
  emitEvent('action_executing', { action_type: action.action_type });

  try {
    const params = JSON.parse(action.params || '{}');
    let resultDetails = '';

    switch (action.action_type) {
      case 'crm_stage_move':
        if (!params.target_stage) {
          throw new Error('Missing parameter: target_stage');
        }
        await hubspot.updateDealStage(action.deal_id, params.target_stage);
        resultDetails = `Moved stage to ${params.target_stage}`;
        break;

      case 'crm_note':
        if (!params.note_text) {
          throw new Error('Missing parameter: note_text');
        }
        await hubspot.addNoteToDeal(action.deal_id, params.note_text);
        resultDetails = 'Added notes to deal';
        break;

      case 'crm_flag_risk':
        if (!params.note_text) {
          throw new Error('Missing parameter: note_text');
        }
        const noteWithPrefix = `[RISK FLAG] ${params.note_text}`;
        await hubspot.addNoteToDeal(action.deal_id, noteWithPrefix);
        resultDetails = 'Flagged risk and added note';
        break;

      default:
        throw new Error(`Unsupported action type: ${action.action_type}`);
    }

    db.updateActionStatus(actionId, 'completed', resultDetails);
    emitEvent('action_complete', { status: 'completed', result: resultDetails });
    return { success: true, result: resultDetails };
  } catch (err) {
    console.error(`Failed to execute action ${actionId}:`, err);
    db.updateActionStatus(actionId, 'failed', err.message);
    emitEvent('action_complete', { status: 'failed', error: err.message });
    return { success: false, error: err.message };
  }
}

async function executeActions(sessionId, emitter = null) {
  const actions = db.getActions(sessionId);
  const pendingActions = actions.filter(a => a.status === 'pending');
  
  console.log(`Starting execution of ${pendingActions.length} pending actions for session ${sessionId}...`);
  const results = [];

  for (const action of pendingActions) {
    const res = await executeAction(action.id, emitter);
    results.push({ id: action.id, ...res });
  }

  // After executing all actions, sync user transcript responses as notes to HubSpot
  await syncTranscriptNotes(sessionId, emitter);

  return results;
}

async function syncTranscriptNotes(sessionId, emitter = null) {
  try {
    const transcript = db.getTranscriptBySession(sessionId);
    if (!transcript || transcript.length === 0) {
      console.log(`No transcript found for session ${sessionId}. Skipping transcript sync.`);
      return;
    }

    // Get all actions for this session to know which deals were involved
    const actions = db.getActions(sessionId);
    const uniqueDealIds = [...new Set(actions.map(a => a.deal_id).filter(Boolean))];

    if (uniqueDealIds.length === 0) {
      console.log(`No deals found for session ${sessionId}. Skipping transcript sync.`);
      return;
    }

    // Build the transcript note content from user responses
    const userTurns = transcript.filter(t => t.speaker === 'user');
    if (userTurns.length === 0) {
      console.log(`No user turns found for session ${sessionId}. Skipping transcript sync.`);
      return;
    }

    const transcriptHeader = `[VOICE CALL TRANSCRIPT] Pipeline Pilot Daily Review\nRecorded: ${new Date().toLocaleString()}\n`;
    const transcriptBody = userTurns.map((t, idx) => `  ${idx + 1}. ${t.content}`).join('\n');
    const fullNote = `${transcriptHeader}\nUser responses during the call:\n${transcriptBody}\n`;

    // Write the transcript note to each deal that had actions
    for (const dealId of uniqueDealIds) {
      try {
        await hubspot.addNoteToDeal(dealId, fullNote);
        console.log(`Synced transcript note to deal ${dealId}`);
        if (emitter) {
          emitter.emit('action_complete', {
            actionId: `transcript_${dealId}`,
            dealId,
            dealName: 'Transcript Sync',
            status: 'completed',
            result: 'User transcript synced as note'
          });
        }
      } catch (err) {
        console.warn(`Failed to sync transcript note to deal ${dealId}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error syncing transcript notes for session ${sessionId}:`, err);
  }
}

module.exports = {
  executeAction,
  executeActions
};
