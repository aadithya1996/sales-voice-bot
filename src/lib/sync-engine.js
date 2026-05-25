const hubspot = require('./hubspot');
const db = require('./database');

async function syncAll(emitter = null) {
  const emitProgress = (progress, status, details = {}) => {
    if (emitter) {
      emitter.emit('sync_progress', { progress, status, ...details });
    }
    console.log(`Sync Progress [${progress}%]: ${status}`);
  };

  try {
    emitProgress(5, 'Initializing local database...');
    db.initDB();

    // 1. Fetch Pipelines & Stages
    emitProgress(10, 'Fetching pipelines and stages from HubSpot...');
    const pipelines = await hubspot.getPipelines();
    const dbStages = [];
    for (const pipeline of pipelines) {
      for (const stage of pipeline.stages) {
        dbStages.push({
          id: stage.id,
          pipeline_id: pipeline.id,
          label: stage.label,
          display_order: stage.displayOrder
        });
      }
    }
    db.upsertStages(dbStages);
    emitProgress(25, `Pipeline stages synced (${dbStages.length} stages).`);

    // 2. Fetch Contacts
    emitProgress(30, 'Fetching contacts from HubSpot...');
    const contacts = await hubspot.getAllContacts();
    db.upsertContacts(contacts);
    emitProgress(55, `Contacts synced (${contacts.length} contacts).`);

    // 3. Fetch Deals
    emitProgress(60, 'Fetching deals from HubSpot...');
    const deals = await hubspot.getAllDeals();
    db.upsertDeals(deals);
    emitProgress(80, `Deals synced (${deals.length} deals).`);

    // 4. Fetch Notes for active deals (parallelized with batching to prevent rate limits)
    emitProgress(85, 'Fetching recent deal activities and notes...');
    let notesCount = 0;
    const activeDeals = deals.filter(d => d.dealstage !== 'closedwon' && d.dealstage !== 'closedlost');
    
    // Fetch notes for deals in small batches
    const batchSize = 5;
    for (let i = 0; i < activeDeals.length; i += batchSize) {
      const batch = activeDeals.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (deal) => {
          try {
            const notes = await hubspot.getDealNotes(deal.id);
            if (notes && notes.length > 0) {
              db.upsertNotes(notes);
              notesCount += notes.length;
            }
          } catch (e) {
            console.error(`Skipping notes for deal ${deal.id} due to error:`, e.message);
          }
        })
      );
    }
    emitProgress(95, `Deal notes synced (${notesCount} notes).`);

    emitProgress(100, 'Sync complete! Local CRM database is up to date.', { success: true });
    return { success: true, contactsCount: contacts.length, dealsCount: deals.length };
  } catch (err) {
    console.error('Error in sync engine:', err);
    emitProgress(100, `Sync failed: ${err.message}`, { success: false, error: err.message });
    throw err;
  }
}

module.exports = {
  syncAll
};
