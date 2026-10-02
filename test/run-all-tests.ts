import { execSync } from 'child_process';

const tests = [
  { name: 'Test 1 — MCP Connection', script: 'test/test-1-mcp.ts' },
  { name: 'Test 2 — Tool Discovery', script: 'test/test-2-discovery.ts' },
  { name: 'Test 3 — Browser Launch', script: 'test/test-3-launch.ts' },
  { name: 'Test 4 — Navigation', script: 'test/test-4-navigation.ts' },
  { name: 'Test 5 — Form Interaction', script: 'test/test-5-interaction.ts' },
  { name: 'Test 6 — Observation-Driven Interaction', script: 'test/test-6-observation.ts' },
  { name: 'Test 7 — Multi-Step Agent Loop', script: 'test/test-7-multi-step.ts' },
];

console.log('====================================================');
console.log('   TNSKILL Autonomous Browser Agent Test Runner    ');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

for (const test of tests) {
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
console.log(`RESULTS: ${passed} Passed, ${failed} Failed out of ${tests.length} tests.`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
