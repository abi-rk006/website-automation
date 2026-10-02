import { PlanValidator } from '../../src/planner/plan-validator.js';
import { ParsedTask } from '../../src/parser/types.js';
import { ExecutionPlan } from '../../src/planner/types.js';

async function run() {
  console.log('--- Test 9: Dependency Cycle Rejection ---');
  const validator = new PlanValidator();

  const sourceTask: ParsedTask = {
    platform: 'ServiceNow',
    actions: [],
    verification: [],
  };

  // Plan containing an execution dependency cycle
  const cyclicPlan: ExecutionPlan = {
    planId: 'cyclic_plan_1',
    steps: [
      {
        id: 'step-1',
        type: 'open_create_form',
        description: 'Step 1',
        dependsOn: ['step-2'],
      },
      {
        id: 'step-2',
        type: 'create_record',
        description: 'Step 2',
        dependsOn: ['step-1'],
      },
    ],
  };

  const validation = validator.validate(cyclicPlan, sourceTask);

  const caughtCycle = validation.errors.some((e) => e.includes('Dependency cycle detected'));

  if (!validation.valid && caughtCycle) {
    console.log('[PASS] Test 9: Validator correctly detected and rejected dependency cycle.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 9: Validator failed to catch cyclic dependency graph.', validation);
    process.exit(1);
  }
}

run();
