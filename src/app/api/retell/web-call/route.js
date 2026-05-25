import { NextResponse } from 'next/server';
import retell from '../../../../lib/retell';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    
    // Determine the web socket URL for Retell callback.
    // If running in local dev, this is the ngrok URL (e.g., wss://xxxx.ngrok-free.app/llm-websocket)
    const wsUrl = process.env.RETELL_WS_URL || 'wss://localhost:8080/llm-websocket';
    
    console.log(`Setting up Retell Agent callback pointing to: ${wsUrl}`);
    
    // Create/update the agent with this WebSocket URL
    const agentId = await retell.createOrUpdateAgent(wsUrl);
    
    // Start the call session
    const callData = await retell.createWebCall(agentId, {
      source: 'web_dashboard',
      created_at: new Date().toISOString()
    });

    console.log(`Retell web call initialized. Access Token: ${callData.access_token}, Call ID: ${callData.call_id}`);
    
    return NextResponse.json({
      success: true,
      agent_id: agentId,
      access_token: callData.access_token,
      call_id: callData.call_id
    });
  } catch (err) {
    console.error('Error starting web call:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
