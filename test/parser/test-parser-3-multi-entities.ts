import { TaskParser } from '../../src/parser/task-parser.js';
import { CreateAction } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 3: Multiple Entities Extraction ---');
  const parser = new TaskParser();

  const input = `
1. Create two new users in ServiceNow with the following information:
User 1:
User ID: Bob.HR_Support
First Name: Bob
Last Name: HR Support
Department: HR
Email: Bob@example.com
Active Checkbox: Enabled

User 2:
User ID: Jane.HR_Support
First Name: Jane
Last Name: HR Support
Department: HR
Email: Jane@example.com
Active Checkbox: Enabled
`;

  const { task, validation } = await parser.parse(input);

  if (task.actions.length !== 2) {
    console.error(`[FAIL] Expected 2 actions, got ${task.actions.length}`);
    process.exit(1);
  }

  const user1 = task.actions[0] as CreateAction;
  const user2 = task.actions[1] as CreateAction;

  const user1Ok =
    user1.data.userId === 'Bob.HR_Support' &&
    user1.data.firstName === 'Bob' &&
    user1.data.email === 'Bob@example.com' &&
    user1.data.active === true;

  const user2Ok =
    user2.data.userId === 'Jane.HR_Support' &&
    user2.data.firstName === 'Jane' &&
    user2.data.email === 'Jane@example.com' &&
    user2.data.active === true;

  if (user1Ok && user2Ok && validation.valid) {
    console.log('[PASS] Test 3: Multiple entities extracted into separate actions.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 3: Failed multi-entity verification.', { user1: user1.data, user2: user2.data });
    process.exit(1);
  }
}

run();
