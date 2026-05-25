require('dotenv').config();
const Retell = require('retell-sdk');

async function verifyRetell() {
  const client = new Retell({ apiKey: process.env.RETELL_API_KEY });
  try {
    const agents = await client.agent.list();
    console.log('✅ Retell API connected successfully!');
    console.log(`   Agents found: ${agents.length}`);
    if (agents.length > 0) {
      console.log(`   First agent: ${agents[0].agent_name} (${agents[0].agent_id})`);
    }
    
    // Check voice options
    const voices = await client.voice.list();
    console.log(`   Available voices: ${voices.length}`);
    const adrianVoice = voices.find(v => v.voice_id === '11labs-Adrian');
    if (adrianVoice) {
      console.log(`   ✅ 11labs-Adrian voice is available`);
    } else {
      console.log(`   ⚠️  11labs-Adrian not found. Available voices: ${voices.map(v => v.voice_id).slice(0, 5).join(', ')}...`);
    }
  } catch (err) {
    console.error('❌ Retell API error:', err.message);
    if (err.status === 401) console.error('   Invalid API key');
    if (err.status === 429) console.error('   Rate limited');
    process.exit(1);
  }
}

verifyRetell();
