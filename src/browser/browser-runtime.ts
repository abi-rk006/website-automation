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
    if ((toolName === 'browser_navigate' || toolName === 'playwright_navigate') && args.url) {
      this.currentUrl = args.url;
    }

    return result;
  }

  /**
   * Observes the current page state via MCP observation tools.
   */
  async observePage(): Promise<PageObservation> {
    logger.info('Observing browser state through MCP...');

    let snapshotContent = '';
    let pageTitle = '';

    // 1. Try official Playwright MCP browser_snapshot tool
    try {
      const snapRes = await this.mcpManager.executeTool('browser_snapshot', {});
      if (!snapRes.isError && snapRes.content) {
        snapshotContent = snapRes.content;

        // Extract URL and Title if present in snapshot header
        const urlMatch = snapshotContent.match(/- Page URL:\s*([^\r\n]+)/i);
        if (urlMatch) this.currentUrl = urlMatch[1].trim();

        const titleMatch = snapshotContent.match(/- Page Title:\s*([^\r\n]+)/i);
        if (titleMatch) pageTitle = titleMatch[1].trim();
      }
    } catch (err: any) {
      logger.debug('browser_snapshot not available, falling back', err);
    }

    // 2. Fallback to visible text if snapshot was empty or not available
    if (!snapshotContent) {
      try {
        const textRes = await this.mcpManager.executeTool('playwright_get_visible_text', {});
        if (!textRes.isError && textRes.content) {
          snapshotContent = textRes.content.replace(/\n\s*\n/g, '\n').trim();
        }
      } catch (err: any) {
        logger.debug('Failed to get visible text fallback', err);
      }
    }

    logger.observation(`Observation captured (${snapshotContent.length} chars)`);

    return {
      text: snapshotContent || 'Page is loaded.',
      url: this.currentUrl,
      title: pageTitle,
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
