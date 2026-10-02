import { McpClientWrapper } from '../src/mcp/client.js';
import { loadConfig } from '../src/config/config.js';

async function runTest1() {
  console.log('\n--- Running Test 1: MCP Connection ---');
  const config = loadConfig();
  const client = new McpClientWrapper(config);

  try {
    const tools = await client.connect();
    console.log(`[PASS] MCP server connected successfully. Discovered ${tools.length} tools.`);
    await client.close();
    process.exit(0);
  } catch (err: any) {
    console.error('[FAIL] MCP server connection failed:', err);
    process.exit(1);
  }
}

runTest1();
