import { NextResponse } from 'next/server';
import { classifyAll } from '../../../../lib/classifier';
import thoughtEmitter from '../../../../lib/thought-emitter';

export async function POST() {
  try {
    // Run classification in the background, emitting events to the UI
    classifyAll(thoughtEmitter)
      .then(res => {
        console.log('LLM Classification complete:', res.length, 'deals.');
      })
      .catch(err => {
        console.error('LLM Classification failed in background:', err);
      });

    return NextResponse.json({
      success: true,
      message: 'LLM classification and prioritization started in background.'
    }, { status: 202 });
  } catch (err) {
    console.error('Error initiating classification:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
