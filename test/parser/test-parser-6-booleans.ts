import { normalizeBooleanValue } from '../../src/parser/normalizers.js';

async function run() {
  console.log('--- Test 6: Boolean Normalization ---');

  const trueCases = ['Enabled', 'enabled', 'Checked', 'checked', 'Yes', 'yes', 'true', 'True', 'on', '1'];
  const falseCases = ['Disabled', 'disabled', 'Unchecked', 'unchecked', 'No', 'no', 'false', 'False', 'off', '0'];

  for (const c of trueCases) {
    const res = normalizeBooleanValue(c);
    if (res !== true) {
      console.error(`[FAIL] Expected '${c}' to normalize to true, got:`, res);
      process.exit(1);
    }
  }

  for (const c of falseCases) {
    const res = normalizeBooleanValue(c);
    if (res !== false) {
      console.error(`[FAIL] Expected '${c}' to normalize to false, got:`, res);
      process.exit(1);
    }
  }

  // Non-boolean should remain unchanged
  const stringVal = 'Some arbitrary string';
  if (normalizeBooleanValue(stringVal) !== stringVal) {
    console.error(`[FAIL] Non-boolean value was improperly mutated:`, normalizeBooleanValue(stringVal));
    process.exit(1);
  }

  console.log('[PASS] Test 6: All boolean values correctly normalized.');
  process.exit(0);
}

run();
