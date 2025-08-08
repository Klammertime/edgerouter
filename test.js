/**
 * Simple test for EdgeRouter
 */

const EdgeRouter = require('./index.js');

async function test() {
  console.log('🧪 Testing EdgeRouter\n');
  console.log('=' .repeat(40));
  
  const router = new EdgeRouter({ debug: true });
  
  // Test 1: Normal content (should route to Cloudflare)
  console.log('\n1️⃣ Testing normal content:');
  const normalResponse = await router.route({
    messages: [
      { role: 'user', content: 'What is the capital of France?' }
    ]
  });
  console.log('Provider:', normalResponse.routing.provider);
  console.log('Response:', normalResponse.choices[0].message.content.slice(0, 50) + '...');
  
  // Test 2: Sensitive content (should route to local)
  console.log('\n2️⃣ Testing sensitive content (API key):');
  const sensitiveResponse = await router.route({
    messages: [
      { role: 'user', content: 'My API key is sk_live_abc123xyz' }
    ]
  });
  console.log('Provider:', sensitiveResponse.routing.provider);
  console.log('Reason:', sensitiveResponse.routing.reason);
  console.log('Response:', sensitiveResponse.choices[0].message.content.slice(0, 50) + '...');
  
  // Test 3: Password (should route to local)
  console.log('\n3️⃣ Testing password:');
  const passwordResponse = await router.route({
    messages: [
      { role: 'user', content: 'My password is SuperSecret123!' }
    ]
  });
  console.log('Provider:', passwordResponse.routing.provider);
  console.log('Response:', passwordResponse.choices[0].message.content.slice(0, 50) + '...');
  
  // Test 4: SSN (should route to local)
  console.log('\n4️⃣ Testing SSN:');
  const ssnResponse = await router.route({
    messages: [
      { role: 'user', content: 'Process this SSN: 123-45-6789' }
    ]
  });
  console.log('Provider:', ssnResponse.routing.provider);
  console.log('Response:', ssnResponse.choices[0].message.content.slice(0, 50) + '...');
  
  console.log('\n' + '=' .repeat(40));
  console.log('✅ All tests completed!\n');
}

test().catch(console.error);