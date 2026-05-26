const { OpenAI } = require('openai');

class LLMService {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'openai'; // 'openai' | 'gemini'
    this.openAiKey = process.env.OPENAI_API_KEY;
    this.geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

    // Auto-detect provider if default is selected but keys are mismatching
    if (this.provider === 'openai' && !this.openAiKey && this.geminiKey) {
      this.provider = 'gemini';
    } else if (this.provider === 'gemini' && !this.geminiKey && this.openAiKey) {
      this.provider = 'openai';
    }

    this.isMock = (this.provider === 'openai' && (!this.openAiKey || this.openAiKey === 'your_openai_api_key')) ||
                  (this.provider === 'gemini' && (!this.geminiKey || this.geminiKey === 'your_gemini_api_key'));

    if (this.isMock) {
      console.log(`LLMService initialized in MOCK mode (Provider: ${this.provider})`);
    } else if (this.provider === 'openai') {
      this.openai = new OpenAI({ apiKey: this.openAiKey });
      console.log('LLMService initialized with OpenAI.');
    } else if (this.provider === 'gemini') {
      console.log('LLMService initialized with Gemini (dist dynamic loading).');
    }
  }

  async _getGeminiClient() {
    if (this._geminiClient) return this._geminiClient;
    const { GoogleGenAI } = await import('@google/genai');
    this._geminiClient = new GoogleGenAI({ apiKey: this.geminiKey });
    return this._geminiClient;
  }

  // 1. Classification Engine: analyzes deals and outputs structured JSON
  async classifyDeals(deals, stages) {
    const systemPrompt = `You are a Sales Operations intelligence system. Analyze the following sales deals and pipeline stages to prioritize today's action plan for a sales rep.
    
PIPELINE STAGES:
${JSON.stringify(stages, null, 2)}

DEALS DATA:
${JSON.stringify(deals, null, 2)}

TASK:
1. Classify each deal and assign a priority (1 to 5, where 5 is highest urgency/impact).
2. Categorize each deal into one of these:
   - 'FOLLOW_UP_URGENT': Needs action today, e.g. stale in critical stage or customer waiting.
   - 'STAGE_ADVANCE': Clear pathway to move to next stage (agreement reached or task done).
   - 'AT_RISK': High stale days, lack of activity, or negative/hesitant notes.
   - 'CLOSE_READY': Contract sent, positive signal, final push.
   - 'NOTE_NEEDED': Update CRM notes, missing activity.
   - 'CELEBRATE': Recently closed won, highlight as win.
   - 'DEPRIORITIZE': Low value, low activity, or not worth focus today.
3. Write a concise 'reasoning' (1-2 sentences) justifying your priority and category.
4. Recommend CRM actions (array of actions) with 'type' and 'params'. Supported actions:
   - type: 'crm_stage_move', params: { target_stage: 'stage_id' }
   - type: 'crm_note', params: { note_text: 'content of CRM note' }
   - type: 'crm_flag_risk', params: { note_text: 'risk description' }
5. Provide a short 'voice_brief' (1-2 sentences) summarizing what the sales bot should tell the rep in their morning review.

Ensure your response is valid JSON matching this schema:
{
  "classifications": [
    {
      "deal_id": "string",
      "deal_name": "string",
      "priority": number (1-5),
      "category": "FOLLOW_UP_URGENT" | "STAGE_ADVANCE" | "AT_RISK" | "CLOSE_READY" | "NOTE_NEEDED" | "CELEBRATE" | "DEPRIORITIZE",
      "reasoning": "string",
      "recommended_actions": [
        { "type": "crm_stage_move" | "crm_note" | "crm_flag_risk", "params": {}, "rationale": "string" }
      ],
      "voice_brief": "string"
    }
  ]
}`;

    if (this.isMock) {
      return this._mockClassification(deals, stages);
    }

    try {
      if (this.provider === 'openai') {
        const response = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a CRM analytics assistant that outputs valid JSON conforming to the requested schema.' },
            { role: 'user', content: systemPrompt }
          ],
          response_format: { type: 'json_object' }
        });
        const parsed = JSON.parse(response.choices[0].message.content);
        return parsed.classifications || [];
      } else if (this.provider === 'gemini') {
        const ai = await this._getGeminiClient();
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        
        const response = await ai.models.generateContent({
          model: modelName,
          contents: systemPrompt,
          config: {
            responseMimeType: 'application/json',
            systemInstruction: 'You are a CRM analytics assistant that outputs valid JSON conforming to the requested schema.'
          }
        });
        
        const text = response.text;
        const parsed = JSON.parse(text);
        return parsed.classifications || [];
      }
    } catch (err) {
      console.error('Error during LLM classification:', err);
      // Fallback to rules-based mock to keep the app working
      return this._mockClassification(deals, stages);
    }
  }

  // 2. Chat / Voice Stream completion for Retell Custom LLM Protocol
  async streamChatResponse(messages, onChunk) {
    if (this.isMock) {
      return this._mockStreamChat(messages, onChunk);
    }

    try {
      if (this.provider === 'openai') {
        const responseStream = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: messages,
          stream: true
        });

        for await (const chunk of responseStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            onChunk(content);
          }
        }
      } else if (this.provider === 'gemini') {
        const ai = await this._getGeminiClient();
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        // Map OpenAI messages array to Gemini contents
        let systemInstructionText = 'You are a helpful sales operational assistant.';
        const geminiMessages = [];

        for (const msg of messages) {
          if (msg.role === 'system') {
            systemInstructionText = msg.content;
          } else {
            geminiMessages.push({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            });
          }
        }

        const responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents: geminiMessages,
          config: {
            systemInstruction: systemInstructionText
          }
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            onChunk(text);
          }
        }
      }
    } catch (err) {
      console.error('Error streaming LLM response:', err);
      throw err;
    }
  }

  async generateResponse(messages) {
    if (this.isMock) {
      return "I'm running in mock mode. Please configure your API keys in the dashboard.";
    }

    try {
      if (this.provider === 'openai') {
        const response = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: messages
        });
        return response.choices[0].message.content;
      } else if (this.provider === 'gemini') {
        const ai = await this._getGeminiClient();
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        let systemInstructionText = '';
        const geminiMessages = [];

        for (const msg of messages) {
          if (msg.role === 'system') {
            systemInstructionText = msg.content;
          } else {
            geminiMessages.push({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            });
          }
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: geminiMessages,
          config: {
            systemInstruction: systemInstructionText || undefined
          }
        });

        return response.text;
      }
    } catch (err) {
      console.error('Error generating LLM response:', err);
      return `Failed to generate response: ${err.message}`;
    }
  }

  // Fallback Rule-Based mock classifier for instant local dev
  _mockClassification(deals, stages) {
    console.log('Using rule-based MOCK classifier for deals.');
    return deals.map(deal => {
      let priority = 2;
      let category = 'NOTE_NEEDED';
      let recommendedActions = [];
      let reasoning = `Standard review of deal ${deal.dealname}.`;
      let voiceBrief = `Let's review the deal ${deal.dealname}.`;

      // Simple heuristic classifier
      if (deal.dealstage === 'closedwon') {
        priority = 5;
        category = 'CELEBRATE';
        reasoning = `The deal is closed won! We should celebrate this success.`;
        voiceBrief = `Congratulations on winning ${deal.dealname}! It's officially closed won.`;
      } else if (deal.days_in_stage > 10 && deal.dealstage !== 'closedlost') {
        priority = 4;
        category = 'AT_RISK';
        reasoning = `Stale for ${deal.days_in_stage} days in the '${deal.dealstage}' stage with no updates.`;
        recommendedActions.push({
          type: 'crm_flag_risk',
          params: { note_text: `Deal is stale in ${deal.dealstage} for ${deal.days_in_stage} days. Please follow up.` },
          rationale: `Deal has exceeded typical stage duration thresholds.`
        });
        voiceBrief = `${deal.dealname} is at risk, sitting stale in stage for ${deal.days_in_stage} days. I suggest logging a risk flag and scheduling a quick check-in.`;
      } else if (deal.dealstage === 'contractsent') {
        priority = 4;
        category = 'CLOSE_READY';
        reasoning = `Contract is already sent and deal value is $${deal.amount.toLocaleString()}. Needs final signatures.`;
        recommendedActions.push({
          type: 'crm_stage_move',
          params: { target_stage: 'closedwon' },
          rationale: `Once client signs contract, move to closed won.`
        });
        voiceBrief = `${deal.dealname} has a contract out. If they're ready to sign, we can move this straight to Closed Won today.`;
      } else if (deal.dealstage === 'presentationscheduled' || deal.dealstage === 'qualifiedtobuy') {
        priority = 3;
        category = 'STAGE_ADVANCE';
        reasoning = `Well positioned. Needs confirmation to advance to next stage.`;
        // Find next stage
        const defaultStages = ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled', 'decisionmakerboughtin', 'contractsent', 'closedwon'];
        const currentIdx = defaultStages.indexOf(deal.dealstage);
        const nextStage = currentIdx !== -1 && currentIdx + 1 < defaultStages.length ? defaultStages[currentIdx + 1] : 'contractsent';
        
        recommendedActions.push({
          type: 'crm_stage_move',
          params: { target_stage: nextStage },
          rationale: `Demo completed and positive signals received.`
        });
        voiceBrief = `Let's talk about ${deal.dealname}. It looks ready to advance. Shall we queue a stage move?`;
      }

      return {
        deal_id: deal.id,
        deal_name: deal.dealname,
        priority,
        category,
        reasoning,
        recommended_actions: recommendedActions,
        voice_brief: voiceBrief
      };
    });
  }

  // Simulated streamer for local dev without keys
  _mockStreamChat(messages, onChunk) {
    return new Promise((resolve) => {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      let replyText = "Hello! I am Alex, your AI Sales assistant. I am running in mock mode because your API keys aren't set yet, but I can guide you through your deals. Would you like to review TechCorp first?";
      
      if (lastUserMsg.toLowerCase().includes('techcorp') || lastUserMsg.toLowerCase().includes('yes') || lastUserMsg.toLowerCase().includes('sure')) {
        replyText = "Great! TechCorp Enterprise Platform has been in Qualified to Buy for 12 days. I recommend logging a risk flag and following up. [ACTION]{\"type\":\"crm_flag_risk\",\"deal_id\":\"d1\",\"deal_name\":\"TechCorp Enterprise Platform\",\"params\":{\"note_text\":\"Flagging risk due to 12 stale days.\"},\"rationale\":\"12 days stale in stage\"}[/ACTION] Should we do that?";
      } else if (lastUserMsg.toLowerCase().includes('acme')) {
        replyText = "Acme Industries Data Suite is in Contract Sent. If the contract is signed, I can move it to Closed Won. [ACTION]{\"type\":\"crm_stage_move\",\"deal_id\":\"d2\",\"deal_name\":\"Acme Industries Data Suite\",\"params\":{\"target_stage\":\"closedwon\"},\"rationale\":\"Contract signed by Marcus\"}[/ACTION] Shall I queue that up?";
      } else if (lastUserMsg.toLowerCase().includes('done') || lastUserMsg.toLowerCase().includes('finish') || lastUserMsg.toLowerCase().includes('bye')) {
        replyText = "Awesome! We have queued those items. You can review them on the screen and execute the sync. Speak to you tomorrow!";
      }

      // Stream the response out character by character / word by word
      const words = replyText.split(' ');
      let i = 0;
      const interval = setInterval(() => {
        if (i < words.length) {
          onChunk((i === 0 ? '' : ' ') + words[i]);
          i++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, 70); // 70ms per word
    });
  }

  async analyzeTranscript(transcript, actions) {
    const transcriptText = transcript.map(t => `${t.speaker === 'agent' ? 'Alex' : 'Rep'}: ${t.content}`).join('\n');
    
    const systemPrompt = `You are a Sales Operations intelligence system. Analyze the following daily review call transcript and list of queued actions.
    
TRANSCRIPT:
${transcriptText}

QUEUED ACTIONS:
${JSON.stringify(actions, null, 2)}

TASK:
Analyze the transcript and generate:
1. 'repSentiment': Summarize how the sales rep felt during the conversation (e.g. tone, confidence level, energy, challenges faced). Keep it to 1-2 sentences.
2. 'managerNotes': Identify any specific instructions, messages, requests, or updates they explicitly conveyed to or wanted shared with their manager (e.g. discount approvals, blocker assistance). If none, state "No specific instructions conveyed."
3. 'generalUpdates': Extract a list of any general updates, achievements, team shout-outs, team pulse details, or general notes mentioned by the rep that are NOT specific to any individual deal. If none, return an empty array.
4. 'dealSummaries': A mapping where each key is a deal name and the value is a consolidated, summarized message (1-2 sentences) of what was discussed and decided during the call for that deal. This summary must combine all actions and conversation points into one concise update.

Ensure your response is valid JSON matching this schema:
{
  "repSentiment": "string",
  "managerNotes": "string",
  "generalUpdates": ["string"],
  "dealSummaries": {
    "Deal Name 1": "string",
    "Deal Name 2": "string"
  }
}`;

    if (this.isMock) {
      return this._mockAnalysis(transcript, actions);
    }

    try {
      if (this.provider === 'openai') {
        const response = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a CRM transcript analysis assistant that outputs valid JSON conforming to the requested schema.' },
            { role: 'user', content: systemPrompt }
          ],
          response_format: { type: 'json_object' }
        });
        return JSON.parse(response.choices[0].message.content);
      } else if (this.provider === 'gemini') {
        const ai = await this._getGeminiClient();
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        
        const response = await ai.models.generateContent({
          model: modelName,
          contents: systemPrompt,
          config: {
            responseMimeType: 'application/json',
            systemInstruction: 'You are a CRM transcript analysis assistant that outputs valid JSON conforming to the requested schema.'
          }
        });
        return JSON.parse(response.text);
      }
    } catch (err) {
      console.error('Error during LLM transcript analysis:', err);
      return this._mockAnalysis(transcript, actions);
    }
  }

  _mockAnalysis(transcript, actions) {
    // Return realistic mock analysis
    return {
      repSentiment: "Energetic and collaborative, despite some pipeline stress.",
      managerNotes: "Highlighted that the team is buzzing about the new release, and mentioned an upside-down demo in standup. Requested manager attention on the legal review blocker for Acme.",
      generalUpdates: [
        "Intern tried to demo upside down in standup; team is buzzing about the release."
      ],
      dealSummaries: {
        "TechCorp Enterprise Platform": "Discussed integration doc delays. Flagged risk due to being stale in stage for 12 days.",
        "Acme Industries Data Suite": "Marcus raised concerns over data residency clause. Added a CRM note and queued stage move to Closed Won once signature is completed."
      }
    };
  }
}

module.exports = new LLMService();
