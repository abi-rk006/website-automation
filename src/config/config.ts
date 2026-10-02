import dotenv from 'dotenv';
import path from 'path';

// Load .env if present
dotenv.config();

export interface AgentConfig {
  ollamaBaseUrl: string;
  ollamaModel: string;
  mcpServerCommand: string;
  mcpServerArgs: string[];
  browserHeadless: boolean;
  browserType: 'chromium' | 'firefox' | 'webkit';
  maxActions: number;
  taskTimeoutMs: number;
  actionTimeoutMs: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  serviceNowUrl?: string;
}

export function loadConfig(): AgentConfig {
  const parseArgs = (rawArgs?: string): string[] => {
    if (!rawArgs) return ['@playwright/mcp'];
    try {
      if (rawArgs.trim().startsWith('[')) {
        return JSON.parse(rawArgs);
      }
      return rawArgs.split(' ').filter(Boolean);
    } catch {
      return ['@playwright/mcp'];
    }
  };

  return {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
    mcpServerCommand: process.env.MCP_SERVER_COMMAND || 'npx',
    mcpServerArgs: parseArgs(process.env.MCP_SERVER_ARGS),
    browserHeadless: process.env.BROWSER_HEADLESS === 'true',
    browserType: (process.env.BROWSER_TYPE as any) || 'chromium',
    maxActions: parseInt(process.env.MAX_ACTIONS || '50', 10),
    taskTimeoutMs: parseInt(process.env.TASK_TIMEOUT_MS || '300000', 10), // 5 minutes
    actionTimeoutMs: parseInt(process.env.ACTION_TIMEOUT_MS || '30000', 10), // 30 seconds
    logLevel: (process.env.LOG_LEVEL?.toLowerCase() as any) || 'info',
    serviceNowUrl: process.env.SERVICENOW_URL || '',
  };
}

export const config = loadConfig();
