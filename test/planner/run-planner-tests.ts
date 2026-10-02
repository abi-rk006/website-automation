import { execSync } from 'child_process';

const plannerTests = [
  { name: 'Planner Test 1 — Single Action Planning', script: 'test/planner/test-planner-1-single-action.ts' },
  { name: 'Planner Test 2 — Multiple Actions Planning', script: 'test/planner/test-planner-2-multi-actions.ts' },
  { name: 'Planner Test 3 — Navigation Planning', script: 'test/planner/test-planner-3-navigation.ts' },
  { name: 'Planner Test 4 — Verification Planning', script: 'test/planner/test-planner-4-verification.ts' },
  { name: 'Planner Test 5 — Dependencies', script: 'test/planner/test-planner-5-dependencies.ts' },
  { name: 'Planner Test 6 — Data Preservation', script: 'test/planner/test-planner-6-data-preservation.ts' },
  { name: 'Planner Test 7 — Missing Verification Rejection', script: 'test/planner/test-planner-7-missing-verification.ts' },
  { name: 'Planner Test 8 — Invalid Dependency Rejection', script: 'test/planner/test-planner-8-invalid-dependency.ts' },
  { name: 'Planner Test 9 — Dependency Cycle Rejection', script: 'test/planner/test-planner-9-dependency-cycle.ts' },
  { name: 'Planner Test 10 — Runtime Selector Rejection', script: 'test/planner/test-planner-10-runtime-selector-rejection.ts' },
  { name: 'Planner Test 11 — Full Bob/Jane Task Planning', script: 'test/planner/test-planner-11-full-task.ts' },
  { name: 'Planner Test 12 — Decoupled Planning Without Browser', script: 'test/planner/test-planner-12-no-browser-execution.ts' },
];

console.log('====================================================');
console.log('      TNSKILL Phase 3 Planner Test Suite            ');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

for (const test of plannerTests) {
  console.log(`\n>>> Executing ${test.name}...`);
  try {
    execSync(`npx tsx ${test.script}`, { stdio: 'inherit' });
    console.log(`>>> ${test.name}: PASSED`);
    passed++;
  } catch (error: any) {
    console.error(`>>> ${test.name}: FAILED`);
    failed++;
    break;
  }
}

console.log('\n====================================================');
console.log(`PLANNER RESULTS: ${passed} Passed, ${failed} Failed out of ${plannerTests.length} tests.`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
