import { extractNavigationSteps } from '../../src/parser/normalizers.js';

async function run() {
  console.log('--- Test 4: Navigation Extraction ---');

  const input1 = 'To begin, navigate to All > User Administration > Users and select New.';
  const steps1 = extractNavigationSteps(input1);

  const input2 = 'All > User Administration > Users > New';
  const steps2 = extractNavigationSteps(input2);

  const expected = ['All', 'User Administration', 'Users', 'New'];

  const match1 = JSON.stringify(steps1) === JSON.stringify(expected);
  const match2 = JSON.stringify(steps2) === JSON.stringify(expected);

  if (match1 && match2) {
    console.log('[PASS] Test 4: Navigation steps correctly extracted (4 steps).');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 4: Navigation mismatch.', { steps1, steps2, expected });
    process.exit(1);
  }
}

run();
