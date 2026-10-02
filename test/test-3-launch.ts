import { BrowserAgent } from '../src/agent/agent.js';

async function runTest3() {
  console.log('\n--- Running Test 3: Browser Launch & Navigation ---');
  const agent = new BrowserAgent();

  try {
    const task = 'Open https://example.com';
    const result = await agent.execute(task);

    console.log(result.summary);

    if (result.state.status === 'completed' && result.state.actionCount > 0) {
      console.log('[PASS] Test 3: Browser launched and example.com loaded successfully.');
      await agent.shutdown();
      process.exit(0);
    } else {
      console.error('[FAIL] Test 3 did not complete successfully.');
      await agent.shutdown();
      process.exit(1);
    }
  } catch (err: any) {
    console.error('[FAIL] Test 3 encountered an error:', err);
    await agent.shutdown();
    process.exit(1);
  }
}

runTest3();
