require('dotenv').config();
const Retell = require('retell-sdk');

async function cleanupTestAgents() {
  const client = new Retell({ apiKey: process.env.RETELL_API_KEY });
  
  try {
    const agents = await client.agent.list();
    const testAgents = agents.filter(a => a.agent_name.includes('Test'));
    
    console.log(`Found ${testAgents.length} test agents to delete...`);
    for (const agent of testAgents) {
      await client.agent.delete(agent.agent_id);
      console.log(`Deleted test agent: ${agent.agent_name}`);
    }
    console.log('Cleanup complete!');
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

cleanupTestAgents();
