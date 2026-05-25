import { NextResponse } from 'next/server';
import hubspot from '../../../../lib/hubspot';
import db from '../../../../lib/database';
import thoughtEmitter from '../../../../lib/thought-emitter';

/**
 * Clear Demo Data API
 * Deletes all previously seeded demo records from HubSpot CRM.
 * Uses the demo_records tracking table to know exactly what was created.
 */
export async function POST() {
  const emitProgress = (progress, status) => {
    thoughtEmitter.emit('sync_progress', { progress, status });
    console.log(`Clear Progress [${progress}%]: ${status}`);
  };

  try {
    emitProgress(5, 'Checking for previously seeded demo data...');
    db.initDB();

    const records = db.getAllDemoRecords();

    if (records.length === 0) {
      emitProgress(100, 'No previous demo data found. HubSpot is clean.', { success: true, cleared: 0 });
      return NextResponse.json({
        success: true,
        message: 'No previous demo data to clear.',
        cleared: 0
      });
    }

    emitProgress(10, `Found ${records.length} previously seeded demo records. Starting cleanup...`);

    let deletedContacts = 0;
    let deletedDeals = 0;
    let errors = [];

    // Sort by type to delete deals first (they depend on contacts)
    const deals = records.filter(r => r.record_type === 'deal');
    const contacts = records.filter(r => r.record_type === 'contact');

    // Delete deals first
    for (let i = 0; i < deals.length; i++) {
      const record = deals[i];
      emitProgress(10 + Math.round(((i + 1) / records.length) * 80), `Deleting deal ${i + 1}/${deals.length}...`);
      try {
        await hubspot.archiveDeal(record.hubspot_id);
        deletedDeals++;
      } catch (e) {
        console.warn(`Failed to delete deal ${record.hubspot_id}:`, e.message);
        errors.push(`Deal ${record.hubspot_id}: ${e.message}`);
      }
    }

    // Then delete contacts
    for (let i = 0; i < contacts.length; i++) {
      const record = contacts[i];
      emitProgress(10 + Math.round(((deals.length + i + 1) / records.length) * 80), `Deleting contact ${i + 1}/${contacts.length}...`);
      try {
        await hubspot.archiveContact(record.hubspot_id);
        deletedContacts++;
      } catch (e) {
        console.warn(`Failed to delete contact ${record.hubspot_id}:`, e.message);
        errors.push(`Contact ${record.hubspot_id}: ${e.message}`);
      }
    }

    // Clear the tracking table
    db.clearAllDemoRecords();

    const totalDeleted = deletedContacts + deletedDeals;
    emitProgress(100, `Cleanup complete! Removed ${totalDeleted} demo records from HubSpot.`, { success: true, cleared: totalDeleted });

    return NextResponse.json({
      success: true,
      message: `Cleared ${totalDeleted} demo records from HubSpot (${deletedContacts} contacts, ${deletedDeals} deals).`,
      cleared: totalDeleted,
      contacts: deletedContacts,
      deals: deletedDeals,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    console.error('Error clearing demo data:', err);
    emitProgress(100, `Clear failed: ${err.message}`);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
