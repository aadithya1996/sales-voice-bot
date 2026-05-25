const Retell = require('retell-sdk');

class RetellService {
  constructor() {
    this.apiKey = process.env.RETELL_API_KEY;
    this.isMock = !this.apiKey || this.apiKey === 'your_retell_api_key' || this.apiKey.startsWith('mock_');
    
    if (!this.isMock) {
      this.client = new Retell({ apiKey: this.apiKey });
    } else {
      console.log('RetellService initialized in MOCK mode.');
    }
  }

  async createOrUpdateAgent(wsUrl) {
    if (this.isMock) {
      console.log('RetellService: Mock agent created with LLM websocket:', wsUrl);
      return 'mock_agent_123';
    }

    try {
      // Find or create agent with custom LLM pointing to our WebSocket server
      const agents = await this.client.agent.list();
      const existingAgent = agents.find(a => a.agent_name === 'Pipeline Pilot Agent');

      const agentData = {
        agent_name: 'Pipeline Pilot Agent',
        voice_id: '11labs-Adrian', // Sleek, crisp professional male voice
        response_engine: {
          type: 'custom-llm',
          llm_websocket_url: wsUrl
        }
      };

      if (existingAgent) {
        console.log(`Updating existing Retell Agent: ${existingAgent.agent_id}`);
        const updatedAgent = await this.client.agent.update(existingAgent.agent_id, agentData);
        return updatedAgent.agent_id;
      } else {
        console.log('Creating new Retell Agent...');
        const newAgent = await this.client.agent.create(agentData);
        return newAgent.agent_id;
      }
    } catch (err) {
      console.error('Error creating/updating Retell Agent:', err);
      // Degrade gracefully to mock instead of crashing, but print warning
      console.warn('Falling back to mock agent due to Retell API failure');
      return 'mock_agent_123';
    }
  }

  async createWebCall(agentId, metadata = {}) {
    if (this.isMock || agentId === 'mock_agent_123') {
      console.log(`RetellService: Creating mock web call for agent ${agentId}`);
      return {
        access_token: 'mock_call_access_token_xyz_123',
        call_id: 'mock_call_id_' + Math.random().toString(36).substring(7)
      };
    }

    try {
      const call = await this.client.call.createWebCall({
        agent_id: agentId,
        metadata: metadata
      });
      return {
        access_token: call.access_token,
        call_id: call.call_id
      };
    } catch (err) {
      console.error('Error creating Retell web call:', err);
      // Fallback to mock so UI doesn't crash on local dev without working API key
      return {
        access_token: 'mock_call_access_token_xyz_123',
        call_id: 'mock_call_id_err_' + Math.random().toString(36).substring(7)
      };
    }
  }

  async getAgent(agentId) {
    if (this.isMock) {
      return {
        agent_id: agentId,
        agent_name: 'Pipeline Pilot Agent (Mock)',
        voice_id: '11labs-Adrian'
      };
    }

    try {
      const agent = await this.client.agent.retrieve(agentId);
      return agent;
    } catch (err) {
      console.error(`Error retrieving Retell Agent ${agentId}:`, err);
      return {
        agent_id: agentId,
        agent_name: 'Pipeline Pilot Agent (Failed Retrieve)',
        voice_id: '11labs-Adrian'
      };
    }
  }
}

module.exports = new RetellService();
