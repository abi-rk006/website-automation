import { BrowserAgent } from '../src/agent/agent.js';
import { startTestServer } from './test-server.js';

async function runTest5() {
  console.log('\n--- Running Test 5: Form Interaction ---');
  const server = await startTestServer(8899);
  console.log('Test fixture server running on http://localhost:8899');

  const agent = new BrowserAgent();

  try {
    const task = 'Navigate to http://localhost:8899/interaction.html, enter "Abhishek" into the name input, and click the Submit button.';
    const result = await agent.execute(task);

    console.log(result.summary);

    const hasFill = result.state.history.some((h) => h.tool.includes('fill') || h.tool.includes('type'));
    const hasClick = result.state.history.some((h) => h.tool.includes('click'));

    if (result.state.status === 'completed' && (hasFill || hasClick)) {
      console.log('[PASS] Test 5: Successfully performed form interaction through MCP.');
      await agent.shutdown();
      server.close();
      process.exit(0);
    } else {
      console.error('[FAIL] Test 5 did not complete interaction as expected.');
      await agent.shutdown();
      server.close();
      process.exit(1);
    }
  } catch (err: any) {
    console.error('[FAIL] Test 5 encountered an error:', err);
    await agent.shutdown();
    server.close();
    process.exit(1);
  }
}

runTest5();
