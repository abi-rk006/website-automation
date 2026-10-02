/**
 * Master Task Planner Orchestrator for Phase 3.
 * Coordinates SemanticPlanner, DeterministicPlanner, and PlanValidator.
 */
import { LLMProvider } from '../llm/provider.js';
import { ParsedTask } from '../parser/types.js';
import { ExecutionPlan, PlanValidationResult } from './types.js';
import { SemanticPlanner } from './semantic-planner.js';
import { PlanValidator } from './plan-validator.js';
import { logger } from '../logging/logger.js';

export interface PlanResult {
  plan: ExecutionPlan;
  validation: PlanValidationResult;
  formattedOutput: string;
}

export class TaskPlanner {
  private semanticPlanner: SemanticPlanner;
  private validator: PlanValidator;

  constructor(llm?: LLMProvider) {
    this.semanticPlanner = new SemanticPlanner(llm);
    this.validator = new PlanValidator();
  }

  async plan(task: ParsedTask): Promise<PlanResult> {
    logger.info('Starting task planning for validated task...');

    const plan = await this.semanticPlanner.plan(task);

    logger.info('Validating execution plan...');
    const validation = this.validator.validate(plan, task);

    if (validation.valid) {
      logger.info(`Plan validation succeeded with ${plan.steps.length} ordered steps.`);
    } else {
      logger.warn(`Plan validation failed with ${validation.errors.length} errors.`);
    }

    const formattedOutput = this.formatPlan(plan, validation, task);

    return {
      plan,
      validation,
      formattedOutput,
    };
  }

  /**
   * Formats the execution plan for CLI output matching Section 19 & 25.
   */
  formatPlan(plan: ExecutionPlan, validation: PlanValidationResult, sourceTask?: ParsedTask): string {
    const lines: string[] = [];
    lines.push('========================================');
    lines.push('TNSKILL TASK PLANNER');
    lines.push('========================================\n');

    if (sourceTask) {
      lines.push('Platform:');
      lines.push(sourceTask.platform || 'Not specified');
      lines.push('');
      if (sourceTask.role) {
        lines.push('Role:');
        lines.push(sourceTask.role.charAt(0).toUpperCase() + sourceTask.role.slice(1));
        lines.push('');
      }
    }

    lines.push('Generated Plan:\n');

    plan.steps.forEach((step, idx) => {
      lines.push(`Step ${idx + 1}`);

      if (step.type === 'navigate') {
        const target = Array.isArray(step.action?.target)
          ? step.action.target.join(' → ')
          : step.action?.target || step.description;
        lines.push('Navigate to:');
        lines.push(String(target));
      } else if (step.type === 'open_create_form') {
        lines.push('Open:');
        lines.push(step.description);
      } else if (step.type === 'create_record') {
        const id = step.expectedState?.identifier || step.action?.entity || 'Record';
        lines.push('Create:');
        lines.push(String(id));
        if (step.action?.data && Object.keys(step.action.data).length > 0) {
          lines.push('\nData:');
          for (const [k, v] of Object.entries(step.action.data)) {
            const raw = step.action.rawLabels?.[k] || k;
            lines.push(`${raw} = ${v}`);
          }
        }
      } else if (step.type === 'verify') {
        lines.push('Verify:');
        lines.push(step.description);
      } else {
        lines.push(step.description);
      }

      if (step.dependsOn && step.dependsOn.length > 0) {
        lines.push(`\nDepends on: ${step.dependsOn.join(', ')}`);
      }

      if (step.expectedState && Object.keys(step.expectedState).length > 0) {
        const stateSummary = Object.entries(step.expectedState)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        lines.push(`Expected state: [${stateSummary}]`);
      }

      lines.push('');
    });

    lines.push('----------------------------------------');
    lines.push('PLAN STATUS:');
    lines.push(validation.valid ? 'VALID ✓' : 'INVALID ✗');
    lines.push('');
    lines.push('EXECUTION STATUS:');
    lines.push('NOT STARTED');
    lines.push('========================================');

    return lines.join('\n');
  }
}
