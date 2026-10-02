import { TaskPlanner } from '../../src/planner/task-planner.js';
import { ParsedTask } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 3: Navigation Planning ---');
  const planner = new TaskPlanner();

  const task: ParsedTask = {
    platform: 'ServiceNow',
    startNavigation: ['All', 'User Administration', 'Users', 'New'],
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
    verification: [],
  };

  const { plan, validation } = await planner.plan(task);

  const navIndex = plan.steps.findIndex((s) => s.type === 'navigate');
  const createIndex = plan.steps.findIndex((s) => s.type === 'create_record');

  const navBeforeCreate = navIndex !== -1 && createIndex !== -1 && navIndex < createIndex;
  const navStep = plan.steps[navIndex];

  if (navBeforeCreate && navStep.expectedState?.pagePurpose === 'list_view' && validation.valid) {
    console.log('[PASS] Test 3: Navigation planned before creation with valid expected state.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 3: Navigation ordering failed.', { navIndex, createIndex, validation });
    process.exit(1);
  }
}

run();
