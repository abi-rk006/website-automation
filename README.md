# TNSKILL Autonomous Web Automation Agent — Phase 1: Browser Executor

## Architecture Overview
```
User Instruction
       ↓
Local LLM (Ollama / llama3.2:3b)
       ↓
 Agent Runtime (Observation-Decision-Action Loop)
       ↓
  MCP Client (StdioClientTransport / @modelcontextprotocol/sdk)
       ↓
Playwright MCP Server (@executeautomation/playwright-mcp-server)
       ↓
   Playwright
       ↓
    Chromium
       ↓
 Target Website
```

The system strictly executes all browser actions via the **Model Context Protocol (MCP)** tool layer. No hardcoded Playwright scripts are used for task execution.

---

## Directory Structure
```
d:/agent/
├── src/
│   ├── agent/
│   │   ├── agent.ts         # BrowserAgent orchestrator
│   │   ├── loop.ts          # Observe → Decide → Act runtime loop
│   │   └── state.ts         # Agent state tracker & execution summary
│   ├── browser/
│   │   └── browser-runtime.ts # High-level observation and action delegation to MCP
│   ├── cli/
│   │   └── index.ts         # Interactive & single-shot CLI
│   ├── config/
│   │   └── config.ts        # Configuration manager (.env / environment variables)
│   ├── llm/
│   │   ├── provider.ts      # Provider-agnostic LLM interface
│   │   └── ollama.ts        # Ollama local inference implementation
│   ├── logging/
│   │   └── logger.ts        # Structured logger ([INFO], [ACTION], [OBSERVATION], etc.)
│   └── mcp/
│       ├── client.ts        # MCP Client wrapper (lifecycle, discovery, execution, timeouts)
│       ├── manager.ts       # Tool coordination & lifecycle manager
│       └── tools.ts         # Dynamic tool conversion & token optimization
├── test/
│   ├── fixtures/
│   │   ├── interaction.html # Form interaction test fixture
│   │   └── observation-login.html # Observation-driven element discovery fixture
│   ├── run-all-tests.ts     # Complete test runner
│   ├── test-1-mcp.ts        # Test 1: MCP connection
│   ├── test-2-discovery.ts  # Test 2: Dynamic tool discovery
│   ├── test-3-launch.ts     # Test 3: Browser launch & navigation
│   ├── test-4-navigation.ts # Test 4: Observation-driven navigation
│   ├── test-5-interaction.ts# Test 5: Form interaction (input & submit)
│   ├── test-6-observation.ts# Test 6: Dynamic selector observation & click
│   └── test-server.ts       # Local HTTP test server helper
├── .env                     # Runtime configuration
├── .env.example             # Example configuration template
├── package.json
└── tsconfig.json
```

---

## Configuration (`.env`)

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama local endpoint |
| `OLLAMA_MODEL` | `llama3.2:3b` | Model name for local inference |
| `MCP_SERVER_COMMAND` | `npx` | Command to launch Playwright MCP |
| `MCP_SERVER_ARGS` | `["-y","@executeautomation/playwright-mcp-server"]` | MCP launch arguments |
| `BROWSER_HEADLESS` | `false` | Headless mode (`false` opens Chromium UI) |
| `BROWSER_TYPE` | `chromium` | Browser engine (`chromium`, `firefox`, `webkit`) |
| `MAX_ACTIONS` | `50` | Maximum actions allowed before automatic abort |
| `TASK_TIMEOUT_MS` | `300000` | Maximum task duration (5 minutes) |
| `ACTION_TIMEOUT_MS`| `30000` | Timeout per tool action (30 seconds) |
| `LOG_LEVEL` | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`)|

---

## Running the CLI

### 1. Interactive Mode
```bash
npm run agent
```
Prompts:
```text
Enter task: Open https://example.com
```

### 2. Single-shot Command
```bash
npm run agent -- "Open https://example.com"
```

---

## Running Progressive Verification Tests

Run the complete test suite:
```bash
npm run test:all
```

Or run individual tests:
```bash
npm run test:1  # MCP server connection
npm run test:2  # Dynamic tool discovery (33 tools)
npm run test:3  # Browser launch and navigation
npm run test:4  # Multi-step navigation
npm run test:5  # Form interaction (input typing + submit click)
npm run test:6  # Dynamic observation-driven element click
```

---

## Phase 1 Definition of Done Checklist

- [x] Ollama is working locally (`http://localhost:11434`).
- [x] Local LLM can receive an instruction (`llama3.2:3b`).
- [x] MCP client can connect to Playwright MCP (`@executeautomation/playwright-mcp-server`).
- [x] Playwright MCP tools can be discovered dynamically (33 tools discovered).
- [x] Chromium can be launched via MCP.
- [x] Agent can navigate to a website via MCP.
- [x] Agent can observe the browser (visible text + interactive element detection).
- [x] Agent can identify appropriate browser actions without hard-coded coordinates/selectors.
- [x] Agent can execute actions sequentially through MCP.
- [x] Agent can receive the tool result and observation.
- [x] Agent stops when task completion is achieved.
- [x] Agent has maximum action protection (`MAX_ACTIONS`).
- [x] Agent has execution timeout protection (`TASK_TIMEOUT_MS`).
- [x] MCP failures and disconnects are handled cleanly.
- [x] LLM failures and invalid tools are handled gracefully without crashing.
- [x] Structured logs with timestamps and levels are available.
- [x] CLI can run tasks from natural language instructions.
- [x] Non-destructive navigation and form interactions verified (all 6 tests PASS).
- [x] No browser action is hard-coded specifically for the tasks.
