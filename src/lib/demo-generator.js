const llm = require('./llm');

/**
 * Demo Data Generator
 * Uses LLM (GPT-4o) to generate realistic B2B SaaS sales scenarios
 * with rich context, then structures them for HubSpot CRM writes.
 */

const SYSTEM_PROMPT = `You are a Sales Operations data architect. Generate exactly 4 realistic B2B SaaS sales deals for a demo CRM environment.

REQUIREMENTS:
- Each deal must have a unique contact (first name, last name, email, company, phone)
- Deal values between $15,000 and $60,000
- Mix of pipeline stages: Appointment Scheduled, Qualified To Buy, Presentation Scheduled, Contract Sent
- NO closed won or closed lost deals (we want active pipeline for voice review)
- Companies should be realistic tech/SaaS firms
- Each deal needs 1-2 rich CRM notes with realistic sales context (blockers, next steps, stakeholder dynamics)
- Notes should include specific details: names of stakeholders, technical concerns, budget conversations, timeline pressure
- Vary the scenarios: one enterprise deal, one mid-market, one integration-heavy, one competitive situation

OUTPUT FORMAT:
Return a single JSON object with this exact schema:
{
  "deals": [
    {
      "contact": {
        "firstname": "string",
        "lastname": "string",
        "email": "string (realistic company domain)",
        "company": "string",
        "phone": "string (+1-555-XXXX format)"
      },
      "deal": {
        "dealname": "string (product + company name style)",
        "amount": number,
        "dealstage": "string (one of: appointmentscheduled, qualifiedtobuy, presentationscheduled, contractsent)",
        "days_in_stage": number (1-14),
        "pipeline": "default"
      },
      "notes": [
        {
          "body": "string (rich sales note with context, stakeholders, blockers, next actions)",
          "days_ago": number (0-10)
        }
      ]
    }
  ]
}

Make the data feel like real Salesforce/HubSpot CRM records from a busy SaaS AE. Include specific names, dollar amounts, technical concerns, and political dynamics.`;

async function generateDemoDataset() {
  console.log('🧠 Requesting LLM to generate realistic demo dataset...');

  try {
    const response = await llm.generateResponse([
      { role: 'system', content: 'You are a data generation engine that outputs only valid JSON conforming to the requested schema.' },
      { role: 'user', content: SYSTEM_PROMPT }
    ]);

    // Parse the LLM response
    let parsed;
    try {
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseErr) {
      console.error('Failed to parse LLM demo response. Raw:', response.substring(0, 500));
      throw new Error('LLM returned invalid JSON for demo data');
    }

    if (!parsed.deals || !Array.isArray(parsed.deals) || parsed.deals.length !== 4) {
      console.warn('LLM did not return exactly 4 deals. Got:', parsed.deals?.length);
      throw new Error('LLM demo data missing or incorrect deal count');
    }

    // Validate and normalize each deal
    const validatedDeals = parsed.deals.map((d, idx) => {
      const deal = d.deal || {};
      const contact = d.contact || {};
      const notes = d.notes || [];

      // Normalize dealstage
      const validStages = ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled', 'contractsent'];
      let stage = (deal.dealstage || 'qualifiedtobuy').toLowerCase().replace(/\s/g, '');
      if (!validStages.includes(stage)) stage = 'qualifiedtobuy';

      return {
        contact: {
          firstname: contact.firstname || `Contact${idx + 1}`,
          lastname: contact.lastname || `Lastname${idx + 1}`,
          email: contact.email || `demo${idx + 1}@example.com`,
          company: contact.company || 'Demo Company',
          phone: contact.phone || `+1-555-0${100 + idx}`
        },
        deal: {
          dealname: deal.dealname || `Demo Deal ${idx + 1}`,
          amount: Math.max(15000, Math.min(60000, Number(deal.amount) || 25000)),
          dealstage: stage,
          pipeline: 'default',
          days_in_stage: Math.max(1, Math.min(14, Number(deal.days_in_stage) || 3))
        },
        notes: notes.map(n => ({
          body: n.body || 'No additional context provided.',
          days_ago: Math.max(0, Math.min(10, Number(n.days_ago) || 1))
        }))
      };
    });

    console.log(`✅ LLM generated ${validatedDeals.length} realistic demo deals`);
    validatedDeals.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.deal.dealname} — $${d.deal.amount.toLocaleString()} — ${d.deal.dealstage} — ${d.contact.company}`);
    });

    return validatedDeals;

  } catch (err) {
    console.error('Demo generation failed:', err.message);
    console.log('⚠️  Falling back to pre-built realistic demo dataset');
    return getFallbackDemoDataset();
  }
}

/**
 * Fallback dataset if LLM fails — still realistic but pre-built
 */
function getFallbackDemoDataset() {
  return [
    {
      contact: {
        firstname: 'Sarah',
        lastname: 'Chen',
        email: 'sarah.chen@quantumleap.io',
        company: 'QuantumLeap AI',
        phone: '+1-555-0199'
      },
      deal: {
        dealname: 'QuantumLeap ML Pipeline Enterprise',
        amount: 52000,
        dealstage: 'qualifiedtobuy',
        pipeline: 'default',
        days_in_stage: 12
      },
      notes: [
        {
          body: '[DEMO] Sarah showed strong interest in enterprise tier during discovery call. Wants to see custom ML model integrations demo. CTO Rajesh needs to review security architecture before next week.',
          days_ago: 5
        },
        {
          body: '[DEMO] Follow-up: Sent security whitepaper. Sarah confirmed they have budget approval for Q3. Timeline is tight — competitor DataRobot is also pitching.',
          days_ago: 2
        }
      ]
    },
    {
      contact: {
        firstname: 'Marcus',
        lastname: 'Johnson',
        email: 'marcus.j@acmeindustries.com',
        company: 'Acme Industries',
        phone: '+1-555-0144'
      },
      deal: {
        dealname: 'Acme Industries Data Suite',
        amount: 34000,
        dealstage: 'contractsent',
        pipeline: 'default',
        days_in_stage: 5
      },
      notes: [
        {
          body: '[DEMO] Legal team reviewing contract. Marcus flagged concerns about data residency clause — wants EU data stored in Frankfurt region. Procurement cycle typically 3 weeks.',
          days_ago: 4
        },
        {
          body: '[DEMO] Marcus confirmed they are happy with pricing. Just waiting on legal sign-off. Suggested we prepare implementation timeline for faster onboarding post-signature.',
          days_ago: 1
        }
      ]
    },
    {
      contact: {
        firstname: 'Priya',
        lastname: 'Patel',
        email: 'priya@dataflowsys.com',
        company: 'DataFlow Systems',
        phone: '+1-555-0188'
      },
      deal: {
        dealname: 'DataFlow Analytics Upgrade',
        amount: 28000,
        dealstage: 'presentationscheduled',
        pipeline: 'default',
        days_in_stage: 3
      },
      notes: [
        {
          body: '[DEMO] Priya loved the demo dashboard. Her team of 12 data analysts needs real-time streaming capabilities. Concerned about pricing per-seat model — wants enterprise flat rate.',
          days_ago: 3
        },
        {
          body: '[DEMO] Priya mentioned they are evaluating 3 vendors. Our real-time feature is the differentiator. She needs a proof-of-concept by end of month for board presentation.',
          days_ago: 1
        }
      ]
    },
    {
      contact: {
        firstname: 'James',
        lastname: "O'Brien",
        email: 'jobrien@cloudbase.co',
        company: 'CloudBase Corp',
        phone: '+1-555-0166'
      },
      deal: {
        dealname: 'CloudBase Infrastructure Monitoring',
        amount: 41000,
        dealstage: 'appointmentscheduled',
        pipeline: 'default',
        days_in_stage: 8
      },
      notes: [
        {
          body: '[DEMO] Initial call with James. CloudBase runs 200+ microservices and needs unified observability. Current tool (Datadog) is getting expensive at $80k/year. Looking for cost-effective alternative.',
          days_ago: 7
        },
        {
          body: '[DEMO] James introduced me to their DevOps lead, Aisha. Aisha wants to see Kubernetes-native integration and auto-scaling alerts. POC environment access requested.',
          days_ago: 2
        }
      ]
    }
  ];
}

module.exports = {
  generateDemoDataset,
  getFallbackDemoDataset
};
