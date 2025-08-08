/**
 * GPTRouter Budget Management Example
 * Demonstrates cost control features
 */

const GPTRouter = require('../dist').default;

async function main() {
  console.log('GPTRouter Budget Management Example');
  console.log('='.repeat(40));

  // Create router with strict budget limits
  const router = new GPTRouter({
    strategy: 'balanced',
    dailyBudget: 0.01,    // $0.01 daily limit for demo
    monthlyBudget: 0.30,   // $0.30 monthly limit
    debug: true
  });

  console.log('\nBudget Configuration:');
  console.log('Daily Budget: $0.01');
  console.log('Monthly Budget: $0.30');
  console.log('Strategy: balanced');

  // Make several requests to demonstrate budget tracking
  console.log('\nMaking requests...\n');

  for (let i = 1; i <= 5; i++) {
    console.log(`Request ${i}:`);
    
    try {
      const response = await router.route({
        messages: [
          { role: 'user', content: `Question ${i}: What is ${i} + ${i}?` }
        ]
      });

      console.log(`  Provider: ${response.routing.provider}`);
      console.log(`  Cost: $${response.routing.cost.toFixed(6)}`);
      
      // Check budget status
      const analytics = router.getAnalytics();
      console.log(`  Daily spent: $${analytics.budgetStatus.daily.spent.toFixed(4)} / $${analytics.budgetStatus.daily.limit}`);
      console.log(`  Remaining: $${analytics.budgetStatus.daily.remaining.toFixed(4)}`);
      
      if (analytics.budgetStatus.daily.remaining <= 0) {
        console.log('  ⚠️  Daily budget exceeded! Router will use cheapest available providers.');
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    
    console.log('');
  }

  // Final analytics
  console.log('='.repeat(40));
  console.log('\nFinal Analytics:');
  const finalAnalytics = router.getAnalytics();
  
  console.log('\nTotal Statistics:');
  console.log(`  Requests: ${finalAnalytics.totalRequests}`);
  console.log(`  Total Cost: $${finalAnalytics.totalCost.toFixed(4)}`);
  console.log(`  Avg Cost/Request: $${(finalAnalytics.totalCost / finalAnalytics.totalRequests).toFixed(6)}`);
  
  console.log('\nProvider Breakdown:');
  for (const [provider, count] of Object.entries(finalAnalytics.requestsByProvider)) {
    if (count > 0) {
      const cost = finalAnalytics.costsByProvider[provider] || 0;
      console.log(`  ${provider}: ${count} requests, $${cost.toFixed(4)}`);
    }
  }
  
  console.log('\nBudget Status:');
  console.log(`  Daily: $${finalAnalytics.budgetStatus.daily.spent.toFixed(4)} / $${finalAnalytics.budgetStatus.daily.limit}`);
  if (finalAnalytics.budgetStatus.monthly) {
    console.log(`  Monthly: $${finalAnalytics.budgetStatus.monthly.spent.toFixed(4)} / $${finalAnalytics.budgetStatus.monthly.limit}`);
  }

  // Clean up
  router.destroy();
}

main().catch(console.error);