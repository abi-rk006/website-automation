import { TaskPlanner } from '../../src/planner/task-planner.js';
import { ParsedTask } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 4: Verification Planning ---');
  const planner = new TaskPlanner();

  const task: ParsedTask = {
    platform: 'ServiceNow',
    actions: [
      {
        type: 'create',
        entity: 'user',
        data: {
          userId: 'Bob.HR_Support',
          email: 'Bob@example.com',
        },
      },
    ],
    verification: [
      {
        type: 'record_exists',
        entity: 'user',
        identifiers: ['Bob.HR_Support'],
        location: 'Users list',
      },
    ],
  };

  const { plan, validation } = await planner.plan(task);

  const verifyStep = plan.steps.find((s) => s.type === 'verify');
  const createStepIndex = plan.steps.findIndex((s) => s.type === 'create_record');
  const verifyStepIndex = plan.steps.findIndex((s) => s.type === 'verify');

  const hasVerify = !!verifyStep;
  const isAfterCreate = verifyStepIndex > createIndexSafe(createStepIndex);
  const hasExpectedState = verifyStep?.expectedState?.status === 'verified_in_list';
  const hasIdentifier = verifyStep?.verification?.identifier === 'Bob.HR_Support';

  function createIndexSafe(idx: number) {
    return idx === -1 ? Infinity : idx;
  }

  if (hasVerify && isAfterCreate && hasExpectedState && hasIdentifier && validation.valid) {
    console.log('[PASS] Test 4: Verification step planned following creation with valid target.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 4: Verification planning failed.', { verifyStep, validation });
    process.exit(1);
  }
}

run();
