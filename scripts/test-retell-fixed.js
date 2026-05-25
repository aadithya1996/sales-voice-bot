require('dotenv').config();
const retell = require('../src/lib/retell');

async function testAgentCreation() {
  const wsUrl = process.env.RETELL_WS_URL;
  console.log('Testing agent creation with WS URL:', wsUrl);
  
  try {
    const agentId = await retell.createOrUpdateAgent(wsUrl);
    console.log('✅ Agent created/updated:', agentId);
    
    const agent = await retell.getAgent(agentId);
    console.log('Agent details:', JSON.stringify(agent, null, 2));
    
    // Test web call
    const callData = await retell.createWebCall(agentId, { source: 'test' });
    console.log('✅ Web call created:', callData.call_id);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testAgentCreation();
