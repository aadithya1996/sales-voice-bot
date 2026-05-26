import { NextResponse } from 'next/server';
import demoGenerator from '../../../../lib/demo-generator';
import hubspot from '../../../../lib/hubspot';
import db from '../../../../lib/database';
import thoughtEmitter from '../../../../lib/thought-emitter';

/**
 * Seed Demo Data API — LLM-Generated Realistic Data → HubSpot → Local DB
 *
 * Flow:
 * 1. LLM generates 4 realistic B2B SaaS deals with rich context
 * 2. Writes contacts to HubSpot CRM
 * 3. Writes deals to HubSpot CRM (linked to contacts)
 * 4. Writes notes to HubSpot CRM (linked to deals)
 * 5. Syncs HubSpot data back to local SQLite DB
 * 6. Returns success with deal summary
 */
export async function POST() {
  const emitProgress = (progress, status, success = false) => {
    thoughtEmitter.emit('seed_progress', { progress, status, success });
    console.log(`Seed Progress [${progress}%]: ${status}`);
  };

  try {
    emitProgress(5, 'Initializing demo data generation...');
    db.initDB();

    // 0. Clear all local data first to ensure a clean slate
    emitProgress(8, 'Clearing local database for fresh demo...');
    db.clearAllLocalData();

    // 1. Generate realistic demo data via LLM
    emitProgress(10, 'Asking AI to generate realistic B2B sales scenarios...');
    const demoData = await demoGenerator.generateDemoDataset();
    emitProgress(25, `AI generated ${demoData.length} realistic deals with rich context.`);

    // 2. Fetch real pipeline stages from HubSpot to map generic names → actual IDs
    emitProgress(28, 'Fetching your HubSpot pipeline configuration...');
    const pipelines = await hubspot.getPipelines();
    const defaultPipeline = pipelines.find(p => p.id === 'default') || pipelines[0];
    
    if (!defaultPipeline || !defaultPipeline.stages || defaultPipeline.stages.length === 0) {
      throw new Error('Could not fetch pipeline stages from HubSpot. Cannot create deals without valid stage IDs.');
    }

    // Map generic stage names to actual HubSpot stage IDs
    const stageMap = buildStageMap(defaultPipeline.stages);
    console.log('Stage mapping:', stageMap);

    // 3. Write to HubSpot CRM
    emitProgress(30, 'Writing demo contacts to HubSpot CRM...');
    const hubspotContacts = [];
    const hubspotDeals = [];

    for (let i = 0; i < demoData.length; i++) {
      const item = demoData[i];

      // Map generic stage to actual HubSpot stage ID
      const actualStageId = stageMap[item.deal.dealstage] || defaultPipeline.stages[0].id;

      // Create contact
      emitProgress(35 + (i * 10), `Creating contact ${i + 1}/${demoData.length}: ${item.contact.firstname} ${item.contact.lastname}...`);
      const contactResult = await hubspot.createContact({
        firstname: item.contact.firstname,
        lastname: item.contact.lastname,
        email: item.contact.email,
        company: item.contact.company,
        phone: item.contact.phone
      });

      const contactId = contactResult.id;
      db.trackDemoRecord(contactId, 'contact');
      hubspotContacts.push({
        id: contactId,
        ...item.contact,
        hubspot_id: contactId
      });

      // Create deal linked to contact
      emitProgress(38 + (i * 10), `Creating deal ${i + 1}/${demoData.length}: ${item.deal.dealname}...`);
      const dealResult = await hubspot.createDeal({
        dealname: item.deal.dealname,
        amount: item.deal.amount.toString(),
        dealstage: actualStageId,
        pipeline: item.deal.pipeline
      }, contactId);

      const dealId = dealResult.id;
      db.trackDemoRecord(dealId, 'deal');
      hubspotDeals.push({
        id: dealId,
        ...item.deal,
        dealstage: actualStageId, // store the actual mapped ID
        contact_id: contactId,
        hubspot_id: dealId
      });

      // Add notes to the deal
      if (item.notes && item.notes.length > 0) {
        for (const note of item.notes) {
          await hubspot.addNoteToDeal(dealId, note.body);
        }
      }
    }

    emitProgress(75, `Wrote ${hubspotContacts.length} contacts and ${hubspotDeals.length} deals to HubSpot.`);

    // 3. Sync HubSpot data back to local SQLite DB
    emitProgress(80, 'Syncing HubSpot records to local database...');

    // Manually upsert the HubSpot records into local DB so they're immediately available
    db.upsertContacts(hubspotContacts);
    db.upsertDeals(hubspotDeals.map(d => ({
      id: d.id,
      dealname: d.dealname,
      amount: d.amount,
      dealstage: d.dealstage,
      pipeline: d.pipeline,
      contact_id: d.contact_id,
      hubspot_id: d.hubspot_id,
      days_in_stage: d.days_in_stage || 1,
      last_activity: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })));

    // Fetch stages for local DB (reuse pipelines already fetched)
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

    // Fetch notes for the new deals and store locally
    emitProgress(90, 'Fetching deal notes...');
    for (const deal of hubspotDeals) {
      try {
        const notes = await hubspot.getDealNotes(deal.id);
        if (notes && notes.length > 0) {
          db.upsertNotes(notes);
        }
      } catch (e) {
        console.warn(`Could not fetch notes for deal ${deal.id}:`, e.message);
      }
    }

    emitProgress(100, 'Demo data seeded to HubSpot and synced locally! Ready for voice review.', { success: true });

    return NextResponse.json({
      success: true,
      message: `Successfully created ${hubspotContacts.length} contacts and ${hubspotDeals.length} deals in HubSpot CRM.`,
      summary: hubspotDeals.map(d => ({
        dealname: d.dealname,
        amount: d.amount,
        stage: d.dealstage,
        contact: hubspotContacts.find(c => c.id === d.contact_id)?.email
      }))
    });

  } catch (err) {
    console.error('Error seeding demo data to HubSpot:', err);
    emitProgress(100, `Seeding failed: ${err.message}`);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}

/**
 * Maps generic stage names to actual HubSpot stage IDs by matching labels
 */
function buildStageMap(stages) {
  const map = {};
  
  // Try exact label match first
  for (const stage of stages) {
    const label = stage.label.toLowerCase().replace(/\s/g, '');
    if (label.includes('appointment') || label.includes('new') || label.includes('opportunity')) {
      map.appointmentscheduled = stage.id;
    }
    if (label.includes('qualified') || label.includes('contact') || label.includes('made')) {
      map.qualifiedtobuy = stage.id;
    }
    if (label.includes('presentation') || label.includes('proposal') || label.includes('sent')) {
      map.presentationscheduled = stage.id;
    }
    if (label.includes('contract') || label.includes('negotiation') || label.includes('decision')) {
      map.contractsent = stage.id;
    }
    if (label.includes('closedwon') || label.includes('won')) {
      map.closedwon = stage.id;
    }
    if (label.includes('closedlost') || label.includes('lost')) {
      map.closedlost = stage.id;
    }
  }

  // Fallback: if any generic stage is missing, map to closest available by index
  const availableStages = stages.filter(s => !s.label.toLowerCase().includes('closed'));
  const genericNames = ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled', 'contractsent'];
  
  genericNames.forEach((name, idx) => {
    if (!map[name] && availableStages[idx]) {
      map[name] = availableStages[idx].id;
    }
  });

  // Ensure closed stages are mapped
  const closedWon = stages.find(s => s.label.toLowerCase().includes('won'));
  const closedLost = stages.find(s => s.label.toLowerCase().includes('lost'));
  if (closedWon) map.closedwon = closedWon.id;
  if (closedLost) map.closedlost = closedLost.id;

  return map;
}
