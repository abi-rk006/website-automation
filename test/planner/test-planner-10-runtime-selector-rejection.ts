import { PlanValidator } from '../../src/planner/plan-validator.js';
import { ParsedTask } from '../../src/parser/types.js';
import { ExecutionPlan } from '../../src/planner/types.js';

async function run() {
  console.log('--- Test 10: Runtime Selector & MCP Tool Rejection ---');
  const validator = new PlanValidator();

  const sourceTask: ParsedTask = {
    platform: 'ServiceNow',
    actions: [],
    verification: [],
  };

  // Plan containing CSS selector #submit-button
  const cssPlan: ExecutionPlan = {
    planId: 'invalid_selectors_plan',
    steps: [
      {
        id: 'step-1',
        type: 'custom',
        description: 'Click button',
        action: {
          type: 'click',
          target: '#submit-button',
        },
      },
    ],
  };

  // Plan containing runtime element reference e17
  const refPlan: ExecutionPlan = {
    planId: 'invalid_ref_plan',
    steps: [
      {
        id: 'step-1',
        type: 'custom',
        description: 'Click ref',
        action: {
          type: 'click',
          target: 'e17',
        },
      },
    ],
  };

  const valCss = validator.validate(cssPlan, sourceTask);
  const valRef = validator.validate(refPlan, sourceTask);

  const caughtCss = valCss.errors.some((e) => e.includes('browser-specific selector'));
  const caughtRef = valRef.errors.some((e) => e.includes('runtime element reference'));

  if (!valCss.valid && caughtCss && !valRef.valid && caughtRef) {
    console.log('[PASS] Test 10: Runtime selectors (#submit-button) and element refs (e17) rejected.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 10: Failed to reject runtime selectors.', { valCss, valRef });
    process.exit(1);
  }
}

run();
