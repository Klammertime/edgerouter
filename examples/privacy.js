/**
 * EdgeRouter Privacy Protection Example
 * Demonstrates automatic sensitive content detection and routing
 */

const EdgeRouter = require('../dist').default;

async function testPrivacy(content, description) {
  const router = new EdgeRouter({
    strategy: 'cheapest',  // Even with cheapest, sensitive data goes local
    debug: true
  });

  console.log(`\nTest: ${description}`);
  console.log('Content:', content.substring(0, 50) + '...');
  
  const response = await router.route({
    messages: [{ role: 'user', content }]
  });

  console.log(`Routed to: ${response.routing.provider}`);
  console.log(`Reason: ${response.routing.reason}`);
  
  router.destroy();
}

async function main() {
  console.log('EdgeRouter Privacy Protection Example');
  console.log('='.repeat(40));
  console.log('\nTesting sensitive content detection...');

  // Test various types of content
  await testPrivacy(
    'What is the weather like today in Paris?',
    'Normal content (should route to cheapest)'
  );

  await testPrivacy(
    'My API key is sk_live_abc123xyz456 and I need help',
    'Contains API key (should route to local)'
  );

  await testPrivacy(
    'Reset password: MyS3cur3P@ssw0rd!',
    'Contains password (should route to local)'
  );

  await testPrivacy(
    'Process payment for SSN 123-45-6789',
    'Contains SSN (should route to local)'
  );

  await testPrivacy(
    'Card number 4532-1234-5678-9012 exp 12/25',
    'Contains credit card (should route to local)'
  );

  await testPrivacy(
    'Patient diagnosis: hypertension, prescription: lisinopril 10mg',
    'Contains medical data (should route to local)'
  );

  await testPrivacy(
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
    'Contains Bearer token (should route to local)'
  );

  console.log('\n' + '='.repeat(40));
  console.log('Privacy test completed!');
  console.log('\nKey Insights:');
  console.log('• Sensitive data automatically routes to local models');
  console.log('• Privacy protection overrides cost optimization');
  console.log('• No sensitive data is sent to cloud providers');
}

main().catch(console.error);