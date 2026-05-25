const db = require('../src/lib/database');

async function seed() {
  console.log('Seeding local SQLite database with a focused B2B SaaS scenario...');
  
  try {
    db.initDB();

    const demoStages = [
      { id: 'appointmentscheduled', pipeline_id: 'default', label: 'Appointment Scheduled', display_order: 1 },
      { id: 'qualifiedtobuy', pipeline_id: 'default', label: 'Qualified To Buy', display_order: 2 },
      { id: 'presentationscheduled', pipeline_id: 'default', label: 'Presentation Scheduled', display_order: 3 },
      { id: 'decisionmakerboughtin', pipeline_id: 'default', label: 'Decision Maker Bought-In', display_order: 4 },
      { id: 'contractsent', pipeline_id: 'default', label: 'Contract Sent', display_order: 5 },
      { id: 'closedwon', pipeline_id: 'default', label: 'Closed Won', display_order: 6 },
      { id: 'closedlost', pipeline_id: 'default', label: 'Closed Lost', display_order: 7 }
    ];

    const demoContacts = [
      { id: 'c1', email: 'sarah.chen@techcorp.io', firstname: 'Sarah', lastname: 'Chen', phone: '+1-555-0199', company: 'TechCorp', created_at: new Date().toISOString() },
      { id: 'c2', email: 'marcus.j@acmeindustries.com', firstname: 'Marcus', lastname: 'Johnson', phone: '+1-555-0144', company: 'Acme Industries', created_at: new Date().toISOString() },
      { id: 'c3', email: 'priya@dataflowsys.com', firstname: 'Priya', lastname: 'Patel', phone: '+1-555-0188', company: 'DataFlow Systems', created_at: new Date().toISOString() },
      { id: 'c4', email: 'jobrien@cloudbase.co', firstname: 'James', lastname: 'O\'Brien', phone: '+1-555-0166', company: 'CloudBase Corp', created_at: new Date().toISOString() }
    ];

    const demoDeals = [
      { id: 'd1', dealname: 'TechCorp Enterprise Platform', amount: 45000, dealstage: 'qualifiedtobuy', pipeline: 'default', contact_id: 'c1', days_in_stage: 12, last_activity: new Date(Date.now() - 12*24*60*60*1000).toISOString(), created_at: new Date(Date.now() - 15*24*60*60*1000).toISOString(), updated_at: new Date(Date.now() - 12*24*60*60*1000).toISOString() },
      { id: 'd2', dealname: 'Acme Industries Data Suite', amount: 30000, dealstage: 'contractsent', pipeline: 'default', contact_id: 'c2', days_in_stage: 5, last_activity: new Date(Date.now() - 5*24*60*60*1000).toISOString(), created_at: new Date(Date.now() - 10*24*60*60*1000).toISOString(), updated_at: new Date(Date.now() - 5*24*60*60*1000).toISOString() },
      { id: 'd3', dealname: 'DataFlow Analytics Upgrade', amount: 32000, dealstage: 'closedwon', pipeline: 'default', contact_id: 'c3', days_in_stage: 1, last_activity: new Date(Date.now() - 1*24*60*60*1000).toISOString(), created_at: new Date(Date.now() - 8*24*60*60*1000).toISOString(), updated_at: new Date(Date.now() - 1*24*60*60*1000).toISOString() },
      { id: 'd4', dealname: 'CloudBase Infrastructure Deal', amount: 28000, dealstage: 'presentationscheduled', pipeline: 'default', contact_id: 'c4', days_in_stage: 3, last_activity: new Date(Date.now() - 3*24*60*60*1000).toISOString(), created_at: new Date(Date.now() - 7*24*60*60*1000).toISOString(), updated_at: new Date(Date.now() - 3*24*60*60*1000).toISOString() }
    ];

    const demoNotes = [
      { id: 'n1', deal_id: 'd1', body: '[DEMO_BOT] Showed strong interest in enterprise tier. Sarah wants to see custom integrations demo.', timestamp: new Date(Date.now() - 12*24*60*60*1000).toISOString() },
      { id: 'n2', deal_id: 'd2', body: '[DEMO_BOT] Legal reviewing contract. Marcus flagged concerns about data residency clause.', timestamp: new Date(Date.now() - 5*24*60*60*1000).toISOString() },
      { id: 'n3', deal_id: 'd3', body: '[DEMO_BOT] Signed! Priya pushed through approval. Implementation starts next week.', timestamp: new Date(Date.now() - 1*24*60*60*1000).toISOString() },
      { id: 'n4', deal_id: 'd4', body: '[DEMO_BOT] Demo scheduled for Thursday. James wants to see disaster recovery features.', timestamp: new Date(Date.now() - 3*24*60*60*1000).toISOString() }
    ];

    db.upsertStages(demoStages);
    db.upsertContacts(demoContacts);
    db.upsertDeals(demoDeals);
    db.upsertNotes(demoNotes);

    console.log('Local database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
