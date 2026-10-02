import { execSync } from 'child_process';

const parserTests = [
  { name: 'Parser Test 1 — Basic Section Extraction', script: 'test/parser/test-parser-1-sections.ts' },
  { name: 'Parser Test 2 — Single Entity Extraction', script: 'test/parser/test-parser-2-single-entity.ts' },
  { name: 'Parser Test 3 — Multiple Entities Extraction', script: 'test/parser/test-parser-3-multi-entities.ts' },
  { name: 'Parser Test 4 — Navigation Extraction', script: 'test/parser/test-parser-4-navigation.ts' },
  { name: 'Parser Test 5 — Verification Extraction', script: 'test/parser/test-parser-5-verification.ts' },
  { name: 'Parser Test 6 — Boolean Normalization', script: 'test/parser/test-parser-6-booleans.ts' },
  { name: 'Parser Test 7 — Missing Data & Zero Hallucination', script: 'test/parser/test-parser-7-missing-data.ts' },
  { name: 'Parser Test 8 — Formatting Variation Tolerance', script: 'test/parser/test-parser-8-formatting.ts' },
  { name: 'Parser Test 9 — Invalid & Ambiguous Task Detection', script: 'test/parser/test-parser-9-invalid-task.ts' },
  { name: 'Parser Test 10 — Full Bob & Jane Task', script: 'test/parser/test-parser-10-full-example.ts' },
];

console.log('====================================================');
console.log('      TNSKILL Phase 2 Parser Test Suite             ');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

for (const test of parserTests) {
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
console.log(`PARSER RESULTS: ${passed} Passed, ${failed} Failed out of ${parserTests.length} tests.`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
