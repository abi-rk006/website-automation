/**
 * Deterministic Section Extractor for TNSKILL tasks.
 * Extracts: Lesson, Scenario, Task Objective, Navigation, Verification.
 */
import { ExtractedSections } from './types.js';

export class SectionExtractor {
  /**
   * Parses raw instruction text into discrete sections.
   */
  extract(rawText: string): ExtractedSections {
    const text = (rawText || '').replace(/\r\n/g, '\n').trim();
    const result: ExtractedSections = {
      rawText: text,
    };

    if (!text) {
      return result;
    }

    // Normalized section pattern matching
    // Look for headings like:
    // **Lesson**, Lesson:, ## Lesson, Lesson
    // **Scenario**, Scenario:
    // **Task Objective**, Task Objective:, Task Objectives, Objective, Instructions
    const sectionRegex = /(?:^|\n)(?:#{1,6}\s*|\*{1,3})?\s*(Lesson|Scenario|Task Objectives?|Objectives?|Instructions?)(?:\*{1,3}|:)?\s*(?:\n|$)/gi;

    const matches: Array<{ name: string; index: number; length: number }> = [];
    let match: RegExpExecArray | null;

    while ((match = sectionRegex.exec(text)) !== null) {
      matches.push({
        name: match[1].toLowerCase(),
        index: match.index,
        length: match[0].length,
      });
    }

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const startIndex = current.index + current.length;
        const endIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
        const content = text.slice(startIndex, endIndex).trim();

        if (current.name.includes('lesson')) {
          result.lesson = content;
        } else if (current.name.includes('scenario')) {
          result.scenario = content;
        } else if (
          current.name.includes('objective') ||
          current.name.includes('instruction')
        ) {
          result.taskObjective = content;
        }
      }
    } else {
      // No explicit section headers found (e.g. tasks/create-hr-task.txt)
      // The entire text represents the task objective
      result.taskObjective = text;
    }

    // Now extract inline "To begin" / "Navigation" and "Verification" if embedded in taskObjective or rawText
    const sourceForInline = result.taskObjective || text;

    // 1. Navigation ("To begin, navigate to ...")
    const navMatch = sourceForInline.match(/(?:To begin,?\s+)?(?:navigate to\s+[^\n]+)/i);
    if (navMatch) {
      result.navigation = navMatch[0].trim();
    }

    // 2. Verification ("After creating..., verify they appear in ...")
    const verMatch = sourceForInline.match(/(?:(?:After|Once|Then|Finally)[^\n]*,?\s*)?verify\s+[^\n]+/i);
    if (verMatch) {
      result.verification = verMatch[0].trim();
    }

    return result;
  }
}
