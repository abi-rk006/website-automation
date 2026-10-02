import { TaskPlanner } from '../../src/planner/task-planner.js';
import { ParsedTask } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 5: Dependency Chaining ---');
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
    verification: [
      {
        type: 'record_exists',
        entity: 'user',
        identifiers: ['Bob.HR_Support'],
      },
    ],
  };

  const { plan, validation } = await planner.plan(task);

  // Verify steps have valid dependencies
  const openFormStep = plan.steps.find((s) => s.type === 'open_create_form');
  const createStep = plan.steps.find((s) => s.type === 'create_record');
  const verifyStep = plan.steps.find((s) => s.type === 'verify');

  const openFormDependsOnNav = openFormStep?.dependsOn?.includes('step-1');
  const createDependsOnOpenForm = createStep?.dependsOn?.includes(openFormStep!.id);
  const verifyDependsOnCreate = verifyStep?.dependsOn?.includes(createStep!.id);

  if (openFormDependsOnNav && createDependsOnOpenForm && verifyDependsOnCreate && validation.valid) {
    console.log('[PASS] Test 5: Step dependencies form a valid topological execution chain.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 5: Dependencies chain validation failed.', {
      openFormStep,
      createStep,
      verifyStep,
      validation,
    });
    process.exit(1);
  }
}

run();
