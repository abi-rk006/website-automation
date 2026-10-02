import { PlanValidator } from '../../src/planner/plan-validator.js';
import { ParsedTask } from '../../src/parser/types.js';
import { ExecutionPlan } from '../../src/planner/types.js';

async function run() {
  console.log('--- Test 8: Invalid Dependency Rejection ---');
  const validator = new PlanValidator();

  const sourceTask: ParsedTask = {
    platform: 'ServiceNow',
    actions: [],
    verification: [],
  };

  // Plan referring to a non-existent step-99
  const defectivePlan: ExecutionPlan = {
    planId: 'defective_plan_2',
    steps: [
      {
        id: 'step-1',
        type: 'open_create_form',
        description: 'Open New form',
        dependsOn: ['step-99'],
      },
    ],
  };

  const validation = validator.validate(defectivePlan, sourceTask);

  const caughtNonExistent = validation.errors.some((e) => e.includes("non-existent step 'step-99'"));

  if (!validation.valid && caughtNonExistent) {
    console.log('[PASS] Test 8: Validator successfully rejected reference to non-existent step-99.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 8: Validator failed to catch invalid dependency.', validation);
    process.exit(1);
  }
}

run();
