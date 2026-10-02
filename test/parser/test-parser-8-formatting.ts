import { TaskParser } from '../../src/parser/task-parser.js';
import { CreateAction } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 8: Formatting Variation Tolerance ---');
  const parser = new TaskParser();

  const format1 = `
**Task Objective**
User ID: Bob.HR_Support
Email: Bob@example.com
`;

  const format2 = `
Task Objective:
User ID: Bob.HR_Support
Email: Bob@example.com
`;

  const format3 = `
### Task Objectives
User ID: Bob.HR_Support
Email: Bob@example.com
`;

  const res1 = await parser.parse(format1);
  const res2 = await parser.parse(format2);
  const res3 = await parser.parse(format3);

  const act1 = res1.task.actions[0] as CreateAction;
  const act2 = res2.task.actions[0] as CreateAction;
  const act3 = res3.task.actions[0] as CreateAction;

  const same =
    act1?.data?.userId === 'Bob.HR_Support' &&
    act2?.data?.userId === 'Bob.HR_Support' &&
    act3?.data?.userId === 'Bob.HR_Support' &&
    act1?.data?.email === 'Bob@example.com' &&
    act2?.data?.email === 'Bob@example.com' &&
    act3?.data?.email === 'Bob@example.com';

  if (same) {
    console.log('[PASS] Test 8: Formatting variations produce identical semantic structure.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 8: Variations did not match.', { act1, act2, act3 });
    process.exit(1);
  }
}

run();
