/**
 * EdgeRouter - Advanced multi-provider AI orchestration platform
 * Intelligently routes requests across providers based on cost, speed, privacy, and reliability
 */

class EdgeRouter {
  constructor(config = {}) {
    // Provider configurations with cost and latency
    this.providers = {
      cloudflare: {
        endpoint: config.endpoints?.cloudflare || 'https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1/chat/completions',
        cost: 0.001,
        latency: 50,
        reliability: 0.99,
        privacy: 'cloud',
        status: 'healthy'
      },
      openai: {
        endpoint: config.endpoints?.openai || 'https://api.openai.com/v1/chat/completions',
        cost: 0.015,
        latency: 200,
        reliability: 0.995,
        privacy: 'cloud',
        status: 'healthy'
      },
      anthropic: {
        endpoint: config.endpoints?.anthropic || 'https://api.anthropic.com/v1/messages',
        cost: 0.012,
        latency: 180,
        reliability: 0.99,
        privacy: 'cloud',
        status: 'healthy'
      },
      local: {
        endpoint: config.endpoints?.local || 'http://localhost:11434/v1/chat/completions',
        cost: 0,
        latency: 100,
        reliability: 1.0,
        privacy: 'local',
        status: 'healthy'
      },
      groq: {
        endpoint: config.endpoints?.groq || 'https://api.groq.com/openai/v1/chat/completions',
        cost: 0.0001,
        latency: 30,
        reliability: 0.95,
        privacy: 'cloud',
        status: 'healthy'
      },
      together: {
        endpoint: config.endpoints?.together || 'https://api.together.xyz/v1/chat/completions',
        cost: 0.002,
        latency: 60,
        reliability: 0.97,
        privacy: 'cloud',
        status: 'healthy'
      }
    };

    // Merge user provider configs
    if (config.providers) {
      Object.keys(config.providers).forEach(name => {
        if (this.providers[name]) {
          Object.assign(this.providers[name], config.providers[name]);
        }
      });
    }
    
    this.credentials = config.credentials || {};
    this.strategy = config.strategy || 'balanced';
    this.debug = config.debug || false;
    
    // Health checking
    this.healthCheck = {
      interval: config.healthCheckInterval || 60000,
      timeout: config.healthCheckTimeout || 5000,
      failureThreshold: 3,
      failures: new Map(),
      lastCheck: new Map()
    };
    
    // Budget management
    this.budgetManager = {
      daily: config.dailyBudget || 10.00,
      monthly: config.monthlyBudget || 200.00,
      spent: this.initializeSpentTracking(),
      alerts: []
    };
    
    // Analytics
    this.analytics = {
      requests: new Map(),
      latencies: new Map(),
      errors: new Map(),
      costs: new Map(),
      startTime: Date.now()
    };
    
    // Routing strategies
    this.strategies = {
      'cheapest': () => this.routeToCheapest(),
      'fastest': () => this.routeToFastest(),
      'balanced': () => this.routeBalanced(),
      'privacy-first': () => this.routePrivacyFirst(),
      'reliability': () => this.routeReliability()
    };
    
    // Start health checking
    if (config.enableHealthCheck !== false) {
      this.startHealthChecking();
    }
  }

  /**
   * Initialize spent tracking for all providers
   */
  initializeSpentTracking() {
    const spent = {};
    Object.keys(this.providers).forEach(name => {
      spent[name] = 0;
    });
    return spent;
  }

  /**
   * Check if content contains sensitive data
   */
  containsSensitive(messages) {
    const patterns = [
      /api[_-]?key/i,
      /sk_live_/,
      /pk_live_/,
      /sk_test_/,
      /bearer\s+/i,
      /password/i,
      /secret/i,
      /token/i,
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /private/i,
      /confidential/i,
      /medical/i,
      /health\s+record/i,
      /patient/i
    ];
    
    return messages.some(msg => 
      patterns.some(pattern => 
        pattern.test(String(msg.content || ''))
      )
    );
  }

  /**
   * Estimate token count for cost calculation
   */
  estimateTokens(messages) {
    const text = messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4); // Rough estimate
  }

  /**
   * Route request based on selected strategy
   */
  async route(request) {
    const { messages } = request;
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid request: messages array required');
    }
    
    // Check for sensitive content
    const hasSensitive = this.containsSensitive(messages);
    
    // Force local for sensitive content
    if (hasSensitive) {
      return this.routeToProvider('local', request, 'sensitive_content');
    }
    
    // Use selected strategy
    const strategyFn = this.strategies[this.strategy];
    if (!strategyFn) {
      throw new Error(`Unknown strategy: ${this.strategy}`);
    }
    
    const provider = await strategyFn.call(this);
    return this.routeToProvider(provider, request, this.strategy);
  }

  /**
   * Route to cheapest available provider
   */
  routeToCheapest() {
    const available = this.getHealthyProviders();
    return available.sort((a, b) => 
      this.providers[a].cost - this.providers[b].cost
    )[0];
  }

  /**
   * Route to fastest available provider
   */
  routeToFastest() {
    const available = this.getHealthyProviders();
    return available.sort((a, b) => 
      this.providers[a].latency - this.providers[b].latency
    )[0];
  }

  /**
   * Balance cost and speed
   */
  routeBalanced() {
    const available = this.getHealthyProviders();
    return available.sort((a, b) => {
      const scoreA = this.providers[a].cost * 100 + this.providers[a].latency;
      const scoreB = this.providers[b].cost * 100 + this.providers[b].latency;
      return scoreA - scoreB;
    })[0];
  }

  /**
   * Prioritize privacy
   */
  routePrivacyFirst() {
    const available = this.getHealthyProviders();
    const local = available.filter(p => this.providers[p].privacy === 'local');
    if (local.length > 0) return local[0];
    return this.routeToCheapest();
  }

  /**
   * Route for maximum reliability with fallback
   */
  routeReliability() {
    const available = this.getHealthyProviders();
    return available.sort((a, b) => 
      this.providers[b].reliability - this.providers[a].reliability
    )[0];
  }

  /**
   * Get list of healthy providers
   */
  getHealthyProviders() {
    return Object.keys(this.providers).filter(name => 
      this.providers[name].status === 'healthy'
    );
  }

  /**
   * Route to specific provider
   */
  async routeToProvider(providerName, request, reason) {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    
    // Check budget
    const tokens = this.estimateTokens(request.messages);
    const estimatedCost = tokens * provider.cost / 1000;
    
    if (!this.checkBudget(providerName, estimatedCost)) {
      // Over budget, find cheaper alternative
      const alternative = this.findCheaperAlternative(providerName);
      if (alternative !== providerName) {
        return this.routeToProvider(alternative, request, 'budget_exceeded');
      }
    }
    
    // Track analytics
    this.trackRequest(providerName, estimatedCost);
    
    if (this.debug) {
      console.log(`[EdgeRouter] Routing to: ${providerName}`);
      console.log(`[EdgeRouter] Reason: ${reason}`);
      console.log(`[EdgeRouter] Estimated cost: $${estimatedCost.toFixed(4)}`);
    }
    
    // Mock response for now
    const response = await this.mockProviderResponse(providerName, request);
    
    // Add routing metadata
    response.routing = {
      provider: providerName,
      reason: reason,
      cost: estimatedCost,
      latency: provider.latency
    };
    
    return response;
  }

  /**
   * Check if request fits in budget
   */
  checkBudget(provider, cost) {
    const dailySpent = this.budgetManager.spent[provider] || 0;
    if (dailySpent + cost > this.budgetManager.daily) {
      this.budgetManager.alerts.push({
        type: 'daily_budget_exceeded',
        provider: provider,
        timestamp: Date.now()
      });
      return false;
    }
    return true;
  }

  /**
   * Find cheaper alternative to provider
   */
  findCheaperAlternative(currentProvider) {
    const current = this.providers[currentProvider];
    const alternatives = this.getHealthyProviders()
      .filter(p => this.providers[p].cost < current.cost)
      .sort((a, b) => this.providers[a].cost - this.providers[b].cost);
    
    return alternatives[0] || currentProvider;
  }

  /**
   * Track request for analytics
   */
  trackRequest(provider, cost) {
    // Update request count
    const count = this.analytics.requests.get(provider) || 0;
    this.analytics.requests.set(provider, count + 1);
    
    // Update costs
    const totalCost = this.analytics.costs.get(provider) || 0;
    this.analytics.costs.set(provider, totalCost + cost);
    
    // Update budget spent
    this.budgetManager.spent[provider] = (this.budgetManager.spent[provider] || 0) + cost;
  }

  /**
   * Mock provider response
   */
  async mockProviderResponse(provider, request) {
    const responses = {
      cloudflare: '[Cloudflare] Fast and affordable response',
      openai: '[OpenAI] High quality, reliable response',
      anthropic: '[Anthropic] Thoughtful and detailed response',
      local: '[Local] Private and secure response',
      groq: '[Groq] Lightning fast response',
      together: '[Together] Collaborative AI response'
    };
    
    return {
      id: `${provider}-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: `${provider}-model`,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: responses[provider] || `[${provider}] Response`
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 25,
        total_tokens: 75
      }
    };
  }

  /**
   * Start health checking for providers
   */
  startHealthChecking() {
    setInterval(() => {
      Object.keys(this.providers).forEach(name => {
        this.checkProviderHealth(name);
      });
    }, this.healthCheck.interval);
  }

  /**
   * Check health of a specific provider
   */
  async checkProviderHealth(provider) {
    // Mock health check for now
    // In production, would ping the actual endpoint
    const isHealthy = Math.random() > 0.1; // 90% healthy
    
    if (!isHealthy) {
      const failures = this.healthCheck.failures.get(provider) || 0;
      this.healthCheck.failures.set(provider, failures + 1);
      
      if (failures >= this.healthCheck.failureThreshold) {
        this.providers[provider].status = 'unhealthy';
        if (this.debug) {
          console.log(`[EdgeRouter] Provider ${provider} marked unhealthy`);
        }
      }
    } else {
      this.healthCheck.failures.set(provider, 0);
      this.providers[provider].status = 'healthy';
    }
    
    this.healthCheck.lastCheck.set(provider, Date.now());
  }

  /**
   * Get analytics summary
   */
  getAnalytics() {
    const totalRequests = Array.from(this.analytics.requests.values())
      .reduce((a, b) => a + b, 0);
    
    const totalCost = Array.from(this.analytics.costs.values())
      .reduce((a, b) => a + b, 0);
    
    const uptime = Date.now() - this.analytics.startTime;
    
    return {
      totalRequests,
      totalCost,
      uptime,
      requestsByProvider: Object.fromEntries(this.analytics.requests),
      costsByProvider: Object.fromEntries(this.analytics.costs),
      healthStatus: Object.fromEntries(
        Object.keys(this.providers).map(p => [p, this.providers[p].status])
      ),
      budgetStatus: {
        daily: {
          limit: this.budgetManager.daily,
          spent: Object.values(this.budgetManager.spent).reduce((a, b) => a + b, 0)
        },
        alerts: this.budgetManager.alerts
      }
    };
  }

  /**
   * Generate analytics dashboard HTML
   */
  getDashboardHTML() {
    const analytics = this.getAnalytics();
    return `
<!DOCTYPE html>
<html>
<head>
  <title>EdgeRouter Analytics</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: system-ui; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; }
    .metric { font-size: 2em; font-weight: bold; color: #4CAF50; }
    .label { color: #666; font-size: 0.9em; }
    canvas { max-height: 300px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 EdgeRouter Analytics Dashboard</h1>
    
    <div class="grid">
      <div class="card">
        <div class="label">Total Requests</div>
        <div class="metric">${analytics.totalRequests}</div>
      </div>
      
      <div class="card">
        <div class="label">Total Cost</div>
        <div class="metric">$${analytics.totalCost.toFixed(2)}</div>
      </div>
      
      <div class="card">
        <div class="label">Daily Budget</div>
        <div class="metric">$${analytics.budgetStatus.daily.spent.toFixed(2)} / $${analytics.budgetStatus.daily.limit}</div>
      </div>
      
      <div class="card">
        <div class="label">Savings vs OpenAI Only</div>
        <div class="metric">$${(analytics.totalRequests * 0.015 - analytics.totalCost).toFixed(2)}</div>
      </div>
    </div>
    
    <div class="grid" style="margin-top: 20px;">
      <div class="card">
        <h3>Requests by Provider</h3>
        <canvas id="requestsChart"></canvas>
      </div>
      
      <div class="card">
        <h3>Cost Breakdown</h3>
        <canvas id="costsChart"></canvas>
      </div>
      
      <div class="card">
        <h3>Provider Status</h3>
        ${Object.entries(analytics.healthStatus).map(([p, s]) => 
          `<div>${p}: <span style="color: ${s === 'healthy' ? 'green' : 'red'}">${s}</span></div>`
        ).join('')}
      </div>
    </div>
  </div>
  
  <script>
    // Requests chart
    new Chart(document.getElementById('requestsChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(Object.keys(analytics.requestsByProvider))},
        datasets: [{
          label: 'Requests',
          data: ${JSON.stringify(Object.values(analytics.requestsByProvider))},
          backgroundColor: '#4CAF50'
        }]
      }
    });
    
    // Costs chart
    new Chart(document.getElementById('costsChart'), {
      type: 'pie',
      data: {
        labels: ${JSON.stringify(Object.keys(analytics.costsByProvider))},
        datasets: [{
          data: ${JSON.stringify(Object.values(analytics.costsByProvider))},
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
        }]
      }
    });
  </script>
</body>
</html>
    `;
  }

  /**
   * Express/Connect middleware
   */
  middleware() {
    return async (req, res, next) => {
      // Handle dashboard route
      if (req.path === '/dashboard' && req.method === 'GET') {
        res.set('Content-Type', 'text/html');
        return res.send(this.getDashboardHTML());
      }
      
      // Handle API requests
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