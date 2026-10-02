import { TaskPlanner } from '../../src/planner/task-planner.js';
import { ParsedTask } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 6: Exact Data Preservation ---');
  const planner = new TaskPlanner();

  const exactData = {
    userId: 'Bob.HR_Support',
    firstName: 'Bob',
    lastName: 'HR Support',
    department: 'HR',
    email: 'Bob@example.com',
    active: true,
  };

  const task: ParsedTask = {
    platform: 'ServiceNow',
    actions: [
      {
        type: 'create',
        entity: 'user',
        data: { ...exactData },
      },
    ],
    verification: [],
  };

  const { plan, validation } = await planner.plan(task);

  const createStep = plan.steps.find((s) => s.type === 'create_record');
  const planData = createStep?.action?.data;

  let allMatch = true;
  for (const [k, v] of Object.entries(exactData)) {
    if (planData?.[k] !== v) {
      console.error(`Mismatch for key ${k}: expected '${v}', got '${planData?.[k]}'`);
      allMatch = false;
    }
  }

  if (allMatch && validation.valid) {
    console.log('[PASS] Test 6: Exact data values preserved without case modification or mutation.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 6: Data preservation failed.', { planData, exactData });
    process.exit(1);
  }
}

run();
