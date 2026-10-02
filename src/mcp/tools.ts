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
  'start_codegen',
  'end_codegen',
  'get_codegen',
  'clear_codegen',
  'playwright_get',
  'playwright_post',
  'playwright_put',
  'playwright_patch',
  'playwright_delete',
  'playwright_expect_response',
  'playwright_assert_response',
  'playwright_save_as_pdf',
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

      // For navigation, keep schema clean and focused on URL
      if (tool.name === 'playwright_navigate') {
        properties = {
          url: {
            type: 'string',
            description: 'The URL to navigate to (e.g. https://example.com)',
          },
        };
        required = ['url'];
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
