import { TaskParser } from '../../src/parser/task-parser.js';

async function run() {
  console.log('--- Test 9: Invalid & Ambiguous Task Detection ---');
  const parser = new TaskParser();

  const input = 'Do something useful in ServiceNow.';

  const { task, validation } = await parser.parse(input);

  // 1. Should not invent arbitrary actions
  const noFakeActions = task.actions.length === 0;

  // 2. Validation must flag invalid and require clarification
  const requiresClarification = validation.requiresClarification || !validation.valid;

  if (noFakeActions && requiresClarification) {
    console.log('[PASS] Test 9: Invalid task correctly flagged as requiring clarification.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 9: Invalid task was not properly rejected.', { task, validation });
    process.exit(1);
  }
}

run();
