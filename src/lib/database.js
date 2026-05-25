const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

let dbInstance = null;

function initDB() {
  if (dbInstance) return dbInstance;

  // File-based SQLite database at project root so Next.js API routes AND standalone WS server share the same file
  const dbPath = path.join(process.cwd(), 'sales-voice-bot.db');
  dbInstance = new Database(dbPath);

  // Create tables
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      email TEXT,
      firstname TEXT,
      lastname TEXT,
      phone TEXT,
      company TEXT,
      hubspot_id TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      dealname TEXT,
      amount REAL,
      dealstage TEXT,
      pipeline TEXT,
      contact_id TEXT,
      hubspot_id TEXT,
      days_in_stage INTEGER,
      last_activity TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      deal_id TEXT,
      body TEXT,
      timestamp TEXT,
      hubspot_id TEXT
    );

    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id TEXT PRIMARY KEY,
      pipeline_id TEXT,
      label TEXT,
      display_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS classifications (
      deal_id TEXT PRIMARY KEY,
      priority INTEGER,
      category TEXT,
      reasoning TEXT,
      recommended_actions TEXT, -- Store JSON string
      voice_brief TEXT
    );

    CREATE TABLE IF NOT EXISTS action_queue (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      deal_id TEXT,
      deal_name TEXT,
      action_type TEXT,
      params TEXT, -- Store JSON string
      rationale TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'executing', 'completed', 'failed'
      result TEXT,
      created_at TEXT,
      executed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transcript_turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      speaker TEXT, -- 'agent' or 'user'
      content TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS demo_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hubspot_id TEXT NOT NULL UNIQUE,
      record_type TEXT NOT NULL, -- 'contact' or 'deal'
      created_at TEXT
    );
  `);

  return dbInstance;
}

// Contacts Operations
function upsertContacts(contacts) {
  const db = initDB();
  const insert = db.prepare(`
    INSERT INTO contacts (id, email, firstname, lastname, phone, company, hubspot_id, created_at)
    VALUES (@id, @email, @firstname, @lastname, @phone, @company, @hubspot_id, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      email=excluded.email,
      firstname=excluded.firstname,
      lastname=excluded.lastname,
      phone=excluded.phone,
      company=excluded.company,
      hubspot_id=excluded.hubspot_id,
      created_at=excluded.created_at
  `);

  const transaction = db.transaction((list) => {
    for (const contact of list) {
      insert.run({
        id: contact.id,
        email: contact.email || null,
        firstname: contact.firstname || null,
        lastname: contact.lastname || null,
        phone: contact.phone || null,
        company: contact.company || null,
        hubspot_id: contact.hubspot_id || null,
        created_at: contact.created_at || null
      });
    }
  });

  transaction(contacts);
}

// Deals Operations
function upsertDeals(deals) {
  const db = initDB();
  const insert = db.prepare(`
    INSERT INTO deals (id, dealname, amount, dealstage, pipeline, contact_id, hubspot_id, days_in_stage, last_activity, created_at, updated_at)
    VALUES (@id, @dealname, @amount, @dealstage, @pipeline, @contact_id, @hubspot_id, @days_in_stage, @last_activity, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      dealname=excluded.dealname,
      amount=excluded.amount,
      dealstage=excluded.dealstage,
      pipeline=excluded.pipeline,
      contact_id=excluded.contact_id,
      hubspot_id=excluded.hubspot_id,
      days_in_stage=excluded.days_in_stage,
      last_activity=excluded.last_activity,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at
  `);

  const transaction = db.transaction((list) => {
    for (const deal of list) {
      insert.run({
        id: deal.id,
        dealname: deal.dealname || null,
        amount: deal.amount || 0,
        dealstage: deal.dealstage || null,
        pipeline: deal.pipeline || null,
        contact_id: deal.contact_id || null,
        hubspot_id: deal.hubspot_id || null,
        days_in_stage: deal.days_in_stage || 0,
        last_activity: deal.last_activity || null,
        created_at: deal.created_at || null,
        updated_at: deal.updated_at || null
      });
    }
  });

  transaction(deals);
}

// Notes Operations
function upsertNotes(notes) {
  const db = initDB();
  const insert = db.prepare(`
    INSERT INTO notes (id, deal_id, body, timestamp, hubspot_id)
    VALUES (@id, @deal_id, @body, @timestamp, @hubspot_id)
    ON CONFLICT(id) DO UPDATE SET
      deal_id=excluded.deal_id,
      body=excluded.body,
      timestamp=excluded.timestamp,
      hubspot_id=excluded.hubspot_id
  `);

  const transaction = db.transaction((list) => {
    for (const note of list) {
      insert.run({
        id: note.id,
        deal_id: note.deal_id || null,
        body: note.body || null,
        timestamp: note.timestamp || null,
        hubspot_id: note.hubspot_id || null
      });
    }
  });

  transaction(notes);
}

// Pipeline Stages Operations
function upsertStages(stages) {
  const db = initDB();
  const insert = db.prepare(`
    INSERT INTO pipeline_stages (id, pipeline_id, label, display_order)
    VALUES (@id, @pipeline_id, @label, @display_order)
    ON CONFLICT(id) DO UPDATE SET
      pipeline_id=excluded.pipeline_id,
      label=excluded.label,
      display_order=excluded.display_order
  `);

  const transaction = db.transaction((list) => {
    for (const stage of list) {
      insert.run({
        id: stage.id,
        pipeline_id: stage.pipeline_id || null,
        label: stage.label || null,
        display_order: stage.display_order || 0
      });
    }
  });

  transaction(stages);
}

// Classifications Operations
function saveClassifications(classifications) {
  const db = initDB();
  const insert = db.prepare(`
    INSERT INTO classifications (deal_id, priority, category, reasoning, recommended_actions, voice_brief)
    VALUES (@deal_id, @priority, @category, @reasoning, @recommended_actions, @voice_brief)
    ON CONFLICT(deal_id) DO UPDATE SET
      priority=excluded.priority,
      category=excluded.category,
      reasoning=excluded.reasoning,
      recommended_actions=excluded.recommended_actions,
      voice_brief=excluded.voice_brief
  `);

  const transaction = db.transaction((list) => {
    for (const cls of list) {
      insert.run({
        ...cls,
        recommended_actions: typeof cls.recommended_actions === 'string' 
          ? cls.recommended_actions 
          : JSON.stringify(cls.recommended_actions)
      });
    }
  });

  transaction(classifications);
}

// Query all deals along with their contact, stage label, and LLM classification if present
function getClassifiedDeals() {
  const db = initDB();
  const stmt = db.prepare(`
    SELECT 
      d.id, d.dealname, d.amount, d.dealstage, d.pipeline, d.days_in_stage, d.last_activity, d.created_at, d.updated_at,
      c.id AS contact_id, c.firstname, c.lastname, c.email, c.phone, c.company,
      ps.label AS stage_label,
      cl.priority, cl.category, cl.reasoning, cl.recommended_actions, cl.voice_brief
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id
    LEFT JOIN pipeline_stages ps ON d.dealstage = ps.id
    LEFT JOIN classifications cl ON d.id = cl.deal_id
    ORDER BY cl.priority DESC, d.amount DESC
  `);

  const results = stmt.all();
  return results.map(row => ({
    id: row.id,
    dealname: row.dealname,
    amount: row.amount,
    dealstage: row.dealstage,
    pipeline: row.pipeline,
    days_in_stage: row.days_in_stage,
    last_activity: row.last_activity,
    created_at: row.created_at,
    updated_at: row.updated_at,
    contact: row.contact_id ? {
      id: row.contact_id,
      firstname: row.firstname,
      lastname: row.lastname,
      email: row.email,
      phone: row.phone,
      company: row.company
    } : null,
    stage_label: row.stage_label || row.dealstage,
    classification: row.priority ? {
      priority: row.priority,
      category: row.category,
      reasoning: row.reasoning,
      recommended_actions: JSON.parse(row.recommended_actions || '[]'),
      voice_brief: row.voice_brief
    } : null
  }));
}

// Action Queue Operations
function queueAction(sessionId, dealId, dealName, actionType, params, rationale) {
  const db = initDB();
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO action_queue (id, session_id, deal_id, deal_name, action_type, params, rationale, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    sessionId,
    dealId,
    dealName,
    actionType,
    typeof params === 'string' ? params : JSON.stringify(params),
    rationale,
    new Date().toISOString()
  );
  return id;
}

function getActions(sessionId) {
  const db = initDB();
  const stmt = db.prepare(`
    SELECT * FROM action_queue WHERE session_id = ? ORDER BY created_at ASC
  `);
  const results = stmt.all(sessionId);
  return results.map(row => ({
    ...row,
    params: JSON.parse(row.params || '{}')
  }));
}

function removeAction(id) {
  const db = initDB();
  const stmt = db.prepare(`
    DELETE FROM action_queue WHERE id = ?
  `);
  return stmt.run(id).changes > 0;
}

function updateActionStatus(id, status, result = null) {
  const db = initDB();
  const stmt = db.prepare(`
    UPDATE action_queue 
    SET status = ?, result = ?, executed_at = ?
    WHERE id = ?
  `);
  return stmt.run(status, result, new Date().toISOString(), id).changes > 0;
}

function getActionsBySession(sessionId) {
  return getActions(sessionId);
}

// Transcript Turn Operations
function saveTranscriptTurn(sessionId, speaker, content) {
  const db = initDB();
  const stmt = db.prepare(`
    INSERT INTO transcript_turns (session_id, speaker, content, timestamp)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(sessionId, speaker, content, new Date().toISOString());
}

function getTranscriptBySession(sessionId) {
  const db = initDB();
  const stmt = db.prepare(`
    SELECT speaker, content, timestamp
    FROM transcript_turns
    WHERE session_id = ?
    ORDER BY timestamp ASC
  `);
  return stmt.all(sessionId);
}

// Demo Records Operations (track HubSpot records created by Pipeline Pilot for cleanup)
function trackDemoRecord(hubspotId, recordType) {
  const db = initDB();
  const stmt = db.prepare(`
    INSERT INTO demo_records (hubspot_id, record_type, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(hubspot_id) DO NOTHING
  `);
  stmt.run(hubspotId, recordType, new Date().toISOString());
}

function getAllDemoRecords() {
  const db = initDB();
  const stmt = db.prepare(`SELECT hubspot_id, record_type FROM demo_records`);
  return stmt.all();
}

function clearAllDemoRecords() {
  const db = initDB();
  db.prepare(`DELETE FROM demo_records`).run();
}

/**
 * Clears all local SQLite tables to ensure a clean slate before seeding.
 * This removes ALL local data: contacts, deals, notes, stages, classifications,
 * action queue, transcript turns, and demo tracking records.
 */
function clearAllLocalData() {
  const db = initDB();
  db.prepare(`DELETE FROM contacts`).run();
  db.prepare(`DELETE FROM deals`).run();
  db.prepare(`DELETE FROM notes`).run();
  db.prepare(`DELETE FROM pipeline_stages`).run();
  db.prepare(`DELETE FROM classifications`).run();
  db.prepare(`DELETE FROM action_queue`).run();
  db.prepare(`DELETE FROM transcript_turns`).run();
  db.prepare(`DELETE FROM demo_records`).run();
  console.log('🧹 All local SQLite tables cleared.');
}

module.exports = {
  initDB,
  upsertContacts,
  upsertDeals,
  upsertNotes,
  upsertStages,
  saveClassifications,
  getClassifiedDeals,
  queueAction,
  getActions,
  removeAction,
  updateActionStatus,
  getActionsBySession,
  saveTranscriptTurn,
  getTranscriptBySession,
  trackDemoRecord,
  getAllDemoRecords,
  clearAllDemoRecords,
  clearAllLocalData
};
