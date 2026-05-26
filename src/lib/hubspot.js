const hubspot = require('@hubspot/api-client');

class HubSpotService {
  constructor() {
    this.token = process.env.HUBSPOT_ACCESS_TOKEN;
    this.isMock = !this.token || this.token === 'your_hubspot_access_token' || this.token.startsWith('mock_');
    
    if (!this.isMock) {
      this.client = new hubspot.Client({ accessToken: this.token });
    } else {
      console.log('HubSpotService initialized in MOCK mode.');
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

  async _runWithFallback(fn) {
    if (this.isMock) {
      return fn();
    }
    try {
      return await fn();
    } catch (err) {
      const is401 = err.code === 401 || 
                    err.statusCode === 401 || 
                    err.status === 401 ||
                    (err.message && err.message.includes('401')) ||
                    (err.body && err.body.status === 'error' && err.body.category === 'INVALID_AUTHENTICATION');
      if (is401) {
        console.warn('HubSpot API returned 401 Unauthorized. Dynamically switching HubSpotService to MOCK mode.');
        this.isMock = true;
        this._initMocks();
        return fn();
      }
      throw err;
    }
  }

  async getAllContacts() {
    return this._runWithFallback(async () => {
      if (this.isMock) {
        return this.mockContacts;
      }

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
    });
  }

  async getAllDeals() {
    return this._runWithFallback(async () => {
      if (this.isMock) {
        return this.mockDeals;
      }

      const allDeals = [];
      let after = undefined;
      let hasMore = true;

      while (hasMore) {
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
    });
  }

  async getDealNotes(dealId) {
    return this._runWithFallback(async () => {
      if (this.isMock) {
        return this.mockNotes.filter(n => n.deal_id === dealId);
      }

      const assocResponse = await fetch(
        `https://api.hubapi.com/crm/v4/objects/deals/${dealId}/associations/notes`,
        {
          headers: { Authorization: `Bearer ${this.token}` }
        }
      );
      if (!assocResponse.ok) {
        if (assocResponse.status === 401) {
          const err = new Error('HTTP-Code: 401');
          err.status = 401;
          throw err;
        }
        return [];
      }
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
          if (!noteRes.ok) {
            if (noteRes.status === 401) {
              const err = new Error('HTTP-Code: 401');
              err.status = 401;
              throw err;
            }
            continue;
          }
          const note = await noteRes.json();
          notesDetails.push({
            id: note.id,
            deal_id: dealId,
            body: note.properties.hs_note_body,
            timestamp: note.properties.hs_createdate,
            hubspot_id: note.id
          });
        } catch (e) {
          if (e.status === 401) throw e;
          console.warn(`Skipping note ${noteId}:`, e.message);
        }
      }

      return notesDetails;
    });
  }

  async getPipelines() {
    return this._runWithFallback(async () => {
      if (this.isMock) {
        return this.mockPipelines;
      }

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
    });
  }

  async updateDealStage(dealId, stageId) {
    return this._runWithFallback(async () => {
      if (this.isMock) {
        const deal = this.mockDeals.find(d => d.id === dealId);
        if (deal) {
          deal.dealstage = stageId;
          deal.updated_at = new Date().toISOString();
          deal.days_in_stage = 0;
          return deal;
        }
        throw new Error(`Deal ${dealId} not found`);
      }

      const response = await this.client.crm.deals.basicApi.update(dealId, {
        properties: { dealstage: stageId }
      });
      return response;
    });
  }

  async addNoteToDeal(dealId, body) {
    return this._runWithFallback(async () => {
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

      const noteResponse = await this._hubspotPost('/crm/v3/objects/notes', {
        properties: {
          hs_note_body: body,
          hs_timestamp: new Date().toISOString()
        }
      });
      
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
    });
  }

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
      const err = new Error(`HTTP-Code: ${res.status}\nMessage: ${text}`);
      err.status = res.status;
      throw err;
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
      const err = new Error(`HTTP-Code: ${res.status}\nMessage: ${text}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async createContact(props) {
    return this._runWithFallback(async () => {
      if (this.isMock) {
        const newContact = {
          id: 'c' + (this.mockContacts.length + 1),
          ...props,
          created_at: new Date().toISOString()
        };
        this.mockContacts.push(newContact);
        return newContact;
      }

      const response = await this._hubspotPost('/crm/v3/objects/contacts', {
        properties: props
      });
      return { id: response.id, ...response.properties };
    });
  }

  async createDeal(props, contactId) {
    return this._runWithFallback(async () => {
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

      const dealResponse = await this._hubspotPost('/crm/v3/objects/deals', {
        properties: props
      });

      if (contactId) {
        await this._hubspotPut(`/crm/v4/objects/deals/${dealResponse.id}/associations/contacts/${contactId}`, [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 3
          }
        ]);
      }

      return { id: dealResponse.id, ...dealResponse.properties };
    });
  }

  async archiveContact(id) {
    return this._runWithFallback(async () => {
      if (this.isMock) {
        this.mockContacts = this.mockContacts.filter(c => c.id !== id);
        this.mockDeals = this.mockDeals.filter(d => d.contact_id !== id);
        return true;
      }
      await this.client.crm.contacts.basicApi.archive(id);
      return true;
    });
  }

  async archiveDeal(id) {
    return this._runWithFallback(async () => {
      if (this.isMock) {
        this.mockDeals = this.mockDeals.filter(d => d.id !== id);
        return true;
      }
      await this.client.crm.deals.basicApi.archive(id);
      return true;
    });
  }

  async searchByProperty(objectType, property, value) {
    return this._runWithFallback(async () => {
      if (this.isMock) {
        if (objectType === 'contacts') {
          return this.mockContacts.filter(c => c[property] === value);
        }
        return [];
      }

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
    });
  }
}

module.exports = new HubSpotService();
