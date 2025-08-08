/**
 * GPTRouter - Intelligent routing for GPT models
 * Automatically choose between GPT-5, GPT-4, Claude, local models and more
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface Provider {
  name: string;
  endpoint?: string;
  cost: number;      // per 1K tokens
  latency: number;   // ms average
  available: boolean;
  reliability?: number;
  privacy?: 'cloud' | 'local';
}

export interface RoutingInfo {
  provider: string;
  cost: number;
  latency: number;
  reason: string;
}

export interface ChatResponse {
  id?: string;
  object?: string;
  created?: number;
  model: string;
  choices: Array<{
    index?: number;
    message: Message;
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  routing: RoutingInfo;
}

export type Strategy = 'cheapest' | 'fastest' | 'balanced' | 'privacy-first' | 'reliability';

export interface RouterConfig {
  strategy: Strategy;
  dailyBudget?: number;
  monthlyBudget?: number;
  providers?: Record<string, Partial<Provider>>;
  healthCheckInterval?: number;
  debug?: boolean;
}

export interface Analytics {
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  requestsByProvider: Record<string, number>;
  costsByProvider: Record<string, number>;
  averageLatency: number;
  budgetStatus: {
    daily: {
      spent: number;
      limit: number;
      remaining: number;
    };
    monthly?: {
      spent: number;
      limit: number;
      remaining: number;
    };
  };
}

class GPTRouter {
  private providers: Map<string, Provider>;
  private strategy: Strategy;
  private dailyBudget: number;
  private monthlyBudget: number;
  private spending: Map<string, number>;
  private requestCount: number = 0;
  private totalTokens: number = 0;
  private requestsByProvider: Map<string, number>;
  private latencies: number[] = [];
  private dailySpent: number = 0;
  private monthlySpent: number = 0;
  private lastResetDate: Date;
  private debug: boolean;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: RouterConfig) {
    this.strategy = config.strategy;
    this.dailyBudget = config.dailyBudget || Infinity;
    this.monthlyBudget = config.monthlyBudget || Infinity;
    this.debug = config.debug || false;
    
    this.providers = new Map();
    this.spending = new Map();
    this.requestsByProvider = new Map();
    this.lastResetDate = new Date();
    
    this.initializeProviders(config.providers);
    
    if (config.healthCheckInterval) {
      this.startHealthChecks(config.healthCheckInterval);
    }
  }

  private initializeProviders(custom?: Record<string, Partial<Provider>>) {
    const defaults: Record<string, Provider> = {
      openai: { 
        name: 'openai',
        cost: 0.015, 
        latency: 200, 
        available: true,
        reliability: 0.99,
        privacy: 'cloud'
      },
      anthropic: { 
        name: 'anthropic',
        cost: 0.012, 
        latency: 180, 
        available: true,
        reliability: 0.98,
        privacy: 'cloud'
      },
      cloudflare: { 
        name: 'cloudflare',
        cost: 0.001, 
        latency: 50, 
        available: true,
        reliability: 0.95,
        privacy: 'cloud'
      },
      groq: { 
        name: 'groq',
        cost: 0.0001, 
        latency: 30, 
        available: true,
        reliability: 0.93,
        privacy: 'cloud'
      },
      together: { 
        name: 'together',
        cost: 0.002, 
        latency: 60, 
        available: true,
        reliability: 0.94,
        privacy: 'cloud'
      },
      local: { 
        name: 'local',
        cost: 0, 
        latency: 100, 
        available: true,
        reliability: 1.0,
        privacy: 'local'
      }
    };

    // Merge with custom configuration
    for (const [name, config] of Object.entries(defaults)) {
      const customConfig = custom?.[name] || {};
      this.providers.set(name, { ...config, ...customConfig });
      this.spending.set(name, 0);
      this.requestsByProvider.set(name, 0);
    }

    // Add any additional custom providers
    if (custom) {
      for (const [name, config] of Object.entries(custom)) {
        if (!this.providers.has(name) && config.cost !== undefined && config.latency !== undefined) {
          this.providers.set(name, {
            name,
            available: true,
            reliability: 0.95,
            privacy: 'cloud',
            ...config
          } as Provider);
          this.spending.set(name, 0);
          this.requestsByProvider.set(name, 0);
        }
      }
    }
  }

  async route(request: ChatRequest): Promise<ChatResponse> {
    this.checkBudgetReset();
    
    // Check for sensitive content
    const isSensitive = this.detectSensitive(request.messages);
    
    if (this.debug) {
      console.log(`[GPTRouter] Sensitive content detected: ${isSensitive}`);
    }
    
    // Get available providers
    const available = this.getHealthyProviders();
    
    if (available.length === 0) {
      throw new Error('No available providers');
    }
    
    // Check budget constraints
    const withinBudget = this.filterByBudget(available);
    
    // Apply routing strategy
    const provider = this.selectProvider(withinBudget.length > 0 ? withinBudget : available, isSensitive);
    
    if (this.debug) {
      console.log(`[GPTRouter] Selected provider: ${provider.name} (${this.strategy}`);
    }
    
    // Make request (mock for now)
    return this.makeRequest(provider, request);
  }

  private detectSensitive(messages: Message[]): boolean {
    const patterns = [
      /api[_-]?key/i,
      /secret[_-]?key/i,
      /bearer\s+[A-Za-z0-9-._~+/]+=*/i,
      /password[:=]\s*\S+/i,
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /patient|medical|diagnosis|prescription/i,
      /salary|income|ssn|social.?security/i
    ];
    
    return messages.some(m => 
      patterns.some(p => p.test(m.content))
    );
  }

  private getHealthyProviders(): Provider[] {
    return Array.from(this.providers.values()).filter(p => p.available);
  }

  private filterByBudget(providers: Provider[]): Provider[] {
    // Estimate cost for average request (500 tokens)
    const estimatedTokens = 500;
    
    return providers.filter(p => {
      const estimatedCost = (p.cost * estimatedTokens) / 1000;
      return (this.dailySpent + estimatedCost) <= this.dailyBudget;
    });
  }

  private selectProvider(providers: Provider[], isSensitive: boolean): Provider {
    if (isSensitive) {
      const localProvider = this.providers.get('local');
      if (localProvider && localProvider.available) {
        return localProvider;
      }
      // Fallback to most private available provider
      const privateProviders = providers.filter(p => p.privacy === 'local');
      if (privateProviders.length > 0) {
        return privateProviders[0];
      }
    }
    
    switch(this.strategy) {
      case 'cheapest':
        return providers.sort((a, b) => a.cost - b.cost)[0];
        
      case 'fastest':
        return providers.sort((a, b) => a.latency - b.latency)[0];
        
      case 'balanced':
        // Normalize and combine cost and latency scores
        return providers.sort((a, b) => {
          const maxCost = 0.015; // OpenAI as baseline
          const maxLatency = 200; // OpenAI as baseline
          const scoreA = (a.cost / maxCost) * 0.5 + (a.latency / maxLatency) * 0.5;
          const scoreB = (b.cost / maxCost) * 0.5 + (b.latency / maxLatency) * 0.5;
          return scoreA - scoreB;
        })[0];
        
      case 'privacy-first':
        // Prefer local providers
        const sorted = providers.sort((a, b) => {
          if (a.privacy === 'local' && b.privacy !== 'local') return -1;
          if (a.privacy !== 'local' && b.privacy === 'local') return 1;
          return a.cost - b.cost;
        });
        return sorted[0];
        
      case 'reliability':
        return providers.sort((a, b) => 
          (b.reliability || 0.95) - (a.reliability || 0.95)
        )[0];
        
      default:
        return providers[0];
    }
  }

  private async makeRequest(provider: Provider, request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    
    // Simulate token counting (in production, use tiktoken or similar)
    const estimatedTokens = this.estimateTokens(request.messages);
    const cost = (provider.cost * estimatedTokens) / 1000;
    
    // Update metrics
    this.requestCount++;
    this.totalTokens += estimatedTokens;
    this.requestsByProvider.set(provider.name, (this.requestsByProvider.get(provider.name) || 0) + 1);
    this.spending.set(provider.name, (this.spending.get(provider.name) || 0) + cost);
    this.dailySpent += cost;
    this.monthlySpent += cost;
    
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, provider.latency));
    
    const actualLatency = Date.now() - startTime;
    this.latencies.push(actualLatency);
    
    // Mock response
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model || provider.name,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: `[Mock response from ${provider.name}] This is a simulated response. In production, this would call the actual ${provider.name} API.`
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: Math.floor(estimatedTokens * 0.7),
        completion_tokens: Math.floor(estimatedTokens * 0.3),
        total_tokens: estimatedTokens
      },
      routing: {
        provider: provider.name,
        cost: cost,
        latency: actualLatency,
        reason: this.strategy
      }
    };
  }

  private estimateTokens(messages: Message[]): number {
    // Simple estimation: ~4 characters per token
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  private checkBudgetReset() {
    const now = new Date();
    
    // Reset daily budget
    if (now.getDate() !== this.lastResetDate.getDate()) {
      this.dailySpent = 0;
      this.lastResetDate = now;
    }
    
    // Reset monthly budget
    if (now.getMonth() !== this.lastResetDate.getMonth()) {
      this.monthlySpent = 0;
    }
  }

  private startHealthChecks(interval: number) {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, interval);
  }

  private async performHealthCheck() {
    for (const provider of this.providers.values()) {
      // In production, actually ping the provider's health endpoint
      // For now, randomly simulate health status
      provider.available = Math.random() > 0.1;
      
      if (this.debug && !provider.available) {
        console.log(`[GPTRouter] Provider ${provider.name} marked as unhealthy`);
      }
    }
  }

  getAnalytics(): Analytics {
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    const requestsByProvider: Record<string, number> = {};
    const costsByProvider: Record<string, number> = {};
    
    for (const [name, count] of this.requestsByProvider.entries()) {
      requestsByProvider[name] = count;
    }
    
    for (const [name, cost] of this.spending.entries()) {
      costsByProvider[name] = Number(cost.toFixed(4));
    }

    return {
      totalRequests: this.requestCount,
      totalCost: Number(Array.from(this.spending.values()).reduce((a, b) => a + b, 0).toFixed(4)),
      totalTokens: this.totalTokens,
      requestsByProvider,
      costsByProvider,
      averageLatency: Math.round(avgLatency),
      budgetStatus: {
        daily: {
          spent: Number(this.dailySpent.toFixed(4)),
          limit: this.dailyBudget === Infinity ? 0 : this.dailyBudget,
          remaining: this.dailyBudget === Infinity ? 0 : Number((this.dailyBudget - this.dailySpent).toFixed(4))
        },
        monthly: this.monthlyBudget !== Infinity ? {
          spent: Number(this.monthlySpent.toFixed(4)),
          limit: this.monthlyBudget,
          remaining: Number((this.monthlyBudget - this.monthlySpent).toFixed(4))
        } : undefined
      }
    };
  }

  middleware() {
    return async (req: any, res: any, next?: any) => {
      if (req.path === '/dashboard' || req.url === '/dashboard') {
        const analytics = this.getAnalytics();
        const html = this.generateDashboardHTML(analytics);
        res.type('html').send(html);
      } else if (req.method === 'POST' && req.body) {
        try {
          const response = await this.route(req.body);
          res.json(response);
        } catch (error: any) {
          res.status(500).json({ error: error.message });
        }
      } else if (next) {
        next();
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    };
  }

  private generateDashboardHTML(analytics: Analytics): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPTRouter Analytics Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: white;
            margin-bottom: 2rem;
            font-size: 2.5rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .card h2 {
            font-size: 0.875rem;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        .card .value {
            font-size: 2rem;
            font-weight: bold;
            color: #2d3748;
        }
        .card .subtitle {
            font-size: 0.875rem;
            color: #a0aec0;
            margin-top: 0.25rem;
        }
        .table {
            width: 100%;
            margin-top: 1rem;
        }
        .table th {
            text-align: left;
            padding: 0.5rem;
            border-bottom: 2px solid #e2e8f0;
            color: #4a5568;
            font-weight: 600;
        }
        .table td {
            padding: 0.5rem;
            border-bottom: 1px solid #e2e8f0;
            color: #718096;
        }
        .budget-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            margin-top: 0.5rem;
            overflow: hidden;
        }
        .budget-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78 0%, #38a169 100%);
            transition: width 0.3s ease;
        }
        .budget-fill.warning {
            background: linear-gradient(90deg, #f6e05e 0%, #ecc94b 100%);
        }
        .budget-fill.danger {
            background: linear-gradient(90deg, #fc8181 0%, #f56565 100%);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>GPTRouter Analytics</h1>
        
        <div class="grid">
            <div class="card">
                <h2>Total Requests</h2>
                <div class="value">${analytics.totalRequests.toLocaleString()}</div>
                <div class="subtitle">${analytics.totalTokens.toLocaleString()} tokens processed</div>
            </div>
            
            <div class="card">
                <h2>Total Cost</h2>
                <div class="value">$${analytics.totalCost.toFixed(4)}</div>
                <div class="subtitle">Average: $${analytics.totalRequests > 0 ? (analytics.totalCost / analytics.totalRequests).toFixed(4) : '0.0000'}/request</div>
            </div>
            
            <div class="card">
                <h2>Average Latency</h2>
                <div class="value">${analytics.averageLatency}ms</div>
                <div class="subtitle">Response time</div>
            </div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h2>Daily Budget</h2>
                <div class="value">$${analytics.budgetStatus.daily.spent.toFixed(2)} / $${analytics.budgetStatus.daily.limit || '∞'}</div>
                ${analytics.budgetStatus.daily.limit ? `
                <div class="budget-bar">
                    <div class="budget-fill ${
                        analytics.budgetStatus.daily.spent / analytics.budgetStatus.daily.limit > 0.9 ? 'danger' :
                        analytics.budgetStatus.daily.spent / analytics.budgetStatus.daily.limit > 0.7 ? 'warning' : ''
                    }" style="width: ${Math.min(100, (analytics.budgetStatus.daily.spent / analytics.budgetStatus.daily.limit) * 100)}%"></div>
                </div>
                ` : ''}
            </div>
            
            ${analytics.budgetStatus.monthly ? `
            <div class="card">
                <h2>Monthly Budget</h2>
                <div class="value">$${analytics.budgetStatus.monthly.spent.toFixed(2)} / $${analytics.budgetStatus.monthly.limit}</div>
                <div class="budget-bar">
                    <div class="budget-fill ${
                        analytics.budgetStatus.monthly.spent / analytics.budgetStatus.monthly.limit > 0.9 ? 'danger' :
                        analytics.budgetStatus.monthly.spent / analytics.budgetStatus.monthly.limit > 0.7 ? 'warning' : ''
                    }" style="width: ${Math.min(100, (analytics.budgetStatus.monthly.spent / analytics.budgetStatus.monthly.limit) * 100)}%"></div>
                </div>
            </div>
            ` : ''}
        </div>
        
        <div class="card">
            <h2>Provider Breakdown</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Provider</th>
                        <th>Requests</th>
                        <th>Cost</th>
                        <th>Avg Cost</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(analytics.requestsByProvider)
                        .filter(([_, count]) => count > 0)
                        .map(([provider, count]) => `
                            <tr>
                                <td>${provider}</td>
                                <td>${count}</td>
                                <td>$${(analytics.costsByProvider[provider] || 0).toFixed(4)}</td>
                                <td>$${count > 0 ? ((analytics.costsByProvider[provider] || 0) / count).toFixed(4) : '0.0000'}</td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export default GPTRouter;
export { GPTRouter };