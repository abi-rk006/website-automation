/**
 * Plan Validator for Phase 3: Task Planner
 * Verifies plan coverage, exact data preservation, verification coverage,
 * dependency validity, acyclicity (DAG), and absence of browser-specific selectors/MCP tool names.
 */
import { ParsedTask, CreateAction } from '../parser/types.js';
import { ExecutionPlan, PlanValidationResult } from './types.js';

export class PlanValidator {
  validate(plan: ExecutionPlan, sourceTask: ParsedTask): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate Basic Plan Structure
    if (!plan || !plan.steps || plan.steps.length === 0) {
      errors.push('Execution plan contains no steps.');
      return this.buildResult(false, errors, warnings, plan, sourceTask);
    }

    const stepIdSet = new Set<string>();
    for (const step of plan.steps) {
      if (!step.id) {
        errors.push('Plan step is missing an ID.');
      } else if (stepIdSet.has(step.id)) {
        errors.push(`Duplicate step ID detected: ${step.id}`);
      } else {
        stepIdSet.add(step.id);
      }
    }

    // 2. Reject Browser-Specific Selectors & MCP Tool Names
    this.checkBrowserSelectorsAndMcpTools(plan, errors);

    // 3. Validate Dependency Graph (Validity & Cycles)
    this.checkDependencies(plan, stepIdSet, errors);

    // 4. Validate Action Coverage & Exact Data Preservation
    this.checkActionCoverageAndData(plan, sourceTask, errors);

    // 5. Validate Verification Coverage
    this.checkVerificationCoverage(plan, sourceTask, errors);

    const isValid = errors.length === 0;
    return this.buildResult(isValid, errors, warnings, plan, sourceTask);
  }

  /**
   * Rejects runtime browser-specific selectors (#id, .class, //xpath, e1) and MCP tool names.
   */
  private checkBrowserSelectorsAndMcpTools(plan: ExecutionPlan, errors: string[]) {
    const MCP_TOOL_NAMES = [
      'browser_click',
      'browser_type',
      'browser_snapshot',
      'browser_navigate',
      'browser_fill_form',
      'browser_press_key',
      'playwright_click',
      'playwright_type',
    ];

    const RUNTIME_REF_REGEX = /^(?:e\d+|ref=[a-zA-Z0-9_-]+)$/i;
    const CSS_XPATH_REGEX = /^(?:#[a-zA-Z0-9_-]+|\.[a-zA-Z0-9_-]+|\/\/[a-zA-Z0-9_]+|button\[|input\[)/i;

    for (const step of plan.steps) {
      // Check MCP tool names
      const stepStr = JSON.stringify(step);
      for (const mcpTool of MCP_TOOL_NAMES) {
        if (stepStr.includes(`"${mcpTool}"`)) {
          errors.push(`Step ${step.id} illegally embeds MCP tool name '${mcpTool}'. Phase 3 plans must use semantic actions.`);
        }
      }

      // Check targets and actions
      if (step.action) {
        const target = (step.action as any).target;
        if (typeof target === 'string') {
          if (RUNTIME_REF_REGEX.test(target)) {
            errors.push(`Step ${step.id} illegally contains runtime element reference '${target}'.`);
          }
          if (CSS_XPATH_REGEX.test(target)) {
            errors.push(`Step ${step.id} illegally contains browser-specific selector '${target}'. Phase 3 plans must use semantic targets.`);
          }
        }
      }
    }
  }

  /**
   * Verifies all dependencies exist and no cycles exist in the dependency graph.
   */
  private checkDependencies(plan: ExecutionPlan, stepIdSet: Set<string>, errors: string[]) {
    const adjList = new Map<string, string[]>();

    for (const step of plan.steps) {
      adjList.set(step.id, []);
      if (step.dependsOn && step.dependsOn.length > 0) {
        for (const dep of step.dependsOn) {
          if (!stepIdSet.has(dep)) {
            errors.push(`Step ${step.id} depends on non-existent step '${dep}'.`);
          } else {
            adjList.get(step.id)!.push(dep);
          }
        }
      }
    }

    // Cycle detection using DFS (visiting state: 0 = unvisited, 1 = visiting, 2 = visited)
    const visited = new Map<string, number>();
    for (const stepId of stepIdSet) {
      visited.set(stepId, 0);
    }

    const hasCycle = (node: string, path: string[]): boolean => {
      visited.set(node, 1);
      const neighbors = adjList.get(node) || [];
      for (const neighbor of neighbors) {
        if (visited.get(neighbor) === 1) {
          errors.push(`Dependency cycle detected: ${[...path, node, neighbor].join(' -> ')}`);
          return true;
        }
        if (visited.get(neighbor) === 0) {
          if (hasCycle(neighbor, [...path, node])) {
            return true;
          }
        }
      }
      visited.set(node, 2);
      return false;
    };

    for (const stepId of stepIdSet) {
      if (visited.get(stepId) === 0) {
        hasCycle(stepId, []);
      }
    }
  }

  /**
   * Ensures all source task actions are represented and exact data values are preserved.
   */
  private checkActionCoverageAndData(plan: ExecutionPlan, sourceTask: ParsedTask, errors: string[]) {
    if (!sourceTask.actions || sourceTask.actions.length === 0) return;

    for (const srcAction of sourceTask.actions) {
      if (srcAction.type === 'create') {
        const createSrc = srcAction as CreateAction;
        const srcData = createSrc.data;

        // Find corresponding create_record step in plan
        const matchingStep = plan.steps.find((s) => {
          if (s.type !== 'create_record') return false;
          const planData = s.action?.data;
          if (!planData) return false;
          // Match by userId or name
          if (srcData.userId && planData.userId === srcData.userId) return true;
          if (srcData.name && planData.name === srcData.name) return true;
          if (srcData.title && planData.title === srcData.title) return true;
          return false;
        });

        if (!matchingStep) {
          const id = srcData.userId || srcData.name || srcData.title || createSrc.entity;
          errors.push(`Plan is missing required creation step for entity '${id}'.`);
        } else {
          // Exact data preservation check
          const planData = matchingStep.action?.data || {};
          for (const [key, val] of Object.entries(srcData)) {
            if (planData[key] !== val) {
              errors.push(
                `Data mismatch in step ${matchingStep.id} for field '${key}': expected '${val}', got '${planData[key]}'. Exact data preservation violated.`
              );
            }
          }
        }
      }
    }
  }

  /**
   * Ensures all verification requirements are present in the plan.
   */
  private checkVerificationCoverage(plan: ExecutionPlan, sourceTask: ParsedTask, errors: string[]) {
    if (!sourceTask.verification || sourceTask.verification.length === 0) return;

    for (const v of sourceTask.verification) {
      if (v.identifiers && v.identifiers.length > 0) {
        for (const id of v.identifiers) {
          const hasVerifyStep = plan.steps.some((s) => {
            if (s.type !== 'verify') return false;
            if (s.verification?.identifier === id) return true;
            if (s.action?.target === id) return true;
            if (s.description && s.description.includes(id)) return true;
            return false;
          });

          if (!hasVerifyStep) {
            errors.push(`Plan is missing required verification step for identifier '${id}'.`);
          }
        }
      }
    }
  }

  private buildResult(
    valid: boolean,
    errors: string[],
    warnings: string[],
    plan: ExecutionPlan,
    sourceTask: ParsedTask
  ): PlanValidationResult {
    const lines: string[] = [];
    lines.push('========================================');
    lines.push('TNSKILL PLAN VALIDATION REPORT');
    lines.push('========================================\n');

    lines.push('Required Actions:');
    if (sourceTask.actions && sourceTask.actions.length > 0) {
      sourceTask.actions.forEach((a) => {
        const id = (a as any).data?.userId || (a as any).data?.name || a.type;
        const covered = !errors.some((e) => e.includes(id));
        lines.push(`  - ${a.type} (${id}): ${covered ? '✓' : '✗'}`);
      });
    }

    lines.push('\nRequired Data:');
    const dataOk = !errors.some((e) => e.includes('Data mismatch'));
    lines.push(`  - Exact data preserved: ${dataOk ? '✓' : '✗'}`);

    lines.push('\nNavigation:');
    const hasNav = plan.steps.some((s) => s.type === 'navigate');
    lines.push(`  - Navigation steps: ${hasNav ? '✓' : 'None required'}`);

    lines.push('\nVerification Coverage:');
    const verOk = !errors.some((e) => e.includes('missing required verification'));
    lines.push(`  - All verifications included: ${verOk ? '✓' : '✗'}`);

    lines.push('\nDependencies & Graph:');
    const depsOk = !errors.some((e) => e.includes('depends on non-existent') || e.includes('Dependency cycle'));
    lines.push(`  - Valid DAG (no cycles, valid IDs): ${depsOk ? '✓' : '✗'}`);

    lines.push('\nBrowser Selectors & Tools:');
    const noSelectors = !errors.some((e) => e.includes('illegally'));
    lines.push(`  - No runtime selectors or MCP tool names: ${noSelectors ? '✓' : '✗'}`);

    lines.push('----------------------------------------');
    lines.push(`PLAN STATUS: ${valid ? 'VALID ✓' : 'INVALID ✗'}`);
    lines.push('EXECUTION STATUS: NOT STARTED');

    if (errors.length > 0) {
      lines.push('\nErrors:');
      for (const err of errors) {
        lines.push(`  ✗ ${err}`);
      }
    }

    lines.push('========================================');

    return {
      valid,
      errors,
      warnings,
      summary: lines.join('\n'),
    };
  }
}
