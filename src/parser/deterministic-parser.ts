/**
 * Deterministic Entity & Action Parser for TNSKILL tasks.
 */
import {
  ExtractedSections,
  ParsedTask,
  TaskAction,
  CreateAction,
  VerificationRequirement,
} from './types.js';
import {
  normalizeFieldName,
  normalizeBooleanValue,
  extractNavigationSteps,
} from './normalizers.js';

export class DeterministicParser {
  parse(sections: ExtractedSections): ParsedTask {
    const task: ParsedTask = {
      actions: [],
      verification: [],
      context: {},
      metadata: {
        parserVersion: '2.0.0',
        timestamp: new Date().toISOString(),
        rawSections: sections,
      },
    };

    // 1. Context: Lesson & Scenario
    if (sections.lesson) {
      task.context!.lesson = sections.lesson.replace(/\r\n/g, '\n');
    }
    if (sections.scenario) {
      task.context!.scenario = sections.scenario.replace(/\r\n/g, '\n');
    }

    // 2. Platform & Role Extraction
    const combinedText = `${sections.scenario || ''} ${sections.rawText || ''}`.replace(/\r\n/g, '\n');
    task.platform = this.extractPlatform(combinedText);
    task.role = this.extractRole(combinedText);
    const department = this.extractDepartment(combinedText);
    if (department) {
      task.context!.department = department;
    }

    // 3. Navigation Extraction
    const navText = (sections.navigation || sections.taskObjective || sections.rawText || '').replace(/\r\n/g, '\n');
    const navSteps = extractNavigationSteps(navText);
    if (navSteps && navSteps.length > 0) {
      task.startNavigation = navSteps;
    }

    // 4. Action & Entity Extraction
    const objectiveText = (sections.taskObjective || sections.rawText || '').replace(/\r\n/g, '\n');
    const actions = this.extractActions(objectiveText);
    task.actions = actions;

    // 5. Verification Extraction
    const verText = (sections.verification || objectiveText).replace(/\r\n/g, '\n');
    const verRequirements = this.extractVerification(verText, actions);
    task.verification = verRequirements;

    return task;
  }

  private extractPlatform(text: string): string | undefined {
    if (/servicenow/i.test(text)) return 'ServiceNow';
    if (/salesforce/i.test(text)) return 'Salesforce';
    if (/jira/i.test(text)) return 'Jira';
    if (/workday/i.test(text)) return 'Workday';
    return undefined;
  }

  private extractRole(text: string): string | undefined {
    if (/administrator|admin/i.test(text)) return 'administrator';
    const roleMatch = text.match(/(?:as a|you are a|role of)\s+([A-Za-z0-9_\s]+?)(?:\s+(?:supporting|configuring|responsible)|\.|\n|,)/i);
    if (roleMatch) {
      let role = roleMatch[1].trim();
      role = role.replace(/^(servicenow|system)\s+/i, '');
      if (role) return role.toLowerCase();
    }
    return undefined;
  }

  private extractDepartment(text: string): string | undefined {
    const match = text.match(/(?:supporting the|department:?)\s+([A-Za-z0-9_-]+)(?:\s+department)?/i);
    if (match) {
      return match[1].trim();
    }
    return undefined;
  }

  private extractActions(text: string): TaskAction[] {
    const actions: TaskAction[] = [];

    // Check for multiple entity blocks (e.g. "User 1:\n... \nUser 2:\n...")
    const entityBlockRegex = /(?:^|\n)(User\s*\d+|Record\s*\d+|Item\s*\d+):?([\s\S]*?)(?=(?:\n(?:User\s*\d+|Record\s*\d+|Item\s*\d+):?|\n\s*\d+\.\s+After|\n\s*To begin|\n\*{1,3}[A-Z]|$))/gi;

    let match: RegExpExecArray | null;
    const blocks: Array<{ title: string; content: string }> = [];

    while ((match = entityBlockRegex.exec(text)) !== null) {
      blocks.push({
        title: match[1].trim(),
        content: match[2].trim(),
      });
    }

    if (blocks.length > 0) {
      for (const block of blocks) {
        const entityType = block.title.toLowerCase().startsWith('user') ? 'user' : 'record';
        const fields = this.extractFields(block.content);
        if (Object.keys(fields.data).length > 0) {
          actions.push({
            type: 'create',
            entity: entityType,
            data: fields.data,
            rawLabels: fields.rawLabels,
          });
        }
      }
    } else {
      // Check for single entity or parameters block
      // e.g. "Label: Hardware Asset\nName: u_hardware_asset..."
      // or "Title: HR Incident Overview\nOwner: hr_admin..."
      const fields = this.extractFields(text);
      if (Object.keys(fields.data).length > 0) {
        let entityType = 'record';
        if (/table/i.test(text)) entityType = 'table';
        else if (/dashboard/i.test(text)) entityType = 'dashboard';
        else if (/user/i.test(text)) entityType = 'user';

        actions.push({
          type: 'create',
          entity: entityType,
          data: fields.data,
          rawLabels: fields.rawLabels,
        });
      }
    }

    return actions;
  }

  private extractFields(content: string): { data: Record<string, any>; rawLabels: Record<string, string> } {
    const data: Record<string, any> = {};
    const rawLabels: Record<string, string> = {};

    const lines = content.split('\n');
    for (const line of lines) {
      const fieldMatch = line.match(/^\s*([A-Za-z0-9_\s]+?)\s*:\s*(.+)$/);
      if (fieldMatch) {
        const rawKey = fieldMatch[1].trim();
        const rawVal = fieldMatch[2].trim();

        // Skip section headers that might match
        if (/^(lesson|scenario|task objective|to begin)$/i.test(rawKey)) {
          continue;
        }

        const normalizedKey = normalizeFieldName(rawKey);
        const normalizedVal = normalizeBooleanValue(rawVal);

        data[normalizedKey] = normalizedVal;
        rawLabels[normalizedKey] = rawKey;
      }
    }

    return { data, rawLabels };
  }

  private extractVerification(verText: string, actions: TaskAction[]): VerificationRequirement[] {
    const requirements: VerificationRequirement[] = [];
    if (!verText) return requirements;

    const verifyMatch =
      verText.match(/verify\s+.*?\b(?:appear in|listed in|exists? in|appears? in|visible in)\s+([^\n.]+)/i) ||
      verText.match(/verify\s+([^\n.]+)/i);

    if (verifyMatch) {
      const location = verifyMatch[1]?.trim().replace(/^the\s+/i, '');

      // Collect identifiers from actions
      const identifiers: string[] = [];
      let entity: string | undefined;

      for (const action of actions) {
        if (action.type === 'create') {
          if (!entity) entity = action.entity;
          if (action.data.userId) identifiers.push(action.data.userId);
          else if (action.data.name) identifiers.push(action.data.name);
          else if (action.data.title) identifiers.push(action.data.title);
          else if (action.data.label) identifiers.push(action.data.label);
        }
      }

      requirements.push({
        type: 'record_exists',
        entity: entity || 'record',
        identifiers: identifiers.length > 0 ? identifiers : undefined,
        location: location || undefined,
        rawText: verText.trim(),
      });
    }

    return requirements;
  }
}
