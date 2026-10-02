import { TaskPlanner } from '../../src/planner/task-planner.js';
import { ParsedTask } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 1: Single Action Planning ---');
  const planner = new TaskPlanner();

  const task: ParsedTask = {
    platform: 'ServiceNow',
    actions: [
      {
        type: 'create',
        entity: 'user',
        data: {
          userId: 'Alice.Admin',
          firstName: 'Alice',
          email: 'Alice@example.com',
        },
      },
    ],
    verification: [],
  };

  const { plan, validation } = await planner.plan(task);

  const hasCreateStep = plan.steps.some(
    (s) => s.type === 'create_record' && s.action?.data?.userId === 'Alice.Admin'
  );

  if (hasCreateStep && validation.valid) {
    console.log('[PASS] Test 1: Single action plan generated and validated successfully.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 1: Single action plan invalid.', { plan, validation });
    process.exit(1);
  }
}

run();
