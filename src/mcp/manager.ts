import { McpClientWrapper, McpToolResult } from './client.js';
import { LLMToolDefinition, convertMcpToolsToLLM } from './tools.js';
import { AgentConfig } from '../config/config.js';
import { logger } from '../logging/logger.js';

export class McpManager {
  private clientWrapper: McpClientWrapper;
  private llmTools: LLMToolDefinition[] = [];

  constructor(config: AgentConfig) {
    this.clientWrapper = new McpClientWrapper(config);
  }

  /**
   * Initializes MCP connection and prepares tools for LLM consumption.
   */
  async initialize(): Promise<LLMToolDefinition[]> {
    const rawTools = await this.clientWrapper.connect();
    this.llmTools = convertMcpToolsToLLM(rawTools);
    return this.llmTools;
  }

  /**
   * Returns tools formatted for LLM function calling.
   */
  getLlmTools(): LLMToolDefinition[] {
    return this.llmTools;
  }

  /**
   * Executes a tool requested by LLM.
   */
  async executeTool(name: string, args: Record<string, any>): Promise<McpToolResult> {
    return this.clientWrapper.executeTool(name, args);
  }

  /**
   * Disconnects and cleans up.
   */
  async shutdown(): Promise<void> {
    await this.clientWrapper.close();
  }
}
