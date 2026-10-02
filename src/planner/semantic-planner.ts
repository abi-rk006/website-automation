/**
 * Semantic Task Planner utilizing LLMProvider for intelligent step ordering
 * and expected state generation, with deterministic fallback.
 */
import { LLMProvider, LLMMessage } from '../llm/provider.js';
import { ParsedTask } from '../parser/types.js';
import { ExecutionPlan } from './types.js';
import { DeterministicPlanner } from './deterministic-planner.js';
import { PlanValidator } from './plan-validator.js';
import { logger } from '../logging/logger.js';

export class SemanticPlanner {
  private llm?: LLMProvider;
  private deterministicPlanner: DeterministicPlanner;
  private validator: PlanValidator;

  constructor(llm?: LLMProvider) {
    this.llm = llm;
    this.deterministicPlanner = new DeterministicPlanner();
    this.validator = new PlanValidator();
  }

  async plan(task: ParsedTask): Promise<ExecutionPlan> {
    const basePlan = this.deterministicPlanner.plan(task);

    if (!this.llm) {
      logger.debug('No LLMProvider supplied to SemanticPlanner. Using deterministic plan.');
      return basePlan;
    }

    try {
      logger.info('Requesting LLM-assisted execution planning...');
      const systemPrompt = `You are a task planning component.
You receive a validated structured task.
Your job is to produce an ordered execution plan.
You must:
- preserve all required actions
- preserve all required data exactly as given (case-sensitive)
- preserve all verification requirements
- identify dependencies (dependsOn)
- define expected states (expectedState)
- produce deterministic step IDs (step-1, step-2, ...)
- avoid browser-specific selectors (no CSS #id, .class, xpath, or refs like e1)
- avoid MCP tool names (no browser_click, browser_type)
- avoid inventing missing information
You must NOT execute actions.
You must NOT interact with a browser.
You must NOT invent values.

Return ONLY a JSON object representing the ExecutionPlan with shape:
{
  "planId": "plan_...",
  "platform": "string",
  "steps": [
    {
      "id": "step-1",
      "type": "navigate",
      "description": "...",
      "action": { "type": "navigate", "target": ["All", "User Administration", "Users"] },
      "expectedState": { "pagePurpose": "list_view" }
    }
  ]
}`;

      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(task, null, 2) },
      ];

      const response = await this.llm.chat(messages, []);
      if (response.content) {
        const parsedPlan = this.extractPlanJson(response.content);
        if (parsedPlan && parsedPlan.steps && Array.isArray(parsedPlan.steps)) {
          // Validate candidate plan
          const validation = this.validator.validate(parsedPlan, task);
          if (validation.valid) {
            logger.info('LLM candidate plan validated successfully.');
            return parsedPlan;
          } else {
            logger.warn('LLM candidate plan failed validation. Using deterministic plan fallback.', validation.errors);
          }
        }
      }
    } catch (err: any) {
      logger.warn(`Semantic planning failed (${err.message}). Using deterministic plan fallback.`);
    }

    return basePlan;
  }

  private extractPlanJson(text: string): ExecutionPlan | null {
    try {
      const trimmed = text.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return JSON.parse(trimmed);
      }
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        return JSON.parse(braceMatch[0]);
      }
    } catch (err) {
      logger.debug('Failed to parse JSON plan from LLM output');
    }
    return null;
  }
}
