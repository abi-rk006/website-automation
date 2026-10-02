import { LLMToolDefinition } from '../mcp/tools.js';

export interface LLMToolCall {
  id?: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: Array<{
    id?: string;
    type?: string;
    function: {
      name: string;
      arguments: Record<string, any> | string;
    };
  }>;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: LLMToolCall[];
  isComplete: boolean;
  raw?: any;
}

export interface LLMProvider {
  readonly name: string;
  chat(messages: LLMMessage[], tools: LLMToolDefinition[]): Promise<LLMResponse>;
}
