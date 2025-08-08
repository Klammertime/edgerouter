/**
 * GPTRouter Express Integration Example
 * Demonstrates usage with Express.js web framework
 */

const express = require('express');
const GPTRouter = require('../dist').default;

// Note: This example requires express to be installed
// Run: npm install express

async function main() {
  console.log('GPTRouter Express Integration Example');
  console.log('='.repeat(40));
  console.log('\nStarting Express server...');

  const app = express();
  const router = new GPTRouter({
    strategy: 'balanced',
    dailyBudget: 10.00,
    debug: false
  });

  // Middleware
  app.use(express.json());

  // Mount EdgeRouter middleware
  app.use(router.middleware());

  // Additional custom route
  app.get('/', (req, res) => {
    res.json({
      service: 'GPTRouter API',
      endpoints: {
        chat: 'POST /chat',
        dashboard: 'GET /dashboard'
      },
      instructions: {
        chat: 'Send POST request with { messages: [{ role: "user", content: "..." }] }',
        dashboard: 'Visit /dashboard in browser for analytics'
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`\nServer running on http://localhost:${PORT}`);
    console.log('\nAvailable endpoints:');
    console.log(`  GET  http://localhost:${PORT}/          - API info`);
    console.log(`  POST http://localhost:${PORT}/chat      - Chat endpoint`);
    console.log(`  GET  http://localhost:${PORT}/dashboard - Analytics dashboard`);
    console.log('\nPress Ctrl+C to stop the server');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down gracefully...');
    router.destroy();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Check if express is installed
try {
  require('express');
  main().catch(console.error);
} catch (error) {
  console.log('This example requires Express.js');
  console.log('Please run: npm install express');
  console.log('\nAlternatively, you can test the middleware functionality directly:');
  console.log('\nconst GPTRouter = require(\'gptrouter\');');
  console.log('const router = new GPTRouter({ strategy: \'balanced\' });');
  console.log('app.use(router.middleware());');
}