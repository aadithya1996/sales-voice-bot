const hubspot = require('@hubspot/api-client');

class HubSpotService {
  constructor() {
    this.token = process.env.HUBSPOT_ACCESS_TOKEN;
    this.isMock = !this.token || this.token === 'your_hubspot_access_token' || this.token.startsWith('mock_');
    
    if (!this.isMock) {
      this.client = new hubspot.Client({ accessToken: this.token });
    } else {
      console.log('HubSpotService initialized in MOCK mode.');
      // Initialize internal in-memory state for mock mode
      this._initMocks();
    }
  }

  _initMocks() {
    this.mockContacts = [
      { id: 'c1', email: 'sarah.chen@techcorp.io', firstname: 'Sarah', lastname: 'Chen', phone: '+1-555-0199', company: 'TechCorp', created_at: '2026-05-10T09:00:00Z' },
      { id: 'c2', email: 'marcus.j@acmeindustries.com', firstname: 'Marcus', lastname: 'Johnson', phone: '+1-555-0144', company: 'Acme Industries', created_at: '2026-05-11T10:30:00Z' },
      { id: 'c3', email: 'priya@dataflowsys.com', firstname: 'Priya', lastname: 'Patel', phone: '+1-555-0188', company: 'DataFlow Systems', created_at: '2026-05-12T14:15:00Z' },
      { id: 'c4', email: 'jobrien@cloudbase.co', firstname: 'James', lastname: 'O\'Brien', phone: '+1-555-0166', company: 'CloudBase Corp', created_at: '2026-05-13T11:00:00Z' }
    ];

    this.mockDeals = [
      { id: 'd1', dealname: 'TechCorp Enterprise Platform', amount: 45000, dealstage: 'qualifiedtobuy', pipeline: 'default', contact_id: 'c1', days_in_stage: 12, last_activity: '2026-05-11T15:30:00Z', created_at: '2026-05-10T09:30:00Z', updated_at: '2026-05-11T15:30:00Z' },
      { id: 'd2', dealname: 'Acme Industries Data Suite', amount: 30000, dealstage: 'contractsent', pipeline: 'default', contact_id: 'c2', days_in_stage: 5, last_activity: '2026-05-18T10:00:00Z', created_at: '2026-05-11T11:00:00Z', updated_at: '2026-05-18T10:00:00Z' },
      { id: 'd3', dealname: 'DataFlow Analytics Upgrade', amount: 32000, dealstage: 'closedwon', pipeline: 'default', contact_id: 'c3', days_in_stage: 1, last_activity: '2026-05-22T17:00:00Z', created_at: '2026-05-12T15:00:00Z', updated_at: '2026-05-22T17:00:00Z' },
      { id: 'd4', dealname: 'CloudBase Infrastructure Deal', amount: 28000, dealstage: 'presentationscheduled', pipeline: 'default', contact_id: 'c4', days_in_stage: 3, last_activity: '2026-05-20T11:30:00Z', created_at: '2026-05-13T11:30:00Z', updated_at: '2026-05-20T11:30:00Z' }
    ];

    this.mockNotes = [
      { id: 'n1', deal_id: 'd1', body: '[DEMO_BOT] Showed strong interest in enterprise tier. Sarah wants to see custom integrations demo.', timestamp: '2026-05-11T15:30:00Z' },
      { id: 'n2', deal_id: 'd2', body: '[DEMO_BOT] Legal reviewing contract. Marcus flagged concerns about data residency clause.', timestamp: '2026-05-18T10:00:00Z' },
      { id: 'n3', deal_id: 'd3', body: '[DEMO_BOT] Signed! Priya pushed through approval. Implementation starts next week.', timestamp: '2026-05-22T17:00:00Z' },
      { id: 'n4', deal_id: 'd4', body: '[DEMO_BOT] Demo scheduled for Thursday. James wants to see disaster recovery features.', timestamp: '2026-05-20T11:30:00Z' }
    ];

    this.mockPipelines = [
      {
        id: 'default',
        label: 'Sales Pipeline',
        stages: [
          { id: 'appointmentscheduled', label: 'Appointment Scheduled', displayOrder: 1 },
          { id: 'qualifiedtobuy', label: 'Qualified To Buy', displayOrder: 2 },
          { id: 'presentationscheduled', label: 'Presentation Scheduled', displayOrder: 3 },
          { id: 'decisionmakerboughtin', label: 'Decision Maker Bought-In', displayOrder: 4 },
          { id: 'contractsent', label: 'Contract Sent', displayOrder: 5 },
          { id: 'closedwon', label: 'Closed Won', displayOrder: 6 },
          { id: 'closedlost', label: 'Closed Lost', displayOrder: 7 }
        ]
      }
    ];
  }

  async getAllContacts() {
    if (this.isMock) {
      return this.mockContacts;
    }

    try {
      const allContacts = [];
      let after = undefined;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.crm.contacts.basicApi.getPage(
          100,
          after,
          ['email', 'firstname', 'lastname', 'phone', 'company', 'createdate']
        );
        allContacts.push(...response.results);
        after = response.paging?.next?.after;
        hasMore = !!after;
      }

      return allContacts.map(c => ({
        id: c.id,
        email: c.properties.email,
        firstname: c.properties.firstname,
        lastname: c.properties.lastname,
        phone: c.properties.phone,
        company: c.properties.company,
        hubspot_id: c.id,
        created_at: c.properties.createdate || new Date().toISOString()
      }));
    } catch (err) {
      console.error('Error fetching HubSpot contacts:', err);
      throw err;
    }
  }

  async getAllDeals() {
    if (this.isMock) {
      return this.mockDeals;
    }

    try {
      const allDeals = [];
      let after = undefined;
      let hasMore = true;

      while (hasMore) {
        // Fetch deals with contact associations
        const response = await this.client.crm.deals.basicApi.getPage(
          100,
          after,
          ['dealname', 'amount', 'dealstage', 'pipeline', 'createdate', 'hs_lastmodifieddate'],
          undefined,
          ['contacts']
        );
        allDeals.push(...response.results);
        after = response.paging?.next?.after;
        hasMore = !!after;
      }

      return allDeals.map(d => {
        const contactAssoc = d.associations?.contacts?.results?.[0];
        // Calculate custom days in stage based on last modification as a heuristic
        const createdDate = new Date(d.properties.createdate);
        const lastModDate = new Date(d.properties.hs_lastmodifieddate || d.properties.createdate);
        const daysInStage = Math.max(1, Math.round((new Date() - lastModDate) / (1000 * 60 * 60 * 24)));

        return {
          id: d.id,
          dealname: d.properties.dealname,
          amount: d.properties.amount ? parseFloat(d.properties.amount) : 0,
          dealstage: d.properties.dealstage,
          pipeline: d.properties.pipeline || 'default',
          contact_id: contactAssoc ? contactAssoc.id : null,
          hubspot_id: d.id,
          days_in_stage: daysInStage,
          last_activity: d.properties.hs_lastmodifieddate || d.properties.createdate,
          created_at: d.properties.createdate,
          updated_at: d.properties.hs_lastmodifieddate || d.properties.createdate
        };
      });
    } catch (err) {
      console.error('Error fetching HubSpot deals:', err);
      throw err;
    }
  }

  async getDealNotes(dealId) {
    if (this.isMock) {
      return this.mockNotes.filter(n => n.deal_id === dealId);
    }

    try {
      // Fetch note associations via v4 API (results have toObjectId, not id)
      const assocResponse = await fetch(
        `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/notes`,
        {
          headers: { Authorization: `Bearer ${this.token}` }
        }
      );
      if (!assocResponse.ok) return [];
      const assocData = await assocResponse.json();
      
      const noteIds = (assocData.results || [])
        .map(r => r.toObjectId || r.id)
        .filter(Boolean);
      
      const notesDetails = [];

      for (const noteId of noteIds) {
        try {
          const noteRes = await fetch(
            `https://api.hubapi.com/crm/v3/objects/notes/${noteId}?properties=hs_note_body,hs_createdate`,
            {
              headers: { Authorization: `Bearer ${this.token}` }
            }
          );
          if (!noteRes.ok) continue;
          const note = await noteRes.json();
          notesDetails.push({
            id: note.id,
            deal_id: dealId,
            body: note.properties.hs_note_body,
            timestamp: note.properties.hs_createdate,
            hubspot_id: note.id
          });
        } catch (e) {
          console.warn(`Skipping note ${noteId}:`, e.message);
        }
      }

      return notesDetails;
    } catch (err) {
      console.error(`Error fetching notes for deal ${dealId}:`, err);
      return [];
    }
  }

  async getPipelines() {
    if (this.isMock) {
      return this.mockPipelines;
    }

    try {
      const response = await this.client.crm.pipelines.pipelinesApi.getAll('deals');
      return response.results.map(p => ({
        id: p.id,
        label: p.label,
        stages: p.stages.map((s, idx) => ({
          id: s.id,
          label: s.label,
          displayOrder: s.displayOrder || idx + 1
        }))
      }));
    } catch (err) {
      console.error('Error fetching HubSpot pipelines:', err);
      throw err;
    }
  }

  async updateDealStage(dealId, stageId) {
    if (this.isMock) {
      const deal = this.mockDeals.find(d => d.id === dealId);
      if (deal) {
        deal.dealstage = stageId;
        deal.updated_at = new Date().toISOString();
        deal.days_in_stage = 0; // reset
        return deal;
      }
      throw new Error(`Deal ${dealId} not found`);
    }

    try {
      const response = await this.client.crm.deals.basicApi.update(dealId, {
        properties: { dealstage: stageId }
      });
      return response;
    } catch (err) {
      console.error(`Error updating stage for deal ${dealId}:`, err);
      throw err;
    }
  }

  async addNoteToDeal(dealId, body) {
    if (this.isMock) {
      const newNote = {
        id: 'n' + (this.mockNotes.length + 1),
        deal_id: dealId,
        body: body,
        timestamp: new Date().toISOString()
      };
      this.mockNotes.push(newNote);
      return newNote;
    }

    try {
      // 1. Create a note object via REST API (hs_timestamp is required)
      const noteResponse = await this._hubspotPost('/crm/v3/objects/notes', {
        properties: {
          hs_note_body: body,
          hs_timestamp: new Date().toISOString()
        }
      });
      
      // 2. Associate the note with the deal via REST API (v4 expects array)
      await this._hubspotPut(`/crm/v4/objects/notes/${noteResponse.id}/associations/deals/${dealId}`, [
        {
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 214
        }
      ]);
      
      return {
        id: noteResponse.id,
        deal_id: dealId,
        body,
        timestamp: noteResponse.createdAt || new Date().toISOString()
      };
    } catch (err) {
      console.error(`Error adding note to deal ${dealId}:`, err);
      throw err;
    }
  }

  // Direct REST API helpers for create operations (more reliable than SDK wrappers across versions)
  async _hubspotPost(endpoint, payload) {
    const url = `https://api.hubapi.com${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP-Code: ${res.status}\nMessage: ${text}`);
    }
    return res.json();
  }

  async _hubspotPut(endpoint, payload) {
    const url = `https://api.hubapi.com${endpoint}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP-Code: ${res.status}\nMessage: ${text}`);
    }
    return res.json();
  }

  // Create demo dataset helpers (used by seed route)
  async createContact(props) {
    if (this.isMock) {
      const newContact = {
        id: 'c' + (this.mockContacts.length + 1),
        ...props,
        created_at: new Date().toISOString()
      };
      this.mockContacts.push(newContact);
      return newContact;
    }

    try {
      const response = await this._hubspotPost('/crm/v3/objects/contacts', {
        properties: props
      });
      return { id: response.id, ...response.properties };
    } catch (err) {
      console.error('Error creating contact:', err);
      throw err;
    }
  }

  async createDeal(props, contactId) {
    if (this.isMock) {
      const newDeal = {
        id: 'd' + (this.mockDeals.length + 1),
        ...props,
        contact_id: contactId,
        days_in_stage: 1,
        last_activity: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.mockDeals.push(newDeal);
      return newDeal;
    }

    try {
      const dealResponse = await this._hubspotPost('/crm/v3/objects/deals', {
        properties: props
      });

      // Associate deal with contact (v4 API expects array of specs)
      if (contactId) {
        await this._hubspotPut(`/crm/v4/objects/deals/${dealResponse.id}/associations/contacts/${contactId}`, [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 3
          }
        ]);
      }

      return { id: dealResponse.id, ...dealResponse.properties };
    } catch (err) {
      console.error('Error creating deal:', err);
      throw err;
    }
  }

  async archiveContact(id) {
    if (this.isMock) {
      this.mockContacts = this.mockContacts.filter(c => c.id !== id);
      this.mockDeals = this.mockDeals.filter(d => d.contact_id !== id);
      return true;
    }
    try {
      await this.client.crm.contacts.basicApi.archive(id);
      return true;
    } catch (err) {
      console.error(`Error archiving contact ${id}:`, err);
      return false;
    }
  }

  async archiveDeal(id) {
    if (this.isMock) {
      this.mockDeals = this.mockDeals.filter(d => d.id !== id);
      return true;
    }
    try {
      await this.client.crm.deals.basicApi.archive(id);
      return true;
    } catch (err) {
      console.error(`Error archiving deal ${id}:`, err);
      return false;
    }
  }

  async searchByProperty(objectType, property, value) {
    if (this.isMock) {
      if (objectType === 'contacts') {
        return this.mockContacts.filter(c => c[property] === value);
      }
      return [];
    }

    try {
      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: property,
                operator: 'EQ',
                value: value
              }
            ]
          }
        ]
      });
      return response.results;
    } catch (err) {
      console.error(`Error searching ${objectType} by ${property}:`, err);
      return [];
    }
  }
}

module.exports = new HubSpotService();
