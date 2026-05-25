import { NextResponse } from 'next/server';
import { executeActions } from '../../../../../lib/action-executor';
import thoughtEmitter from '../../../../../lib/thought-emitter';

export async function POST(req) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Missing sessionId parameter' }, { status: 400 });
    }

    // Run execution in the background so the user sees immediate UI feedback via SSE
    executeActions(sessionId, thoughtEmitter)
      .then(results => {
        console.log(`Executed action queue for session ${sessionId}:`, results);
      })
      .catch(err => {
        console.error(`Failed executing action queue for session ${sessionId}:`, err);
      });

    return NextResponse.json({
      success: true,
      message: 'Execution of CRM actions started.'
    });
  } catch (err) {
    console.error('Error executing actions:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
