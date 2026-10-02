import { PlanValidator } from '../../src/planner/plan-validator.js';
import { ParsedTask } from '../../src/parser/types.js';
import { ExecutionPlan } from '../../src/planner/types.js';

async function run() {
  console.log('--- Test 7: Missing Verification Rejection ---');
  const validator = new PlanValidator();

  const sourceTask: ParsedTask = {
    platform: 'ServiceNow',
    actions: [
      {
        type: 'create',
        entity: 'user',
        data: { userId: 'Bob.HR_Support', email: 'Bob@example.com' },
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

  // Defective plan: creates Bob but completely omits verification
  const defectivePlan: ExecutionPlan = {
    planId: 'defective_plan_1',
    steps: [
      {
        id: 'step-1',
        type: 'create_record',
        description: 'Create Bob',
        action: {
          type: 'create_record',
          data: { userId: 'Bob.HR_Support', email: 'Bob@example.com' },
        },
      },
    ],
  };

  const validation = validator.validate(defectivePlan, sourceTask);

  if (!validation.valid && validation.errors.some((e) => e.includes('missing required verification'))) {
    console.log('[PASS] Test 7: Validator correctly rejected plan missing required verification step.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 7: Validator failed to catch missing verification.', validation);
    process.exit(1);
  }
}

run();
