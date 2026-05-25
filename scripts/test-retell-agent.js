require('dotenv').config();
const Retell = require('retell-sdk');

async function testAgentCreation() {
  const client = new Retell({ apiKey: process.env.RETELL_API_KEY });
  
  // Try format 1: response_engine as object with type
  try {
    console.log('Trying format 1: response_engine object with type: custom-llm');
    const agent = await client.agent.create({
      agent_name: 'Pipeline Pilot Agent Test 1',
      voice_id: '11labs-Adrian',
      response_engine: {
        type: 'custom-llm',
        llm_websocket_url: 'wss://eutrophic-rosann-overcontrite.ngrok-free.dev/llm-websocket'
      }
    });
    console.log('✅ Format 1 worked!');
    console.log('Agent:', JSON.stringify(agent, null, 2));
    return;
  } catch (err) {
    console.error('❌ Format 1 failed:', err.message);
  }
  
  // Try format 2: response_engine as string
  try {
    console.log('Trying format 2: response_engine string "custom-llm"');
    const agent = await client.agent.create({
      agent_name: 'Pipeline Pilot Agent Test 2',
      voice_id: '11labs-Adrian',
      response_engine: 'custom-llm',
      llm_websocket_url: 'wss://eutrophic-rosann-overcontrite.ngrok-free.dev/llm-websocket'
    });
    console.log('✅ Format 2 worked!');
    console.log('Agent:', JSON.stringify(agent, null, 2));
    return;
  } catch (err) {
    console.error('❌ Format 2 failed:', err.message);
  }
  
  // Try format 3: response_engine with nested custom_llm_websocket
  try {
    console.log('Trying format 3: custom_llm_websocket object');
    const agent = await client.agent.create({
      agent_name: 'Pipeline Pilot Agent Test 3',
      voice_id: '11labs-Adrian',
      response_engine: {
        type: 'custom-llm',
        custom_llm_websocket: {
          url: 'wss://eutrophic-rosann-overcontrite.ngrok-free.dev/llm-websocket'
        }
      }
    });
    console.log('✅ Format 3 worked!');
    console.log('Agent:', JSON.stringify(agent, null, 2));
    return;
  } catch (err) {
    console.error('❌ Format 3 failed:', err.message);
  }
}

testAgentCreation();
