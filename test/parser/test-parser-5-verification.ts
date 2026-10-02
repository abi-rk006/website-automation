import { TaskParser } from '../../src/parser/task-parser.js';

async function run() {
  console.log('--- Test 5: Verification Extraction ---');
  const parser = new TaskParser();

  const input = `
1. Create user Bob.HR_Support.
User ID: Bob.HR_Support
Email: Bob@example.com

2. After creating both users, verify they appear in the Users list.
`;

  const { task } = await parser.parse(input);

  if (task.verification.length === 0) {
    console.error('[FAIL] Test 5: No verification requirement generated.');
    process.exit(1);
  }

  const ver = task.verification[0];
  const hasType = ver.type === 'record_exists';
  const hasLocation = ver.location?.toLowerCase().includes('users list');
  const hasId = ver.identifiers?.includes('Bob.HR_Support');

  if (hasType && hasLocation && hasId) {
    console.log('[PASS] Test 5: Verification requirement correctly generated.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 5: Verification requirement details mismatched.', ver);
    process.exit(1);
  }
}

run();
