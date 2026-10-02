import { McpClientWrapper } from '../src/mcp/client.js';
import { loadConfig } from '../src/config/config.js';

async function runTest2() {
  console.log('\n--- Running Test 2: Dynamic Tool Discovery ---');
  const config = loadConfig();
  const client = new McpClientWrapper(config);

  try {
    const tools = await client.connect();
    console.log(`Discovered ${tools.length} tools dynamically:`);
    for (const tool of tools) {
      console.log(`  - ${tool.name}: ${tool.description?.slice(0, 60)}...`);
    }

    // Verify key categories exist (navigation, interaction, observation)
    const hasNavigation = tools.some((t) => t.name.includes('navigate') || t.name.includes('goto') || t.name.includes('open'));
    const hasInteraction = tools.some((t) => t.name.includes('click') || t.name.includes('fill') || t.name.includes('type'));
    const hasObservation = tools.some((t) => t.name.includes('text') || t.name.includes('html') || t.name.includes('screenshot') || t.name.includes('snapshot'));

    if (hasNavigation && hasInteraction && hasObservation) {
      console.log('[PASS] Discovered all essential browser tool categories (Navigation, Interaction, Observation).');
      await client.close();
      process.exit(0);
    } else {
      console.error('[FAIL] Missing essential tool categories');
      await client.close();
      process.exit(1);
    }
  } catch (err: any) {
    console.error('[FAIL] Tool discovery failed:', err);
    process.exit(1);
  }
}

runTest2();
