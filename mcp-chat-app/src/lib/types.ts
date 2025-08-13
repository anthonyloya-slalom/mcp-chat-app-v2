export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  thoughts?: ThoughtProcess[];
  tokenUsage?: { input: number; output: number };
  cost?: number;
  error?: string;
  retryCount?: number;
}

export interface ThoughtProcess {
  id: string;
  type: 'observation' | 'thought' | 'action' | 'result';
  content: string;
  timestamp: Date;
  metadata?: {
    toolName?: string;
    toolArgs?: any;
    duration?: number;
    success?: boolean;
  };
}

export interface ToolStep {
  id: string;
  type: 'thought' | 'action';
  tool?: string;
  toolInput?: any;
  observation?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp: Date;
}

export interface McpTool {
  name: string;
  description: string;
  parameters: any;
}

export interface McpToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface McpRequest {
  tool: string;
  params: Record<string, any>;
}