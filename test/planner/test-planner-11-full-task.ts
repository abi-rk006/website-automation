import fs from 'fs';
import path from 'path';
import { TaskParser } from '../../src/parser/task-parser.js';
import { TaskPlanner } from '../../src/planner/task-planner.js';

async function run() {
  console.log('--- Test 11: Full Bob & Jane Task Planning ---');
  const parser = new TaskParser();
  const planner = new TaskPlanner();

  const fixturePath = path.resolve(process.cwd(), 'test/fixtures/tnskill-user-create.txt');
  const content = fs.readFileSync(fixturePath, 'utf-8');

  // 1. Parse Task
  const { task, validation: parseVal } = await parser.parse(content);
  if (!parseVal.valid) {
    console.error('[FAIL] Test 11: Task parsing failed.', parseVal);
    process.exit(1);
  }

  // 2. Plan Task
  const { plan, validation: planVal, formattedOutput } = await planner.plan(task);

  // Check 7 logical steps
  const has7Steps = plan.steps.length === 7;
  const stepTypes = plan.steps.map((s) => s.type);
  const expectedTypes = [
    'navigate',
    'open_create_form',
    'create_record',
    'verify',
    'open_create_form',
    'create_record',
    'verify',
  ];

  const typesMatch = JSON.stringify(stepTypes) === JSON.stringify(expectedTypes);

  // Check data preservation
  const bobStep = plan.steps.find((s) => s.action?.data?.userId === 'Bob.HR_Support');
  const janeStep = plan.steps.find((s) => s.action?.data?.userId === 'Jane.HR_Support');

  const bobOk =
    bobStep?.action?.data?.firstName === 'Bob' &&
    bobStep?.action?.data?.email === 'Bob@example.com' &&
    bobStep?.action?.data?.active === true;

  const janeOk =
    janeStep?.action?.data?.firstName === 'Jane' &&
    janeStep?.action?.data?.email === 'Jane@example.com' &&
    janeStep?.action?.data?.active === true;

  // Check expected state presence
  const allStepsHaveExpectedState = plan.steps.every(
    (s) => s.expectedState && Object.keys(s.expectedState).length > 0
  );

  if (has7Steps && typesMatch && bobOk && janeOk && allStepsHaveExpectedState && planVal.valid) {
    console.log('[PASS] Test 11: Full Bob & Jane task converted to valid 7-step execution plan.');
    console.log('\n--- Output Preview ---');
    console.log(formattedOutput);
    process.exit(0);
  } else {
    console.error('[FAIL] Test 11: Full task plan failed verification.', {
      has7Steps,
      typesMatch,
      bobOk,
      janeOk,
      allStepsHaveExpectedState,
      planVal,
    });
    process.exit(1);
  }
}

run();
