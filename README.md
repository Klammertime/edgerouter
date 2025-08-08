# EdgeRouter

> Intelligent AI request router - automatically routes to optimal providers based on content sensitivity and cost.

## Features

- 🔒 **Privacy-First**: Sensitive content stays local
- 💰 **Cost-Optimized**: Public content uses cheapest provider
- 🎯 **Simple Rules**: Sensitive→Local, Public→Cheapest
- 🔌 **OpenAI Compatible**: Drop-in replacement format

## Installation

```bash
npm install edgerouter
```

## Quick Start

```javascript
const EdgeRouter = require('edgerouter');

const router = new EdgeRouter({
  // Optional: configure endpoints
  localEndpoint: 'http://localhost:11434/v1/chat/completions',
  cloudflareApiKey: process.env.CLOUDFLARE_API_KEY,
  debug: true
});

// Route a request
const response = await router.route({
  messages: [
    { role: 'user', content: 'What is the weather?' }
  ]
});

// Response includes routing info
console.log(response.routing);
// { provider: 'cloudflare', reason: 'cost_optimized' }
```

## Routing Logic

EdgeRouter automatically detects and routes:

| Content Type | Routes To | Reason |
|-------------|-----------|---------|
| API Keys | Local | Privacy |
| Passwords | Local | Privacy |
| Tokens | Local | Privacy |
| SSNs | Local | Privacy |
| Normal | Cloudflare | Cost |

## Express Integration

```javascript
const express = require('express');
const EdgeRouter = require('edgerouter');

const app = express();
const router = new EdgeRouter({ debug: true });

app.use(express.json());
app.post('/chat', router.middleware());

app.listen(3000);
```

## Configuration

```javascript
const router = new EdgeRouter({
  // Endpoints
  localEndpoint: 'http://localhost:11434/v1/chat/completions',
  
  // Credentials (optional)
  cloudflareApiKey: 'your-key',
  cloudflareAccountId: 'your-account',
  openaiApiKey: 'your-key',
  
  // Options
  debug: true,           // Show routing decisions
  preferLocal: false     // Always use local when available
});
```

## Response Format

All responses follow OpenAI's format with added routing info:

```json
{
  "id": "chat-123",
  "object": "chat.completion",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Response text"
    }
  }],
  "routing": {
    "provider": "cloudflare",
    "reason": "cost_optimized"
  }
}
```

## Roadmap

- [ ] Real Cloudflare integration
- [ ] Real local model integration (Ollama, etc)
- [ ] OpenAI fallback
- [ ] Custom routing rules
- [ ] Response caching
- [ ] Load balancing

## License

MIT © Klammertime