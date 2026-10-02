import { TaskPlanner } from '../../src/planner/task-planner.js';
import { ParsedTask } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 2: Multiple Actions Planning ---');
  const planner = new TaskPlanner();

  const task: ParsedTask = {
    platform: 'ServiceNow',
    actions: [
      {
        type: 'create',
        entity: 'user',
        data: {
          userId: 'Bob.HR_Support',
          firstName: 'Bob',
          email: 'Bob@example.com',
        },
      },
      {
        type: 'create',
        entity: 'user',
        data: {
          userId: 'Jane.HR_Support',
          firstName: 'Jane',
          email: 'Jane@example.com',
        },
      },
    ],
    verification: [],
  };

  const { plan, validation } = await planner.plan(task);

  const hasBob = plan.steps.some(
    (s) => s.type === 'create_record' && s.action?.data?.userId === 'Bob.HR_Support'
  );
  const hasJane = plan.steps.some(
    (s) => s.type === 'create_record' && s.action?.data?.userId === 'Jane.HR_Support'
  );

  if (hasBob && hasJane && validation.valid) {
    console.log('[PASS] Test 2: Both entities appear as distinct plan steps and pass validation.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 2: Multiple actions plan validation failed.', { hasBob, hasJane, validation });
    process.exit(1);
  }
}

run();
