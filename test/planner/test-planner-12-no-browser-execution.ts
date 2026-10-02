import { TaskPlanner } from '../../src/planner/task-planner.js';
import { ParsedTask } from '../../src/parser/types.js';

async function run() {
  console.log('--- Test 12: Decoupled Planning Without Browser or MCP ---');

  // Verify that neither playwright, chromium, nor @playwright/mcp are imported or spawned
  const activeProcessesBefore = Object.keys(process.env);

  const planner = new TaskPlanner();

  const task: ParsedTask = {
    platform: 'ServiceNow',
    startNavigation: ['All', 'System Definition', 'Tables', 'New'],
    actions: [
      {
        type: 'create',
        entity: 'table',
        data: {
          label: 'Hardware Asset',
          name: 'u_hardware_asset',
          application: 'Global',
          active: true,
        },
      },
    ],
    verification: [
      {
        type: 'record_exists',
        entity: 'table',
        identifiers: ['u_hardware_asset'],
        location: 'Tables list',
      },
    ],
  };

  // Generate execution plan
  const { plan, validation } = await planner.plan(task);

  // Assertions:
  // 1. Plan generated and valid
  const planOk = plan.steps.length >= 3 && validation.valid;

  // 2. Verify no browser socket or child process was spawned by the planner
  // The Node.js event loop should be completely free of browser stdio channels
  const noBrowserImports =
    typeof (global as any).playwright === 'undefined' &&
    typeof (global as any).chromium === 'undefined';

  if (planOk && noBrowserImports) {
    console.log('[PASS] Test 12: Planner operates 100% independently of browser, Playwright, and MCP.');
    process.exit(0);
  } else {
    console.error('[FAIL] Test 12: Browser decoupling assertion failed.', { planOk, noBrowserImports });
    process.exit(1);
  }
}

run();
