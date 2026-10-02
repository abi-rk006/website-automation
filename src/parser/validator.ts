/**
 * Schema and Semantic Validator for Parsed TNSKILL Tasks.
 */
import { ParsedTask, ValidationResult, MissingFieldDetail, CreateAction } from './types.js';

export class TaskValidator {
  validate(task: ParsedTask, rawText?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: MissingFieldDetail[] = [];
    let requiresClarification = false;

    // 1. Check for empty or ambiguous task input
    const isAmbiguousInput =
      !task.actions ||
      task.actions.length === 0 ||
      (rawText && /^(do something|help me|automate something|test)\b/i.test(rawText.trim()));

    if (isAmbiguousInput) {
      errors.push('Task objective is ambiguous or does not specify concrete actions.');
      requiresClarification = true;
    }

    // 2. Validate actions
    if (task.actions && task.actions.length > 0) {
      const seenIdentifiers = new Set<string>();

      for (let i = 0; i < task.actions.length; i++) {
        const action = task.actions[i];
        const actionIdx = i + 1;

        if (!action.type) {
          errors.push(`Action #${actionIdx} is missing a type.`);
          continue;
        }

        if (action.type === 'create') {
          const createAct = action as CreateAction;
          if (!createAct.entity) {
            errors.push(`Action #${actionIdx} ('create') is missing an entity type.`);
          }

          if (!createAct.data || Object.keys(createAct.data).length === 0) {
            errors.push(`Action #${actionIdx} ('create') has no field data.`);
            requiresClarification = true;
            continue;
          }

          // Entity-specific field validation
          if (createAct.entity === 'user') {
            const requiredUserFields = ['userId', 'email'];
            for (const reqField of requiredUserFields) {
              if (createAct.data[reqField] === undefined || createAct.data[reqField] === '') {
                missingFields.push({
                  entity: `User #${actionIdx}`,
                  field: reqField,
                  status: 'missing',
                  reason: `User record requires '${reqField}' for provisioning.`,
                });
                errors.push(`User #${actionIdx} is missing required field: ${reqField}`);
                requiresClarification = true;
              }
            }

            // Check duplicate userId
            if (createAct.data.userId) {
              if (seenIdentifiers.has(createAct.data.userId)) {
                warnings.push(`Duplicate user ID detected: ${createAct.data.userId}`);
              }
              seenIdentifiers.add(createAct.data.userId);
            }

            // Check boolean field 'active' if present
            if (createAct.data.active !== undefined && typeof createAct.data.active !== 'boolean') {
              warnings.push(`User #${actionIdx} 'active' field is not a boolean: ${createAct.data.active}`);
            }
          }
        }
      }
    }

    // 3. Validate verification requirements
    if (task.verification && task.verification.length > 0) {
      for (let i = 0; i < task.verification.length; i++) {
        const req = task.verification[i];
        if (!req.type) {
          errors.push(`Verification requirement #${i + 1} has an invalid type.`);
        }
      }
    }

    const isValid = errors.length === 0 && !requiresClarification;

    // Generate formatted summary
    const summary = this.generateSummary(task, isValid, errors, warnings, missingFields, requiresClarification);

    return {
      valid: isValid,
      errors,
      warnings,
      requiresClarification,
      missingFields,
      summary,
    };
  }

  private generateSummary(
    task: ParsedTask,
    isValid: boolean,
    errors: string[],
    warnings: string[],
    missingFields: MissingFieldDetail[],
    requiresClarification: boolean
  ): string {
    const lines: string[] = [];
    lines.push('========================================');
    lines.push('TNSKILL TASK VALIDATION REPORT');
    lines.push('========================================\n');

    lines.push(`Platform:       ${task.platform || 'Not specified'}`);
    lines.push(`Role:           ${task.role || 'Not specified'}`);
    lines.push(`Actions Count:  ${task.actions?.length || 0}`);
    lines.push(`Navigation:     ${task.startNavigation ? task.startNavigation.join(' > ') : 'None'}`);
    lines.push(`Verification:   ${task.verification?.length > 0 ? 'Specified' : 'None'}`);
    lines.push('----------------------------------------');

    if (requiresClarification || missingFields.length > 0) {
      lines.push('STATUS: TASK REQUIRES CLARIFICATION\n');
      if (missingFields.length > 0) {
        lines.push('Missing Fields:');
        for (const m of missingFields) {
          lines.push(`  - [${m.entity || 'General'}] ${m.field} (${m.status})`);
        }
      }
    } else if (isValid) {
      lines.push('STATUS: TASK VALID ✓');
    } else {
      lines.push('STATUS: TASK INVALID ✗');
    }

    if (errors.length > 0) {
      lines.push('\nValidation Errors:');
      for (const err of errors) {
        lines.push(`  ✗ ${err}`);
      }
    }

    if (warnings.length > 0) {
      lines.push('\nWarnings:');
      for (const warn of warnings) {
        lines.push(`  ⚠ ${warn}`);
      }
    }

    lines.push('========================================');
    return lines.join('\n');
  }
}
