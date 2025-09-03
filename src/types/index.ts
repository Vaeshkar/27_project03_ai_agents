export interface AgentRequest {
  prompt: string;
}

export interface AgentResponse {
  result: string;
  metadata: {
    agentsUsed: string[];
    executionTime: number;
    tokensUsed: number;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}
