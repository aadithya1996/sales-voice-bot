export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import thoughtEmitter from '../../../../lib/thought-emitter';

/**
 * Event Bridge API
 * Receives events from the standalone WebSocket server (ws-server.js)
 * and forwards them to the Dashboard via the shared thought-emitter SSE stream.
 *
 * This solves the cross-process communication problem:
 * ws-server.js (port 8080) → POST /api/events/forward → Next.js (port 3000) → SSE → Dashboard
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { secret, type, data } = body;

    // Validate shared secret
    if (secret !== process.env.BRIDGE_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!type) {
      return NextResponse.json({ success: false, error: 'Missing event type' }, { status: 400 });
    }

    // Forward to Dashboard SSE subscribers
    thoughtEmitter.emit(type, data);

    return NextResponse.json({ success: true, forwarded: type });
  } catch (err) {
    console.error('Event bridge error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
