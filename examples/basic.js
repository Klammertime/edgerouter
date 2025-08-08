/**
 * Basic GPTRouter Example
 * Demonstrates core functionality
 */

const GPTRouter = require('../dist').default;

async function main() {
  console.log('GPTRouter Basic Example\n');
  console.log('='.repeat(40));

  // Create router with balanced strategy
  const router = new GPTRouter({
    strategy: 'balanced',
    debug: true
  });

  // Simple request
  console.log('\n1. Simple Request:');
  const response = await router.route({
    messages: [
      { role: 'user', content: 'What is the capital of France?' }
    ]
  });

  console.log('Response:', response.choices[0].message.content);
  console.log('Routing:', response.routing);

  // Get analytics
  console.log('\n2. Analytics:');
  const analytics = router.getAnalytics();
  console.log('Total Requests:', analytics.totalRequests);
  console.log('Total Cost: $' + analytics.totalCost.toFixed(4));
  console.log('Average Latency:', analytics.averageLatency + 'ms');

  console.log('\n' + '='.repeat(40));
  console.log('Example completed successfully!');
}

main().catch(console.error);