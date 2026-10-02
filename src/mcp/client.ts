import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../logging/logger.js';
import { AgentConfig } from '../config/config.js';

export interface McpToolResult {
  tool: string;
  isError: boolean;
  content: string;
  raw?: any;
}

export class McpClientWrapper {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];
  private isConnected: boolean = false;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Connects to the Playwright MCP server and discovers tools.
   */
  async connect(): Promise<Tool[]> {
    logger.info(`Connecting to MCP server: ${this.config.mcpServerCommand} ${this.config.mcpServerArgs.join(' ')}`);

    try {
      this.transport = new StdioClientTransport({
        command: this.config.mcpServerCommand,
        args: this.config.mcpServerArgs,
        env: {
          ...process.env,
          BROWSER: this.config.browserType,
          HEADLESS: this.config.browserHeadless ? 'true' : 'false',
        },
      });

      this.client = new Client(
        {
          name: 'tnskill-browser-agent',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(this.transport);
      this.isConnected = true;
      logger.info('MCP server connected successfully');

      // Discover tools
      const toolList = await this.client.listTools();
      this.tools = toolList.tools;
      logger.info(`Discovered ${this.tools.length} browser tools: ${this.tools.map((t) => t.name).join(', ')}`);

      return this.tools;
    } catch (err: any) {
      this.isConnected = false;
      logger.error('MCP connection failed', err);
      throw new Error(`Failed to connect to MCP server: ${err.message || String(err)}`);
    }
  }

  /**
   * Returns discovered tools.
   */
  getTools(): Tool[] {
    return this.tools;
  }

  /**
   * Checks if a tool name exists in discovered tools.
   */
  hasTool(toolName: string): boolean {
    return this.tools.some((t) => t.name === toolName);
  }

  /**
   * Normalizes argument types according to the tool's inputSchema.
   */
  private normalizeArgs(toolName: string, rawArgs: Record<string, any>): Record<string, any> {
    const tool = this.tools.find((t) => t.name === toolName);
    const properties = (tool?.inputSchema as any)?.properties || {};
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(rawArgs)) {
      const propSchema = properties[key];
      if (propSchema) {
        if (propSchema.type === 'boolean') {
          if (typeof value === 'string') {
            cleaned[key] = value.toLowerCase() === 'true';
          } else {
            cleaned[key] = Boolean(value);
          }
        } else if (propSchema.type === 'number' || propSchema.type === 'integer') {
          if (typeof value === 'string') {
            const num = Number(value);
            cleaned[key] = isNaN(num) ? value : num;
          } else {
            cleaned[key] = value;
          }
        } else {
          cleaned[key] = value;
        }
      } else {
        cleaned[key] = value;
      }
    }

    // Default headless setting and sanitize navigate arguments
    if (toolName === 'playwright_navigate') {
      if (cleaned.headless === undefined) {
        cleaned.headless = this.config.browserHeadless;
      }
      if (cleaned.waitUntil && !['load', 'domcontentloaded', 'networkidle', 'commit'].includes(cleaned.waitUntil)) {
        cleaned.waitUntil = 'load';
      }
    }

    return cleaned;
  }

  /**
   * Executes an MCP tool with timeout and error handling.
   */
  async executeTool(name: string, rawArgs: Record<string, any> = {}): Promise<McpToolResult> {
    if (!this.isConnected || !this.client) {
      throw new Error('MCP client is not connected');
    }

    if (!this.hasTool(name)) {
      const errorMsg = `Tool '${name}' is not an available MCP tool. Available tools: ${this.tools.map((t) => t.name).join(', ')}`;
      logger.warn(errorMsg);
      return {
        tool: name,
        isError: true,
        content: errorMsg,
      };
    }

    const args = this.normalizeArgs(name, rawArgs);
    logger.info(`Executing MCP tool: ${name}`);
    logger.debug(`Normalized arguments for ${name}:`, args);

    // Enforce action timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Tool execution for '${name}' timed out after ${this.config.actionTimeoutMs}ms`)), this.config.actionTimeoutMs);
    });

    try {
      const toolCallPromise = this.client.callTool({
        name,
        arguments: args,
      });

      const result = (await Promise.race([toolCallPromise, timeoutPromise])) as CallToolResult;

      // Extract text content from MCP result format
      const texts: string[] = [];
      if (Array.isArray(result.content)) {
        for (const item of result.content) {
          if (item.type === 'text') {
            texts.push(item.text);
          } else if (item.type === 'image') {
            texts.push(`[Image content: ${item.mimeType}]`);
          } else {
            texts.push(JSON.stringify(item));
          }
        }
      }

      const content = texts.join('\n') || (result.isError ? 'Action returned an error with no details.' : 'Action executed successfully.');
      logger.info(`MCP tool ${name} completed (isError: ${!!result.isError})`);
      logger.debug(`Tool result content for ${name}: ${content.slice(0, 300)}...`);

      return {
        tool: name,
        isError: !!result.isError,
        content,
        raw: result,
      };
    } catch (err: any) {
      logger.error(`Tool execution failed for '${name}'`, err);
      return {
        tool: name,
        isError: true,
        content: `Error executing tool '${name}': ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Closes the MCP connection cleanly.
   */
  async close(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        logger.info('Closing MCP client connection...');
        await this.client.close();
      } catch (err: any) {
        logger.warn('Error while closing MCP client', err);
      } finally {
        this.isConnected = false;
        this.client = null;
        this.transport = null;
      }
    }
  }
}
