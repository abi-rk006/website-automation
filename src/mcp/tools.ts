import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
}

export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

/**
 * List of non-browser utility tools from MCP servers that should be omitted
 * from the LLM prompt to avoid token explosion and CPU inference timeouts.
 */
const EXCLUDED_TOOL_PREFIXES = [
  'browser_video',
  'browser_tracing',
  'browser_start_video',
  'browser_stop_video',
  'browser_start_tracing',
  'browser_stop_tracing',
  'browser_start_recording',
  'browser_stop_recording',
  'browser_network_request',
  'browser_cookie',
  'browser_localstorage',
  'browser_sessionstorage',
  'browser_mouse_',
  'browser_pdf_save',
  'browser_run_code_unsafe',
  'browser_emulate_media',
  'browser_handle_dialog',
  'start_codegen',
  'end_codegen',
];

/**
 * Converts MCP tools to standard LLM function-calling format,
 * focusing on browser navigation, interaction, and observation tools.
 */
export function convertMcpToolsToLLM(tools: Tool[]): LLMToolDefinition[] {
  return tools
    .filter((tool) => !EXCLUDED_TOOL_PREFIXES.some((prefix) => tool.name.startsWith(prefix)))
    .map((tool) => {
      let properties = (tool.inputSchema as any)?.properties || {};
      let required = (tool.inputSchema as any)?.required || [];

      // Clean & concise schemas for core tools to maximize local model adherence
      if (tool.name === 'browser_navigate' || tool.name === 'playwright_navigate') {
        properties = {
          url: {
            type: 'string',
            description: 'The URL to navigate to (e.g. https://example.com)',
          },
        };
        required = ['url'];
      } else if (tool.name === 'browser_click') {
        properties = {
          target: {
            type: 'string',
            description: 'Target element ref from snapshot (e.g. "e11"), element role/name (e.g. button "Submit"), or CSS selector',
          },
        };
        required = ['target'];
      } else if (tool.name === 'browser_type') {
        properties = {
          target: {
            type: 'string',
            description: 'Target element ref from snapshot (e.g. "e7") or CSS selector',
          },
          text: {
            type: 'string',
            description: 'Text to type into the element',
          },
        };
        required = ['target', 'text'];
      } else if (tool.name === 'browser_snapshot') {
        properties = {};
        required = [];
      }

      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description || `Browser action: ${tool.name}`,
          parameters: {
            type: 'object',
            properties,
            required,
          },
        },
      };
    });
}
