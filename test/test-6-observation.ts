import { BrowserAgent } from '../src/agent/agent.js';
import { startTestServer } from './test-server.js';

async function runTest6() {
  console.log('\n--- Running Test 6: Observation-Driven Interaction ---');
  const server = await startTestServer(8899);
  console.log('Test fixture server running on http://localhost:8899');

  const agent = new BrowserAgent();

  try {
    const task = 'Navigate to http://localhost:8899/observation-login.html, inspect the page, find the Login button, and click it.';
    const result = await agent.execute(task);

    console.log(result.summary);

    const hasClick = result.state.history.some((h) => h.tool.includes('click'));

    if (result.state.status === 'completed' && hasClick) {
      console.log('[PASS] Test 6: Observation-driven interaction succeeded.');
      await agent.shutdown();
      server.close();
      process.exit(0);
    } else {
      console.error('[FAIL] Test 6 did not perform click through observation.');
      await agent.shutdown();
      server.close();
      process.exit(1);
    }
  } catch (err: any) {
    console.error('[FAIL] Test 6 encountered an error:', err);
    await agent.shutdown();
    server.close();
    process.exit(1);
  }
}

runTest6();
