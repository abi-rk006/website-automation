import { BrowserAgent } from '../src/agent/agent.js';
import { startTestServer } from './test-server.js';

async function runTest7() {
  console.log('\n--- Running Test 7: Multi-Step Agent Loop ---');
  const server = await startTestServer(8899);
  console.log('Test fixture server running on http://localhost:8899');

  const agent = new BrowserAgent();

  try {
    const task = 'Navigate to http://localhost:8899/interaction.html, find the name input field, enter "Abhishek", click the Submit button, and observe the confirmation.';
    const result = await agent.execute(task);

    console.log(result.summary);

    const hasNavigate = result.state.history.some((h) => h.tool.includes('navigate') || h.tool.includes('open'));
    const hasType = result.state.history.some((h) => h.tool.includes('type') || h.tool.includes('fill'));
    const hasClick = result.state.history.some((h) => h.tool.includes('click'));

    if (result.state.status === 'completed' && hasNavigate && (hasType || hasClick)) {
      console.log('[PASS] Test 7: Multi-step observe-decide-act loop successfully completed through official Playwright MCP.');
      await agent.shutdown();
      server.close();
      process.exit(0);
    } else {
      console.error('[FAIL] Test 7 did not complete multi-step execution as expected.');
      await agent.shutdown();
      server.close();
      process.exit(1);
    }
  } catch (err: any) {
    console.error('[FAIL] Test 7 encountered an error:', err);
    await agent.shutdown();
    server.close();
    process.exit(1);
  }
}

runTest7();
