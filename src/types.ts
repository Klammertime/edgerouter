/**
 * Type definitions for EdgeRouter
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

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: Message;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  routing?: RoutingInfo;
}

export interface RoutingInfo {
  provider: string;
  reason: string;
  cost: number;
  latency: number;
}

export interface ProviderConfig {
  endpoint?: string;
  cost: number;
  latency: number;
  reliability: number;
  privacy: 'cloud' | 'local';
  status: 'healthy' | 'unhealthy';
}

export type ProviderName = 'cloudflare' | 'openai' | 'anthropic' | 'local' | 'groq' | 'together';

export type Strategy = 'cheapest' | 'fastest' | 'balanced' | 'privacy-first' | 'reliability';

export interface EdgeRouterConfig {
  // Routing
  strategy?: Strategy;
  
  // Providers
  endpoints?: Partial<Record<ProviderName, string>>;
  providers?: Partial<Record<ProviderName, Partial<ProviderConfig>>>;
  credentials?: Record<string, any>;
  
  // Budget
  dailyBudget?: number;
  monthlyBudget?: number;
  
  // Health checking
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  enableHealthCheck?: boolean;
  
  // Debug
  debug?: boolean;
}

export interface BudgetManager {
  daily: number;
  monthly: number;
  spent: Record<string, number>;
  alerts: Array<{
    type: string;
    provider: string;
    timestamp: number;
  }>;
}

export interface Analytics {
  requests: Map<string, number>;
  latencies: Map<string, number[]>;
  errors: Map<string, number>;
  costs: Map<string, number>;
  startTime: number;
}

export interface AnalyticsSummary {
  totalRequests: number;
  totalCost: number;
  uptime: number;
  requestsByProvider: Record<string, number>;
  costsByProvider: Record<string, number>;
  healthStatus: Record<string, string>;
  budgetStatus: {
    daily: {
      limit: number;
      spent: number;
    };
    alerts: Array<any>;
  };
}