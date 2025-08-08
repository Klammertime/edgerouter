/**
 * GPTRouter Strategy Examples
 * Demonstrates different routing strategies
 */

const GPTRouter = require('../dist').default;

async function testStrategy(strategy, description) {
  console.log(`\n${strategy.toUpperCase()} Strategy: ${description}`);
  console.log('-'.repeat(40));

  const router = new GPTRouter({
    strategy,
    debug: false
  });

  const messages = [
    { role: 'user', content: 'Explain quantum computing in simple terms' }
  ];

  const response = await router.route({ messages });
  
  console.log(`Provider: ${response.routing.provider}`);
  console.log(`Cost: $${response.routing.cost.toFixed(6)}`);
  console.log(`Latency: ${response.routing.latency}ms`);
  console.log(`Reason: ${response.routing.reason}`);
}

async function main() {
  console.log('GPTRouter Strategy Comparison');
  console.log('='.repeat(40));

  await testStrategy('cheapest', 'Minimize cost per request');
  await testStrategy('fastest', 'Minimize response latency');
  await testStrategy('balanced', 'Balance cost and performance');
  await testStrategy('reliability', 'Prioritize provider uptime');
  await testStrategy('privacy-first', 'Keep sensitive data local');

  console.log('\n' + '='.repeat(40));
  console.log('Strategy comparison completed!');
}

main().catch(console.error);