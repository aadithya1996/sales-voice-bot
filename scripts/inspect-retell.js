require('dotenv').config();
const Retell = require('retell-sdk');

async function inspectRetellAPI() {
  const client = new Retell({ apiKey: process.env.RETELL_API_KEY });
  
  try {
    const agents = await client.agent.list();
    console.log('Found', agents.length, 'agents');
    if (agents.length > 0) {
      console.log('First agent keys:', Object.keys(agents[0]));
      console.log('First agent:', JSON.stringify(agents[0], null, 2));
    }
    
    // Check voice API
    const voices = await client.voice.list();
    console.log('Found', voices.length, 'voices');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspectRetellAPI();
