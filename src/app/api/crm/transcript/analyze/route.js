import { NextResponse } from 'next/server';
import llm from '../../../../../lib/llm';

export async function POST(req) {
  try {
    const body = await req.json();
    const { transcript, actions } = body;

    if (!transcript) {
      return NextResponse.json({ success: false, error: 'Missing transcript parameter' }, { status: 400 });
    }

    const analysis = await llm.analyzeTranscript(transcript, actions || []);

    return NextResponse.json({
      success: true,
      analysis
    });
  } catch (err) {
    console.error('Error in transcript analysis route:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
