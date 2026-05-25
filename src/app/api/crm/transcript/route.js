export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '../../../../lib/database';

export async function POST(req) {
  try {
    const body = await req.json();
    const { sessionId, speaker, content } = body;

    if (!sessionId || !speaker || !content) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    db.initDB();
    db.saveTranscriptTurn(sessionId, speaker, content);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving transcript turn:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
