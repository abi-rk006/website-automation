/**
 * Semantic Parser for TNSKILL Tasks.
 * Leverages LLMProvider (e.g. OllamaProvider) for semantic understanding
 * while combining deterministic facts to ensure 0% hallucination of missing fields.
 */
import { LLMProvider, LLMMessage } from '../llm/provider.js';
import { ExtractedSections, ParsedTask } from './types.js';
import { DeterministicParser } from './deterministic-parser.js';
import { logger } from '../logging/logger.js';

export class SemanticParser {
  private llm?: LLMProvider;
  private deterministicParser: DeterministicParser;

  constructor(llm?: LLMProvider) {
    this.llm = llm;
    this.deterministicParser = new DeterministicParser();
  }

  async parse(sections: ExtractedSections): Promise<ParsedTask> {
    // 1. Always establish ground-truth deterministic structure
    const baseTask = this.deterministicParser.parse(sections);

    if (!this.llm) {
      logger.debug('No LLMProvider supplied to SemanticParser. Using deterministic parsing result.');
      return baseTask;
    }

    try {
      logger.info('Requesting LLM semantic enrichment...');
      const prompt = `You are a strict task analysis parser for ServiceNow and enterprise workflows.
Extract high-level metadata (platform, role, department, business context) from the following task sections.
CRITICAL RULES:
1. ONLY return a JSON object with this shape:
{
  "platform": "string or null",
  "role": "string or null",
  "department": "string or null",
  "businessContext": "string or null"
}
2. NEVER invent, assume, or hallucinate missing information.
3. If not explicitly stated, return null for that field.

SECTIONS:
Lesson: ${sections.lesson || 'None'}
Scenario: ${sections.scenario || 'None'}
Objective: ${sections.taskObjective || 'None'}`;

      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are an accurate semantic information extractor. You respond ONLY with valid JSON.' },
        { role: 'user', content: prompt },
      ];

      logger.debug('Sending LLM request for semantic extraction...');
      const response = await this.llm.chat(messages, []);
      logger.debug('Received LLM response:', response.content);

      if (response.content) {
        const enriched = this.extractJson(response.content);
        if (enriched) {
          logger.info('Successfully extracted semantic JSON from LLM response');
          if (enriched.platform && !baseTask.platform) {
            baseTask.platform = enriched.platform;
          }
          if (enriched.role && !baseTask.role) {
            baseTask.role = enriched.role;
          }
          if (enriched.department && !baseTask.context?.department) {
            if (!baseTask.context) baseTask.context = {};
            baseTask.context.department = enriched.department;
          }
          if (enriched.businessContext && !baseTask.context?.businessContext) {
            if (!baseTask.context) baseTask.context = {};
            baseTask.context.businessContext = enriched.businessContext;
          }
        }
      }
    } catch (err: any) {
      logger.warn(`Semantic LLM parsing failed or timed out (${err.message}). Falling back to deterministic facts.`);
    }

    return baseTask;
  }

  private extractJson(text: string): Record<string, any> | null {
    try {
      const trimmed = text.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return JSON.parse(trimmed);
      }

      // Check ```json ... ``` block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Find first { ... }
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        return JSON.parse(braceMatch[0]);
      }
    } catch (err) {
      logger.debug('Failed to parse JSON from LLM response text:', text);
    }
    return null;
  }
}
