import { McpManager } from '../mcp/manager.js';
import { McpToolResult } from '../mcp/client.js';
import { logger } from '../logging/logger.js';

export interface PageObservation {
  text: string;
  url?: string;
  title?: string;
  hasErrors: boolean;
}

/**
 * BrowserRuntime provides high-level observation and action delegation
 * completely through the Playwright MCP server without bypassing MCP.
 */
export class BrowserRuntime {
  private mcpManager: McpManager;
  private currentUrl: string = '';

  constructor(mcpManager: McpManager) {
    this.mcpManager = mcpManager;
  }

  /**
   * Delegates tool execution directly to MCP.
   */
  async executeAction(toolName: string, args: Record<string, any>): Promise<McpToolResult> {
    const result = await this.mcpManager.executeTool(toolName, args);

    // If this was a navigation tool, update current URL tracker
    if (toolName === 'playwright_navigate' && args.url) {
      this.currentUrl = args.url;
    }

    return result;
  }

  /**
   * Observes the current page state via MCP observation tools.
   */
  async observePage(): Promise<PageObservation> {
    logger.info('Observing browser state through MCP...');

    let visibleText = '';
    let interactiveElements: string[] = [];

    // 1. Get visible text via MCP
    try {
      const textRes = await this.mcpManager.executeTool('playwright_get_visible_text', {});
      if (!textRes.isError && textRes.content) {
        visibleText = textRes.content.replace(/\n\s*\n/g, '\n').trim();
      }
    } catch (err: any) {
      logger.debug('Failed to get visible text', err);
    }

    // 2. Get visible HTML via MCP and extract interactive element selectors
    try {
      const htmlRes = await this.mcpManager.executeTool('playwright_get_visible_html', {});
      if (!htmlRes.isError && htmlRes.content) {
        interactiveElements = this.extractInteractiveElements(htmlRes.content);
      }
    } catch (err: any) {
      logger.debug('Failed to get visible HTML', err);
    }

    let summary = '';
    if (visibleText) {
      summary += `Page Text:\n${visibleText.slice(0, 1500)}\n`;
    }
    if (interactiveElements.length > 0) {
      summary += `\nInteractive Elements:\n${interactiveElements.slice(0, 25).map((e) => `- ${e}`).join('\n')}`;
    }

    logger.observation(`Observation summary (${interactiveElements.length} elements detected)`);

    return {
      text: summary || 'Page is loaded.',
      url: this.currentUrl,
      hasErrors: false,
    };
  }

  private extractInteractiveElements(html: string): string[] {
    const elements: string[] = [];

    // Extract inputs
    const inputRegex = /<input\b([^>]*)>/gi;
    let match;
    while ((match = inputRegex.exec(html)) !== null) {
      const attrs = match[1];
      const id = attrs.match(/id=["']([^"']+)["']/i)?.[1];
      const name = attrs.match(/name=["']([^"']+)["']/i)?.[1];
      const type = attrs.match(/type=["']([^"']+)["']/i)?.[1] || 'text';
      const placeholder = attrs.match(/placeholder=["']([^"']+)["']/i)?.[1];

      let selector = id ? `#${id}` : name ? `input[name="${name}"]` : `input[type="${type}"]`;
      let desc = `input (selector: "${selector}", type: "${type}"`;
      if (placeholder) desc += `, placeholder: "${placeholder}"`;
      desc += ')';
      elements.push(desc);
    }

    // Extract buttons
    const buttonRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
    while ((match = buttonRegex.exec(html)) !== null) {
      const attrs = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      const id = attrs.match(/id=["']([^"']+)["']/i)?.[1];
      let selector = id ? `#${id}` : text ? `text="${text}"` : 'button';
      elements.push(`button "${text}" (selector: "${selector}")`);
    }

    // Extract links
    const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    while ((match = linkRegex.exec(html)) !== null) {
      const attrs = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      const id = attrs.match(/id=["']([^"']+)["']/i)?.[1];
      const href = attrs.match(/href=["']([^"']+)["']/i)?.[1];
      if (text) {
        let selector = id ? `#${id}` : `text="${text}"`;
        elements.push(`link "${text}" (selector: "${selector}", href: "${href || ''}")`);
      }
    }

    return elements;
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }

  setCurrentUrl(url: string) {
    this.currentUrl = url;
  }
}
