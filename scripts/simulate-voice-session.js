const db = require('../src/lib/database');
const thoughtEmitter = require('../src/lib/thought-emitter');
const actionExecutor = require('../src/lib/action-executor');

/**
 * Server-side mock voice session simulation
 * Mimics what the browser Dashboard does, but runnable via Node.js
 */
async function runMockVoiceSession(repName = 'Elon Gates') {
  const sessionId = 'session_mock_' + Date.now();
  console.log(`\n🎙️  Starting mock voice session for ${repName}...\n`);

  db.initDB();

  const focusList = db.getClassifiedDeals();
  if (focusList.length === 0) {
    console.log('❌ No deals in focus list. Please run seed + classify first.');
    return;
  }

  console.log(`📋 Pipeline: ${focusList.length} deals loaded`);
  focusList.forEach((d, i) => {
    console.log(`   ${i + 1}. ${d.dealname} — $${d.amount.toLocaleString()} — Priority ${d.classification?.priority || '-'}`);
  });

  // Build a realistic transcript
  const transcript = [
    {
      speaker: 'agent',
      content: `Hey ${repName}! How did your day go? Any funny moments, shout-outs from the team, or concerns you want to raise before we jump into the pipeline?`,
      timestamp: new Date().toISOString()
    },
    {
      speaker: 'user',
      content: "Hey Alex! Day was good actually. Had a hilarious moment in standup where the intern tried to demo the feature upside down. Team is buzzing about the new release. No major concerns, just the usual pipeline stress.",
      timestamp: new Date(Date.now() + 3500).toISOString()
    },
    {
      speaker: 'agent',
      content: "Haha, upside down demo? That's classic! Love the energy. Okay, whenever you're ready, let's get your pipeline sorted. We have some important deals to review today.",
      timestamp: new Date(Date.now() + 6000).toISOString()
    }
  ];

  // Simulate reviewing each deal
  for (let i = 0; i < Math.min(3, focusList.length); i++) {
    const deal = focusList[i];
    const contactName = deal.contact ? `${deal.contact.firstname} ${deal.contact.lastname}` : 'the contact';

    // Agent introduces deal
    transcript.push({
      speaker: 'agent',
      content: `Let's look at ${deal.dealname}. It's been in ${deal.stage_label} for ${deal.days_in_stage} days. ${deal.classification?.voice_brief || 'What do you think about this one?'}`,
      timestamp: new Date(Date.now() + 10000 + i * 8000).toISOString()
    });

    // User responds
    const userResponses = [
      `Yes, ${contactName.split(' ')[0]} has been slow to respond. I think we need to flag this.`,
      `Actually, ${contactName.split(' ')[0]} mentioned they're ready to sign next week. Let's queue a stage move.`,
      `I spoke to ${contactName} yesterday. They're concerned about pricing. I should add a note about the discount we discussed.`
    ];
    transcript.push({
      speaker: 'user',
      content: userResponses[i % userResponses.length],
      timestamp: new Date(Date.now() + 12000 + i * 8000).toISOString()
    });

    // Agent suggests action
    const actionTypes = ['crm_flag_risk', 'crm_stage_move', 'crm_note'];
    const actionLabels = ['flagging risk', 'moving stage', 'adding note'];
    const actionType = actionTypes[i % actionTypes.length];
    const actionLabel = actionLabels[i % actionLabels.length];

    transcript.push({
      speaker: 'agent',
      content: `Got it. I'll queue a ${actionLabel} on ${deal.dealname}. Sound good?`,
      timestamp: new Date(Date.now() + 15000 + i * 8000).toISOString()
    });

    // Queue the action
    const actionId = db.queueAction(
      sessionId,
      deal.id,
      deal.dealname,
      actionType,
      actionType === 'crm_flag_risk'
        ? { note_text: `Flagging risk: ${deal.dealname} stale for ${deal.days_in_stage} days in ${deal.stage_label}. Recommended follow-up.` }
        : actionType === 'crm_stage_move'
          ? { target_stage: 'closedwon' }
          : { note_text: `Rep discussed pricing concerns with ${contactName}. Consider offering implementation credits.` },
      `Auto-generated from voice session: ${actionLabel}`
    );

    thoughtEmitter.emit('action_queued', {
      id: actionId,
      session_id: sessionId,
      deal_id: deal.id,
      deal_name: deal.dealname,
      action_type: actionType,
      params: actionType === 'crm_flag_risk'
        ? { note_text: `Flagging risk on ${deal.dealname}` }
        : actionType === 'crm_stage_move'
          ? { target_stage: 'closedwon' }
          : { note_text: `Pricing discussion with ${contactName}` },
      rationale: `Voice bot recommended ${actionLabel}`,
      status: 'pending'
    });

    console.log(`   ✓ Queued: ${actionType} on ${deal.dealname} (ID: ${actionId})`);
  }

  // Closing
  transcript.push({
    speaker: 'agent',
    content: `Great session today, ${repName}. I've queued ${Math.min(3, focusList.length)} CRM updates and we covered the pipeline. You can review them on the post-call screen. Talk to you tomorrow!`,
    timestamp: new Date(Date.now() + 50000).toISOString()
  });

  console.log(`\n📝 Transcript: ${transcript.length} turns`);
  console.log(`📦 Actions queued: ${Math.min(3, focusList.length)}`);

  // Get actions
  const actions = db.getActions(sessionId);

  return {
    sessionId,
    transcript,
    actions,
    callStats: {
      duration: 52,
      dealsReviewed: focusList.length,
      actionsDecided: actions.length
    }
  };
}

// If run directly
if (require.main === module) {
  runMockVoiceSession(process.argv[2] || 'Elon Gates')
    .then(result => {
      console.log('\n✅ Mock voice session complete!');
      console.log('\n📊 Summary:');
      console.log(`   Session: ${result.sessionId}`);
      console.log(`   Duration: ${result.callStats.duration}s`);
      console.log(`   Deals: ${result.callStats.dealsReviewed}`);
      console.log(`   Actions: ${result.callStats.actionsDecided}`);
      console.log('\n🎬 Next: Open http://localhost:3000 and click "Start New Review" to see the Post-Call Review screen.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { runMockVoiceSession };
