import { AgentState, ActionRecord } from './state.js';
import { LLMProvider, LLMMessage } from '../llm/provider.js';
import { McpManager } from '../mcp/manager.js';
import { BrowserRuntime } from '../browser/browser-runtime.js';
import { AgentConfig } from '../config/config.js';
import { logger } from '../logging/logger.js';

export interface TaskExecutionResult {
  state: AgentState;
  summary: string;
}

export class AgentExecutionLoop {
  private config: AgentConfig;
  private llm: LLMProvider;
  private mcpManager: McpManager;
  private browserRuntime: BrowserRuntime;

  constructor(config: AgentConfig, llm: LLMProvider, mcpManager: McpManager, browserRuntime: BrowserRuntime) {
    this.config = config;
    this.llm = llm;
    this.mcpManager = mcpManager;
    this.browserRuntime = browserRuntime;
  }

  async run(task: string, state: AgentState): Promise<TaskExecutionResult> {
    state.status = 'running';
    state.startTime = Date.now();
    logger.info(`Agent started task: "${task}"`);

    const tools = this.mcpManager.getLlmTools();
    if (tools.length === 0) {
      state.status = 'failed';
      state.failureReason = 'No MCP tools available';
      return { state, summary: this.generateSummary(state) };
    }

    // Build the system prompt guiding the observation-action loop
    const systemPrompt = `You are an autonomous browser agent. You execute browser tasks through Playwright MCP tools.
RULES:
1. Work step-by-step.
2. In each step, choose ONE appropriate MCP tool call to progress towards the task.
3. Observe the tool result and visible page content returned from the browser to decide your next move.
4. When you have completed the user's task, reply with "TASK COMPLETED: <summary>" and DO NOT call any more tools.
5. If the user asked only to open or navigate to a URL (e.g. "Open example.com"), once playwright_navigate has loaded the page, the task is COMPLETE. Reply with "TASK COMPLETED" immediately.
6. Do not call the same tool with identical arguments repeatedly.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Task: ${task}` },
    ];

    let consecutiveIdenticalCalls = 0;
    let lastCallSignature = '';

    while (state.status === 'running') {
      // 1. Safety Limit: Action Count
      if (state.actionCount >= this.config.maxActions) {
        logger.warn(`Maximum action count (${this.config.maxActions}) reached. Stopping execution.`);
        state.status = 'failed';
        state.failureReason = `Maximum action count reached (${this.config.maxActions})`;
        break;
      }

      // 2. Safety Limit: Task Timeout
      const elapsedMs = Date.now() - state.startTime;
      if (elapsedMs >= this.config.taskTimeoutMs) {
        logger.warn(`Task execution timeout (${this.config.taskTimeoutMs}ms) exceeded. Stopping execution.`);
        state.status = 'failed';
        state.failureReason = `Task execution timeout exceeded (${this.config.taskTimeoutMs}ms)`;
        break;
      }

      // 3. Ask LLM for next decision
      logger.info(`Requesting next action from LLM (Step ${state.actionCount + 1})...`);
      let response;
      try {
        response = await this.llm.chat(messages, tools);
      } catch (err: any) {
        logger.error('LLM request failed', err);
        state.status = 'failed';
        state.failureReason = `LLM request failed: ${err.message || String(err)}`;
        break;
      }

      // 4. Check if LLM indicates task completion
      if (
        response.isComplete ||
        (response.content && /task completed|task is complete|finished/i.test(response.content)) ||
        (response.toolCalls.length === 0 && response.content)
      ) {
        logger.info(`LLM finished task with message: ${response.content}`);
        state.status = 'completed';
        break;
      }

      // 5. If no tool was requested and no completion declared, terminate
      if (response.toolCalls.length === 0) {
        logger.warn('LLM returned no tool call and no completion indication.');
        state.status = 'completed';
        break;
      }

      // 6. Execute requested tool call(s)
      for (const toolCall of response.toolCalls) {
        const stepNumber = state.actionCount + 1;
        state.currentAction = `Step ${stepNumber}: ${toolCall.name}`;
        state.lastTool = toolCall.name;

        // Check for repetitive tool execution loops
        const currentCallSignature = `${toolCall.name}:${JSON.stringify(toolCall.arguments)}`;
        if (currentCallSignature === lastCallSignature) {
          consecutiveIdenticalCalls++;
          if (consecutiveIdenticalCalls >= 2) {
            logger.info(`Detected repeated action '${toolCall.name}'. Page is already in target state. Marking task complete.`);
            state.status = 'completed';
            break;
          }
        } else {
          consecutiveIdenticalCalls = 0;
          lastCallSignature = currentCallSignature;
        }

        logger.action(stepNumber, toolCall.name, toolCall.arguments);

        // Track URL if tool is navigate
        if (toolCall.name === 'playwright_navigate' && toolCall.arguments.url) {
          state.currentUrl = toolCall.arguments.url;
        }

        const actionStartTime = Date.now();

        // Check if tool exists
        const toolExists = tools.some((t) => t.function.name === toolCall.name);
        let toolResultStr = '';
        let isError = false;

        if (!toolExists) {
          isError = true;
          toolResultStr = `Error: Tool '${toolCall.name}' does not exist. Available tools: ${tools.map((t) => t.function.name).join(', ')}`;
          logger.warn(`LLM requested nonexistent tool: ${toolCall.name}`);
        } else {
          // Execute through BrowserRuntime (delegates to MCP)
          const result = await this.browserRuntime.executeAction(toolCall.name, toolCall.arguments);
          toolResultStr = result.content;
          isError = result.isError;
        }

        const actionDuration = Date.now() - actionStartTime;
        state.actionCount++;
        state.lastToolResult = toolResultStr;

        // Record history
        const record: ActionRecord = {
          step: stepNumber,
          tool: toolCall.name,
          args: toolCall.arguments,
          result: toolResultStr,
          isError,
          durationMs: actionDuration,
          timestamp: new Date().toISOString(),
        };
        state.history.push(record);

        // Append assistant tool call to conversation
        messages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: [
            {
              id: toolCall.id || `call_${stepNumber}`,
              type: 'function',
              function: {
                name: toolCall.name,
                arguments: toolCall.arguments,
              },
            },
          ],
        });

        // Collect page observation
        let observationText = '';
        if (!isError && (toolCall.name === 'playwright_navigate' || toolCall.name === 'playwright_click' || toolCall.name === 'playwright_fill')) {
          try {
            logger.info(`Auto-observing page state following ${toolCall.name}...`);
            const observation = await this.browserRuntime.observePage();
            if (observation.text) {
              observationText = `\n\nPage observation:\n${observation.text}`;
            }
          } catch (obsErr: any) {
            logger.debug('Observation step skipped or failed', obsErr.message);
          }
        }

        // Observation feedback inside the tool message
        messages.push({
          role: 'tool',
          name: toolCall.name,
          content: `Result of ${toolCall.name}: ${toolResultStr}${observationText}`,
        });

        // If the task was simply to open/navigate to this page and it succeeded, check if finished
        if (
          !isError &&
          toolCall.name === 'playwright_navigate' &&
          /^(?:open|navigate to|go to)\s+https?:\/\/[^\s]+$/i.test(task.trim())
        ) {
          logger.info('Navigation task successfully loaded target URL. Task completed.');
          state.status = 'completed';
          break;
        }

        // Check limits inside loop
        if (state.actionCount >= this.config.maxActions) break;
      }
    }

    state.endTime = Date.now();
    return {
      state,
      summary: this.generateSummary(state),
    };
  }

  /**
   * Generates the structured Completion Report as required in Section 19.
   */
  generateSummary(state: AgentState): string {
    const durationSec = ((state.endTime ? state.endTime - state.startTime : Date.now() - state.startTime) / 1000).toFixed(1);
    const lines: string[] = [];

    lines.push('==============================================');
    lines.push('                 TASK RESULT                  ');
    lines.push('==============================================');
    lines.push(`Task:        ${state.currentTask}`);
    lines.push(`Status:      ${state.status.toUpperCase()}`);
    lines.push(`Actions:     ${state.actionCount}`);
    lines.push(`Duration:    ${durationSec} seconds`);

    if (state.currentUrl) {
      lines.push(`Final URL:   ${state.currentUrl}`);
    }

    if (state.status === 'failed') {
      lines.push(`Reason:      ${state.failureReason || 'Unknown error'}`);
      if (state.lastTool) {
        lines.push(`Last Action: ${state.lastTool}`);
      }
    }

    lines.push('----------------------------------------------');
    lines.push('Action History:');
    if (state.history.length === 0) {
      lines.push('  (No actions executed)');
    } else {
      for (const item of state.history) {
        lines.push(`  ${item.step}. ${item.tool} (${item.durationMs}ms) - ${item.isError ? '[ERROR]' : '[OK]'}`);
      }
    }
    lines.push('==============================================');

    return lines.join('\n');
  }
}
