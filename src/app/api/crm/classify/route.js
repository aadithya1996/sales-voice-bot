import { NextResponse } from 'next/server';
import { classifyAll } from '../../../../lib/classifier';
import thoughtEmitter from '../../../../lib/thought-emitter';

export async function POST() {
  try {
    // Wait for the classification to complete, which acts as a robust fallback for SSE
    const result = await classifyAll(thoughtEmitter);
    console.log('LLM Classification complete:', result.length, 'deals.');

    return NextResponse.json({
      success: true,
      message: 'LLM classification and prioritization completed.',
      count: result.length
    });
  } catch (err) {
    console.error('Error during classification:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}

