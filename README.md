# edgerouter

Intelligent routing layer for multiple AI providers. Automatically routes requests based on cost, latency, privacy requirements, and provider availability.

## Installation

```bash
npm install edgerouter
```

## Quick Start

```javascript
const EdgeRouter = require('edgerouter');

const router = new EdgeRouter({
  strategy: 'balanced' // or 'cheapest', 'fastest', 'privacy-first'
});

const response = await router.route({
  messages: [{ role: 'user', content: 'Hello' }]
});
```

## Features

- **Multi-provider support**: OpenAI, Anthropic, Cloudflare, Groq, Together, local models
- **Automatic failover**: Routes around provider outages automatically
- **Cost optimization**: Track and limit spending with built-in budget controls
- **Privacy detection**: Automatically routes sensitive data to local models
- **Health monitoring**: Continuous provider health checks
- **Analytics**: Built-in dashboard for monitoring usage and costs

## Routing Strategies

- `cheapest`: Minimizes cost per request
- `fastest`: Minimizes latency
- `balanced`: Optimizes cost vs performance
- `privacy-first`: Routes sensitive data locally
- `reliability`: Prioritizes provider uptime

## Configuration

```javascript
const router = new EdgeRouter({
  strategy: 'balanced',
  dailyBudget: 10.00,
  monthlyBudget: 200.00,
  providers: {
    openai: { cost: 0.015, latency: 200 },
    cloudflare: { cost: 0.001, latency: 50 }
  }
});
```

## Privacy Protection

Automatically detects and routes sensitive content (API keys, passwords, SSNs, medical data) to local models.

## Analytics

Access the dashboard at `/dashboard` for real-time metrics.

## API

### `router.route(request)`
Routes a request to the optimal provider.

### `router.getAnalytics()`
Returns current usage statistics.

### `router.middleware()`
Express middleware for easy integration.

## License

MIT