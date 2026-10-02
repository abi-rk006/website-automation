import { SectionExtractor } from '../../src/parser/section-extractor.js';

async function run() {
  console.log('--- Test 1: Basic Section Extraction ---');
  const extractor = new SectionExtractor();

  const input = `
**Lesson**
Users in ServiceNow represent individuals who access the platform.

**Scenario**
You are a ServiceNow administrator supporting the HR department.

**Task Objective**
1. Create a user record.
2. Verify it exists.
`;

  const sections = extractor.extract(input);

  const hasLesson = !!sections.lesson && sections.lesson.includes('Users in ServiceNow');
  const hasScenario = !!sections.scenario && sections.scenario.includes('ServiceNow administrator');
  const hasObjective = !!sections.taskObjective && sections.taskObjective.includes('Create a user record');

  if (hasLesson && hasScenario && hasObjective) {
    console.log('[PASS] Test 1: All sections extracted correctly.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 1: Sections extraction failed.', sections);
    process.exit(1);
  }
}

run();
