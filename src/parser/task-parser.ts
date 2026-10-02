/**
 * TNSKILL Task Parser Orchestrator.
 * Coordinates: SectionExtractor -> SemanticParser -> TaskValidator.
 */
import { LLMProvider } from '../llm/provider.js';
import { SectionExtractor } from './section-extractor.js';
import { SemanticParser } from './semantic-parser.js';
import { TaskValidator } from './validator.js';
import { ParsedTask, ValidationResult } from './types.js';
import { logger } from '../logging/logger.js';

export interface ParseResult {
  task: ParsedTask;
  validation: ValidationResult;
  formattedOutput: string;
}

export class TaskParser {
  private sectionExtractor: SectionExtractor;
  private semanticParser: SemanticParser;
  private validator: TaskValidator;

  constructor(llm?: LLMProvider) {
    this.sectionExtractor = new SectionExtractor();
    this.semanticParser = new SemanticParser(llm);
    this.validator = new TaskValidator();
  }

  async parse(rawInstruction: string): Promise<ParseResult> {
    logger.info('Starting TNSKILL task parsing...');
    logger.debug(`Raw instruction length: ${rawInstruction?.length || 0} characters`);

    // 1. Section Extraction
    logger.info('Extracting instruction sections (Lesson, Scenario, Objective, Navigation)...');
    const sections = this.sectionExtractor.extract(rawInstruction);
    logger.debug('Extracted sections summary:', {
      hasLesson: !!sections.lesson,
      hasScenario: !!sections.scenario,
      hasObjective: !!sections.taskObjective,
      hasNavigation: !!sections.navigation,
      hasVerification: !!sections.verification,
    });

    // 2. Semantic & Entity Parsing
    logger.info('Performing semantic parsing and entity extraction...');
    const task = await this.semanticParser.parse(sections);

    // 3. Schema & Task Validation
    logger.info('Validating parsed task schema and required fields...');
    const validation = this.validator.validate(task, rawInstruction);

    if (!validation.valid) {
      logger.warn(`Task validation completed with issues (Clarification needed: ${validation.requiresClarification})`);
      if (validation.missingFields.length > 0) {
        logger.warn('Detected missing fields:', validation.missingFields);
      }
    } else {
      logger.info('Task validation passed successfully (STATUS: TASK VALID)');
    }

    const formattedOutput = this.formatOutput(task, validation);
    logger.info('TNSKILL task parsing complete.');

    return {
      task,
      validation,
      formattedOutput,
    };
  }

  /**
   * Generates formatted human-readable output matching Section 22 specification.
   */
  formatOutput(task: ParsedTask, validation: ValidationResult): string {
    const lines: string[] = [];
    lines.push('========================================');
    lines.push('TNSKILL TASK PARSER');
    lines.push('========================================\n');

    lines.push('Platform:');
    lines.push(task.platform || 'Not specified');
    lines.push('');

    lines.push('Role:');
    lines.push(task.role ? task.role.charAt(0).toUpperCase() + task.role.slice(1) : 'Not specified');
    lines.push('');

    if (task.context?.department) {
      lines.push('Department:');
      lines.push(task.context.department);
      lines.push('');
    }

    lines.push('Start Navigation:');
    if (task.startNavigation && task.startNavigation.length > 0) {
      task.startNavigation.forEach((step, idx) => {
        lines.push(`${idx + 1}. ${step}`);
      });
    } else {
      lines.push('None specified');
    }
    lines.push('');

    lines.push('Actions:');
    if (task.actions && task.actions.length > 0) {
      task.actions.forEach((action, idx) => {
        if (action.type === 'create') {
          const entityTitle = action.entity.charAt(0).toUpperCase() + action.entity.slice(1);
          lines.push(`${idx + 1}. Create ${entityTitle}`);
          for (const [key, val] of Object.entries(action.data)) {
            const rawLabel = action.rawLabels?.[key] || key;
            lines.push(`   ${rawLabel}: ${val}`);
          }
        } else {
          lines.push(`${idx + 1}. Action: ${action.type}`);
        }
      });
    } else {
      lines.push('No concrete actions identified');
    }
    lines.push('');

    lines.push('Verification:');
    if (task.verification && task.verification.length > 0) {
      let verCount = 1;
      task.verification.forEach((v) => {
        if (v.identifiers && v.identifiers.length > 0) {
          v.identifiers.forEach((id) => {
            lines.push(`${verCount++}. ${id} exists in ${v.location || 'system'}`);
          });
        } else {
          lines.push(`${verCount++}. ${v.rawText || v.type}`);
        }
      });
    } else {
      lines.push('None specified');
    }
    lines.push('');

    lines.push('Validation:');
    if (validation.valid) {
      lines.push('PASS');
    } else if (validation.requiresClarification) {
      lines.push('TASK REQUIRES CLARIFICATION');
      if (validation.missingFields.length > 0) {
        lines.push('\nMissing:');
        validation.missingFields.forEach((m) => lines.push(`- ${m.field}`));
      }
    } else {
      lines.push('FAIL');
      validation.errors.forEach((e) => lines.push(`- ${e}`));
    }
    lines.push('\n========================================');

    return lines.join('\n');
  }
}
