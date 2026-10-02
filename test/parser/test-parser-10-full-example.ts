import fs from 'fs';
import path from 'path';
import { TaskParser } from '../../src/parser/task-parser.js';
import { CreateAction } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 10: Full Bob & Jane ServiceNow Task ---');
  const parser = new TaskParser();

  // Test both golden fixture and tasks/create-hr-task.txt
  const fixturePath = path.resolve(process.cwd(), 'test/fixtures/tnskill-user-create.txt');
  const hrTaskPath = path.resolve(process.cwd(), 'tasks/create-hr-task.txt');

  const contentFixture = fs.readFileSync(fixturePath, 'utf-8');
  const contentHrTask = fs.readFileSync(hrTaskPath, 'utf-8');

  console.log('Testing full golden fixture...');
  const res1 = await parser.parse(contentFixture);

  console.log('Testing user create-hr-task.txt...');
  const res2 = await parser.parse(contentHrTask);

  // Validate res1 (Full fixture with Lesson & Scenario)
  const task1 = res1.task;
  const val1 = res1.validation;

  const validPlatform = task1.platform === 'ServiceNow';
  const validRole = task1.role === 'administrator';
  const hasLesson = !!task1.context?.lesson;
  const hasScenario = !!task1.context?.scenario;
  const validNav =
    task1.startNavigation?.length === 4 &&
    task1.startNavigation[0] === 'All' &&
    task1.startNavigation[1] === 'User Administration' &&
    task1.startNavigation[2] === 'Users' &&
    task1.startNavigation[3] === 'New';

  const validActions = task1.actions.length === 2;
  const user1 = task1.actions[0] as CreateAction;
  const user2 = task1.actions[1] as CreateAction;

  const validUsers =
    user1.data.userId === 'Bob.HR_Support' &&
    user1.data.firstName === 'Bob' &&
    user1.data.lastName === 'HR Support' &&
    user1.data.department === 'HR' &&
    user1.data.email === 'Bob@example.com' &&
    user1.data.active === true &&
    user2.data.userId === 'Jane.HR_Support' &&
    user2.data.firstName === 'Jane' &&
    user2.data.lastName === 'HR Support' &&
    user2.data.department === 'HR' &&
    user2.data.email === 'Jane@example.com' &&
    user2.data.active === true;

  const validVerification =
    task1.verification.length > 0 &&
    task1.verification[0].identifiers?.includes('Bob.HR_Support') &&
    task1.verification[0].identifiers?.includes('Jane.HR_Support');

  if (
    validPlatform &&
    validRole &&
    hasLesson &&
    hasScenario &&
    validNav &&
    validActions &&
    validUsers &&
    validVerification &&
    val1.valid
  ) {
    console.log('[PASS] Test 10: Complete Bob & Jane task successfully parsed into valid structured task.');
    console.log('\n--- Formatted Output Preview ---');
    console.log(res1.formattedOutput);
    process.exit(0);
  } else {
    console.error('[FAIL] Test 10: Full task verification failed.', {
      validPlatform,
      validRole,
      hasLesson,
      hasScenario,
      validNav,
      validActions,
      validUsers,
      validVerification,
      val1,
    });
    process.exit(1);
  }
}

run();
