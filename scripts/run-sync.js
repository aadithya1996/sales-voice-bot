require('dotenv').config();
const { syncAll } = require('../src/lib/sync-engine');

async function runSync() {
  console.log('🔄 Starting HubSpot CRM sync...\n');
  try {
    const result = await syncAll();
    console.log('\n✅ Sync completed successfully!');
    console.log(`   Contacts synced: ${result.contactsCount}`);
    console.log(`   Deals synced: ${result.dealsCount}`);
  } catch (err) {
    console.error('\n❌ Sync failed:', err.message);
    process.exit(1);
  }
}

runSync();
