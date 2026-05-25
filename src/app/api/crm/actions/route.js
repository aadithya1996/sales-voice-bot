import { NextResponse } from 'next/server';
import db from '../../../../lib/database';

// GET: Retrieve all queued actions for a session
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Missing sessionId parameter' }, { status: 400 });
    }

    const actions = db.getActions(sessionId);
    return NextResponse.json({
      success: true,
      actions
    });
  } catch (err) {
    console.error('Error getting actions:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Queue a new manual action
export async function POST(req) {
  try {
    const body = await req.json();
    const { sessionId, dealId, dealName, actionType, params, rationale } = body;

    if (!sessionId || !dealId || !dealName || !actionType) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const actionId = db.queueAction(sessionId, dealId, dealName, actionType, params, rationale || 'Manually added');
    
    return NextResponse.json({
      success: true,
      actionId,
      message: 'Action successfully queued.'
    });
  } catch (err) {
    console.error('Error queuing action:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Remove an action from the queue
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const actionId = searchParams.get('actionId');

    if (!actionId) {
      const body = await req.json().catch(() => ({}));
      if (!body.actionId) {
        return NextResponse.json({ success: false, error: 'Missing actionId parameter' }, { status: 400 });
      }
      return removeAction(body.actionId);
    }

    return removeAction(actionId);
  } catch (err) {
    console.error('Error removing action:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function removeAction(actionId) {
  const removed = db.removeAction(actionId);
  if (removed) {
    return NextResponse.json({ success: true, message: `Action ${actionId} removed.` });
  } else {
    return NextResponse.json({ success: false, error: `Action ${actionId} not found.` }, { status: 404 });
  }
}
