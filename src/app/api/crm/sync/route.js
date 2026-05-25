import { NextResponse } from 'next/server';
import { syncAll } from '../../../../lib/sync-engine';
import thoughtEmitter from '../../../../lib/thought-emitter';

export async function POST() {
  try {
    // Run sync in the background so the HTTP response is instant, and SSE streams the real-time details
    syncAll(thoughtEmitter)
      .then(res => {
        console.log('CRM Sync complete:', res);
      })
      .catch(err => {
        console.error('CRM Sync failed in background:', err);
      });

    return NextResponse.json({
      success: true,
      message: 'CRM synchronization started in background.'
    }, { status: 202 });
  } catch (err) {
    console.error('Error initiating CRM sync:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
