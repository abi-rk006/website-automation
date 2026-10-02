import { TaskParser } from '../../src/parser/task-parser.js';
import { CreateAction } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 2: Single Entity Extraction ---');
  const parser = new TaskParser();

  const input = `
**Task Objective**
Create a new user with the following details:
User ID: Alice.Admin
First Name: Alice
Last Name: Admin
Department: IT
Email: Alice@example.com
Active Checkbox: Enabled
`;

  const { task, validation } = await parser.parse(input);

  if (task.actions.length !== 1) {
    console.error(`[FAIL] Expected 1 action, got ${task.actions.length}`);
    process.exit(1);
  }

  const action = task.actions[0] as CreateAction;
  if (
    action.entity === 'user' &&
    action.data.userId === 'Alice.Admin' &&
    action.data.firstName === 'Alice' &&
    action.data.lastName === 'Admin' &&
    action.data.department === 'IT' &&
    action.data.email === 'Alice@example.com' &&
    action.data.active === true &&
    validation.valid
  ) {
    console.log('[PASS] Test 2: Single entity correctly extracted and normalized.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 2: Field values mismatched.', action.data);
    process.exit(1);
  }
}

run();
