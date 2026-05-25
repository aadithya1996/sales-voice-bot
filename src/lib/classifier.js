const db = require('./database');
const llm = require('./llm');

async function classifyAll(emitter = null) {
  const emitProgress = (progress, status, details = {}) => {
    if (emitter) {
      emitter.emit('classification_progress', { progress, status, ...details });
    }
    console.log(`Classification Progress [${progress}%]: ${status}`);
  };

  try {
    emitProgress(10, 'Loading synchronized CRM deals...');
    // Get raw deals (without classifications) and stages
    const database = db.initDB();
    const deals = database.prepare('SELECT * FROM deals').all();
    const stages = database.prepare('SELECT * FROM pipeline_stages').all();

    if (deals.length === 0) {
      emitProgress(100, 'No deals found in local database to classify. Sync CRM first.', { count: 0 });
      return [];
    }

    emitProgress(30, `Analyzing ${deals.length} deals and stage histories...`);

    // Prepare deals payload for the LLM. Add associated notes to give LLM rich context.
    const dealsForClassification = await Promise.all(
      deals.map(async (deal) => {
        const notes = database.prepare('SELECT body, timestamp FROM notes WHERE deal_id = ? ORDER BY timestamp DESC LIMIT 5').all(deal.id);
        const contact = database.prepare('SELECT * FROM contacts WHERE id = ?').all(deal.contact_id)[0] || null;

        return {
          id: deal.id,
          dealname: deal.dealname,
          amount: deal.amount,
          dealstage: deal.dealstage,
          days_in_stage: deal.days_in_stage,
          last_activity: deal.last_activity,
          contact: contact ? {
            name: `${contact.firstname || ''} ${contact.lastname || ''}`.trim(),
            company: contact.company,
            email: contact.email
          } : null,
          recent_notes: notes.map(n => n.body)
        };
      })
    );

    emitProgress(50, 'Requesting AI classification & priority mapping...');
    const classifications = await llm.classifyDeals(dealsForClassification, stages);

    emitProgress(80, `Saving ${classifications.length} classifications to database...`);
    
    // Structure classifications for saving
    const dbClassifications = classifications.map(c => ({
      deal_id: c.deal_id,
      priority: c.priority,
      category: c.category,
      reasoning: c.reasoning,
      recommended_actions: c.recommended_actions,
      voice_brief: c.voice_brief
    }));

    db.saveClassifications(dbClassifications);

    emitProgress(100, 'Classification completed successfully!', { success: true, count: classifications.length });
    return classifications;
  } catch (err) {
    console.error('Error in deal classifier:', err);
    emitProgress(100, `Classification failed: ${err.message}`, { success: false, error: err.message });
    throw err;
  }
}

function getClassifiedFocusList() {
  return db.getClassifiedDeals();
}

module.exports = {
  classifyAll,
  getClassifiedFocusList
};
