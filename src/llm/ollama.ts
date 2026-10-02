import { LLMProvider, LLMMessage, LLMResponse, LLMToolCall } from './provider.js';
import { LLMToolDefinition } from '../mcp/tools.js';
import { logger } from '../logging/logger.js';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'OllamaProvider';
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.model = config.model;
    this.timeoutMs = config.timeoutMs || 60000;
  }

  async chat(messages: LLMMessage[], tools: LLMToolDefinition[]): Promise<LLMResponse> {
    logger.debug(`Calling Ollama model '${this.model}' with ${messages.length} messages and ${tools.length} tools`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => {
            const msgObj: any = { role: m.role, content: m.content || '' };
            if (m.tool_calls && m.tool_calls.length > 0) {
              msgObj.tool_calls = m.tool_calls;
            }
            return msgObj;
          }),
          tools: tools.length > 0 ? tools : undefined,
          stream: false,
          options: {
            temperature: 0.1, // Low temperature for deterministic instruction following
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data: any = await response.json();
      const message = data.message || {};
      const content: string = message.content || '';
      const rawToolCalls: any[] = message.tool_calls || [];

      logger.debug(`Ollama response content:`, content);
      if (rawToolCalls.length > 0) {
        logger.debug(`Ollama returned native tool_calls:`, rawToolCalls);
      }

      const toolCalls: LLMToolCall[] = [];

      // 1. Process native tool calls
      for (const tc of rawToolCalls) {
        const fnName = tc.function?.name;
        let fnArgs = tc.function?.arguments || {};
        if (typeof fnArgs === 'string') {
          try {
            fnArgs = JSON.parse(fnArgs);
          } catch {
            fnArgs = {};
          }
        }
        if (fnName) {
          toolCalls.push({
            id: tc.id || `call_${Date.now()}`,
            name: fnName,
            arguments: fnArgs,
          });
        }
      }

      // 2. Fallback: Parse embedded JSON tool calls in markdown if no native tool calls were returned
      if (toolCalls.length === 0 && content) {
        const parsedFromText = this.extractToolCallsFromText(content, tools);
        if (parsedFromText.length > 0) {
          toolCalls.push(...parsedFromText);
          logger.info(`Detected tool call from content parsing: ${parsedFromText.map((t) => t.name).join(', ')}`);
        }
      }

      // Determine if task is complete
      const isComplete = this.detectCompletion(content, toolCalls);

      return {
        content: content.trim() || null,
        toolCalls,
        isComplete,
        raw: data,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        logger.error(`Ollama request timed out after ${this.timeoutMs}ms`);
        throw new Error(`Ollama request timed out after ${this.timeoutMs}ms`);
      }
      logger.error('Ollama request failed', err);
      throw err;
    }
  }

  /**
   * Helper to detect completion when model indicates the task is finished
   * or has no further actions to take.
   */
  private detectCompletion(content: string, toolCalls: LLMToolCall[]): boolean {
    if (toolCalls.length > 0) {
      return false;
    }

    const lower = content.toLowerCase();
    const completionPhrases = [
      'task complete',
      'task completed',
      'task is complete',
      'task has been completed',
      'task finished',
      'goal achieved',
      'done with task',
      'all actions completed',
      'completed the instruction',
      'completed successfully',
    ];

    return completionPhrases.some((phrase) => lower.includes(phrase));
  }

  /**
   * Normalize tool name aliases to match discovered MCP tools.
   */
  private resolveToolName(rawName: string, validToolNames: Set<string>): string | null {
    if (validToolNames.has(rawName)) return rawName;

    const ALIASES: Record<string, string> = {
      playwright_type: 'playwright_fill',
      browser_type: 'playwright_fill',
      browser_fill: 'playwright_fill',
      browser_click: 'playwright_click',
      browser_navigate: 'playwright_navigate',
      browser_snapshot: 'playwright_get_visible_text',
      browser_text: 'playwright_get_visible_text',
      type: 'playwright_fill',
      fill: 'playwright_fill',
      click: 'playwright_click',
      navigate: 'playwright_navigate',
    };

    const mapped = ALIASES[rawName.toLowerCase()];
    if (mapped && validToolNames.has(mapped)) {
      return mapped;
    }

    return null;
  }

  /**
   * Fallback extractor for models that write tool invocations in text or code blocks.
   */
  private extractToolCallsFromText(text: string, availableTools: LLMToolDefinition[]): LLMToolCall[] {
    const validToolNames = new Set(availableTools.map((t) => t.function.name));
    const extracted: LLMToolCall[] = [];

    // Helper to process a JSON object
    const processJsonObject = (parsed: any) => {
      if (parsed && typeof parsed === 'object') {
        const rawName = parsed.name || parsed.action || parsed.tool;
        const args = parsed.arguments || parsed.args || parsed.parameters || parsed.input || parsed;
        if (rawName) {
          const resolvedName = this.resolveToolName(rawName, validToolNames);
          if (resolvedName) {
            const cleanArgs = typeof args === 'object' ? { ...args } : {};
            delete cleanArgs.name;
            delete cleanArgs.action;
            delete cleanArgs.tool;
            extracted.push({
              name: resolvedName,
              arguments: cleanArgs,
            });
            return true;
          }
        }
      }
      return false;
    };

    // 1. Try parsing whole trimmed text as JSON (e.g. {"name": "playwright_type", ...})
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (processJsonObject(parsed)) {
          return extracted;
        }
      } catch {}
    }

    // 2. Match ```json ... ``` blocks
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    let match;
    while ((match = jsonBlockRegex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        processJsonObject(parsed);
      } catch {}
    }

    // 3. Search for embedded JSON substring { ... } if still not found
    if (extracted.length === 0) {
      const matchObj = text.match(/\{[\s\S]*"name"[\s\S]*\}/);
      if (matchObj) {
        try {
          const parsed = JSON.parse(matchObj[0]);
          processJsonObject(parsed);
        } catch {}
      }
    }

    return extracted;
  }
}
