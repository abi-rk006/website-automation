import { AgentConfig, loadConfig } from '../config/config.js';
import { LLMProvider } from '../llm/provider.js';
import { OllamaProvider } from '../llm/ollama.js';
import { McpManager } from '../mcp/manager.js';
import { BrowserRuntime } from '../browser/browser-runtime.js';
import { AgentExecutionLoop, TaskExecutionResult } from './loop.js';
import { AgentState, createInitialState } from './state.js';
import { logger } from '../logging/logger.js';

export class BrowserAgent {
  private config: AgentConfig;
  private llm: LLMProvider;
  private mcpManager: McpManager;
  private browserRuntime: BrowserRuntime;
  private executionLoop: AgentExecutionLoop;
  private isInitialized: boolean = false;

  constructor(customConfig?: Partial<AgentConfig>, customLLM?: LLMProvider) {
    this.config = { ...loadConfig(), ...customConfig };
    logger.setLevel(this.config.logLevel);

    this.mcpManager = new McpManager(this.config);
    this.browserRuntime = new BrowserRuntime(this.mcpManager);

    this.llm =
      customLLM ||
      new OllamaProvider({
        baseUrl: this.config.ollamaBaseUrl,
        model: this.config.ollamaModel,
        timeoutMs: Math.max(this.config.actionTimeoutMs * 2, 120000),
      });

    this.executionLoop = new AgentExecutionLoop(
      this.config,
      this.llm,
      this.mcpManager,
      this.browserRuntime
    );
  }

  /**
   * Initializes the MCP connection and discovers browser tools.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    logger.info('Initializing Browser Agent...');
    await this.mcpManager.initialize();
    this.isInitialized = true;
    logger.info('Browser Agent initialization complete.');
  }

  /**
   * Executes a user instruction.
   */
  async execute(instruction: string): Promise<TaskExecutionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const state = createInitialState(instruction);
    const result = await this.executionLoop.run(instruction, state);
    return result;
  }

  /**
   * Shuts down the agent and MCP client cleanly.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Browser Agent...');
    await this.mcpManager.shutdown();
    this.isInitialized = false;
  }
}
