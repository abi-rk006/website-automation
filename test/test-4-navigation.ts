import { BrowserAgent } from '../src/agent/agent.js';

async function runTest4() {
  console.log('\n--- Running Test 4: Observation-Driven Navigation ---');
  const agent = new BrowserAgent();

  try {
    const task = 'Open https://example.com and click the Learn more link to navigate to the information page.';
    const result = await agent.execute(task);

    console.log(result.summary);

    if (result.state.status === 'completed' && result.state.actionCount >= 1) {
      console.log('[PASS] Test 4: Navigation completed.');
      await agent.shutdown();
      process.exit(0);
    } else {
      console.error('[FAIL] Test 4 did not complete.');
      await agent.shutdown();
      process.exit(1);
    }
  } catch (err: any) {
    console.error('[FAIL] Test 4 encountered an error:', err);
    await agent.shutdown();
    process.exit(1);
  }
}

runTest4();
