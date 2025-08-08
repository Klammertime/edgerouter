/**
 * EdgeRouter - Intelligent AI request router
 * Routes to optimal provider based on content sensitivity and cost
 */

class EdgeRouter {
  constructor(config = {}) {
    this.providers = {
      local: config.localEndpoint || 'http://localhost:11434/v1/chat/completions',
      cloudflare: config.cloudflareEndpoint || null,
      openai: config.openaiEndpoint || 'https://api.openai.com/v1/chat/completions'
    };
    
    this.credentials = {
      cloudflare: {
        apiKey: config.cloudflareApiKey || process.env.CLOUDFLARE_API_KEY,
        accountId: config.cloudflareAccountId || process.env.CLOUDFLARE_ACCOUNT_ID
      },
      openai: {
        apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY
      }
    };
    
    this.debug = config.debug || false;
    this.preferLocal = config.preferLocal || false;
  }

  /**
   * Check if content contains sensitive data
   */
  containsSensitive(messages) {
    const patterns = [
      /api[_-]?key/i,
      /sk_live_/,
      /pk_live_/,
      /bearer\s+/i,
      /password/i,
      /secret/i,
      /token/i,
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /private/i,
      /confidential/i
    ];
    
    return messages.some(msg => 
      patterns.some(pattern => 
        pattern.test(String(msg.content || ''))
      )
    );
  }

  /**
   * Route request to appropriate provider
   */
  async route(request) {
    const { messages } = request;
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid request: messages array required');
    }
    
    // Determine routing
    const hasSensitive = this.containsSensitive(messages);
    let provider = 'cloudflare'; // default to cheapest
    
    if (hasSensitive || this.preferLocal) {
      provider = 'local';
    }
    
    if (this.debug) {
      console.log(`[EdgeRouter] Routing to: ${provider}`);
      console.log(`[EdgeRouter] Sensitive content: ${hasSensitive}`);
    }
    
    // Route to provider
    switch (provider) {
      case 'local':
        return this.routeToLocal(request);
      case 'cloudflare':
        return this.routeToCloudflare(request);
      case 'openai':
        return this.routeToOpenAI(request);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Route to local model (mock for now)
   */
  async routeToLocal(request) {
    // Mock response for now
    const mockResponse = {
      id: `local-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'local-model',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: '[Local Model] Processing locally for privacy. In production, this would connect to your local LLM.'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 25,
        total_tokens: 75
      },
      routing: {
        provider: 'local',
        reason: 'sensitive_content'
      }
    };
    
    return mockResponse;
  }

  /**
   * Route to Cloudflare (mock for now)
   */
  async routeToCloudflare(request) {
    if (!this.credentials.cloudflare.apiKey) {
      // Fall back to mock if no credentials
      return this.mockCloudflareResponse(request);
    }
    
    // Would implement actual Cloudflare API call here
    return this.mockCloudflareResponse(request);
  }

  /**
   * Mock Cloudflare response
   */
  mockCloudflareResponse(request) {
    return {
      id: `cf-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'cloudflare-model',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: '[Cloudflare] Fast and cheap response. This would use Cloudflare Workers AI in production.'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 30,
        completion_tokens: 20,
        total_tokens: 50
      },
      routing: {
        provider: 'cloudflare',
        reason: 'cost_optimized'
      }
    };
  }

  /**
   * Route to OpenAI (not implemented yet)
   */
  async routeToOpenAI(request) {
    throw new Error('OpenAI routing not yet implemented');
  }

  /**
   * Express/Connect middleware
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const result = await this.route(req.body);
        res.json(result);
      } catch (error) {
        if (this.debug) {
          console.error('[EdgeRouter] Error:', error);
        }
        res.status(500).json({ 
          error: error.message 
        });
      }
    };
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EdgeRouter;
  module.exports.EdgeRouter = EdgeRouter;
  module.exports.default = EdgeRouter;
}