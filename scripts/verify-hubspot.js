const hubspot = require('@hubspot/api-client');

async function testConnection() {
  const client = new hubspot.Client({ accessToken: 'pat-na2-c94f7db4-e19f-476c-a309-e723ae8e8a54' });
  
  try {
    console.log('Testing HubSpot connection...');
    const account = await client.crm.owners.ownersApi.getPage();
    console.log('✅ Connection successful!');
    console.log(`Account: ${account.results.length} owners found`);
    
    const contacts = await client.crm.contacts.basicApi.getPage(5);
    console.log(`✅ Contacts: ${contacts.results.length} contacts fetched`);
    
    const pipelines = await client.crm.pipelines.pipelinesApi.getAll('deals');
    console.log(`✅ Pipelines: ${pipelines.results.length} pipelines found`);
    
    console.log('\n🔑 Your HubSpot token is working correctly!');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
