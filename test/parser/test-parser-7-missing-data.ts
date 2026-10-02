import { TaskParser } from '../../src/parser/task-parser.js';
import { CreateAction } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 7: Missing Data & Zero Hallucination ---');
  const parser = new TaskParser();

  // Intentionally omits Email
  const input = `
**Task Objective**
1. Create a user record:
User ID: Bob.HR_Support
First Name: Bob
Last Name: HR Support
Department: HR
Active Checkbox: Enabled
`;

  const { task, validation } = await parser.parse(input);

  const action = task.actions[0] as CreateAction;

  // 1. Verify parser DID NOT hallucinate an email address
  if (action.data.email !== undefined) {
    console.error('[FAIL] Test 7: Parser hallucinated an email address!', action.data.email);
    process.exit(1);
  }

  // 2. Verify validation detected missing field
  const emailMissing = validation.missingFields.some((m) => m.field === 'email');
  if (emailMissing && !validation.valid && validation.requiresClarification) {
    console.log('[PASS] Test 7: Correctly detected missing required field without hallucinating.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 7: Validation did not flag missing email as required.', validation);
    process.exit(1);
  }
}

run();
