import { NextResponse } from 'next/server';
import { syncAll } from '../../../../lib/sync-engine';
import thoughtEmitter from '../../../../lib/thought-emitter';

export async function POST() {
  try {
    // Wait for the sync to complete and return the result, which acts as a robust fallback for SSE
    const result = await syncAll(thoughtEmitter);
    console.log('CRM Sync complete:', result);

    return NextResponse.json({
      success: true,
      message: 'CRM synchronization completed.',
      result
    });
  } catch (err) {
    console.error('Error during CRM sync:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}

