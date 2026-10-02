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
Official Playwright MCP Server (@playwright/mcp)
       ↓
   Playwright
       ↓
    Chromium
       ↓
 Target Website
```

The system strictly executes all browser actions via the **Model Context Protocol (MCP)** tool layer. No hardcoded Playwright scripts or direct Playwright imports are used in the agent runtime for task execution.

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
│   │   └── ollama.ts        # Ollama local inference & tool call normalization
│   ├── logging/
│   │   └── logger.ts        # Structured logger ([INFO], [ACTION], [OBSERVATION], etc.)
│   └── mcp/
│       ├── client.ts        # MCP Client wrapper (Stdio transport, tool execution, timeouts)
│       ├── manager.ts       # Tool coordination & lifecycle manager
│       └── tools.ts         # Dynamic tool conversion & token optimization
├── test/
│   ├── fixtures/
│   │   ├── interaction.html # Form interaction test fixture
│   │   └── observation-login.html # Observation-driven element discovery fixture
│   ├── run-all-tests.ts     # Complete test runner (Tests 1 through 7)
│   ├── test-1-mcp.ts        # Test 1: MCP connection
│   ├── test-2-discovery.ts  # Test 2: Dynamic tool discovery (25 official tools)
│   ├── test-3-launch.ts     # Test 3: Browser launch & navigation
│   ├── test-4-navigation.ts # Test 4: Observation-driven navigation
│   ├── test-5-interaction.ts# Test 5: Form interaction (input typing + submit click)
│   ├── test-6-observation.ts# Test 6: Observation-driven element discovery & click
│   ├── test-7-multi-step.ts # Test 7: Multi-step Observe-Decide-Act loop
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
| `MCP_SERVER_ARGS` | `["@playwright/mcp"]` | MCP launch arguments |
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
npm run test:2  # Dynamic tool discovery (25 official tools)
npm run test:3  # Browser launch and navigation
npm run test:4  # Multi-step navigation
npm run test:5  # Form interaction (input typing + submit click)
npm run test:6  # Dynamic observation-driven element click
npm run test:7  # Multi-step Observe-Decide-Act loop
```

---

## Phase 1 Definition of Done Checklist

- [x] Ollama is working locally (`http://localhost:11434`).
- [x] Local LLM can receive an instruction (`llama3.2:3b`).
- [x] MCP client connects to official Playwright MCP (`@playwright/mcp`).
- [x] Playwright MCP tools discovered dynamically (25 official tools discovered).
- [x] Chromium launched via official `@playwright/mcp`.
- [x] Agent navigates to a website via MCP (`browser_navigate`).
- [x] Agent observes the browser via MCP accessibility snapshot (`browser_snapshot`).
- [x] Agent identifies appropriate browser actions without hard-coded coordinates/selectors.
- [x] Agent executes actions sequentially through MCP (`browser_navigate`, `browser_type`, `browser_click`).
- [x] Agent receives tool results and page observations after each step.
- [x] Agent stops when task completion is declared.
- [x] Agent has maximum action protection (`MAX_ACTIONS`).
- [x] Agent has execution timeout protection (`TASK_TIMEOUT_MS`).
- [x] MCP failures and disconnects are handled cleanly.
- [x] LLM failures and invalid tools are handled gracefully without crashing.
- [x] Structured logs with timestamps and levels are available.
- [x] CLI runs tasks from natural language instructions in single-shot and interactive modes.
- [x] Non-destructive navigation and form interactions verified (all 7 tests PASS).
- [x] No browser action is hard-coded directly in the agent runtime.

---

# Phase 2: TNSKILL Instruction Parser

## Architecture Overview
```text
Raw TNSKILL Instruction
        ↓
 Section Extraction (Lesson, Scenario, Objective, Navigation, Verification)
        ↓
 Semantic Parsing (Ollama LLM + Deterministic Facts)
        ↓
 Structured Task (ParsedTask Schema)
        ↓
 Schema Validation (Completeness, Types, Ambiguity, Missing Fields)
        ↓
   Validated Task
```

Phase 2 runs 100% independently of the browser and MCP. It translates raw instructional text into machine-readable, schema-validated task models without hallucinating missing fields.

## Phase 2 CLI Usage

Parse any task file:
```bash
npm run parse-task -- .\tasks\create-hr-task.txt
npm run parse-task -- .\test\fixtures\tnskill-user-create.txt
```

Run parser test suite (10 tests):
```bash
npm run test:parser
```

## Phase 2 Definition of Done Checklist

- [x] TNSKILL sections extracted (Lesson, Scenario, Objective, Navigation, Verification).
- [x] Lesson separated from executable task information (`context.lesson`).
- [x] Scenario extracted (`context.scenario`, `department`).
- [x] Platform identified when provided (`ServiceNow`).
- [x] Role identified when provided (`administrator`).
- [x] Task objectives extracted into generic action records.
- [x] Entities and field values extracted with camelCase normalization.
- [x] Multiple entities supported independently (User 1 Bob & User 2 Jane).
- [x] Navigation instructions extracted into step arrays.
- [x] Verification requirements extracted (`record_exists`, identifiers, location).
- [x] Boolean fields normalized (`Enabled`/`Disabled` -> `true`/`false`).
- [x] Missing fields detected without hallucination.
- [x] Ambiguous tasks detected (`TASK REQUIRES CLARIFICATION`).
- [x] Parser output follows strict TypeScript schema (`ParsedTask`).
- [x] Schema validation implemented (`TaskValidator`).
- [x] Zero browser dependency (no Playwright, no Chromium, no MCP).
- [x] Works through existing `LLMProvider` abstraction.
- [x] Parser CLI works (`npm run parse-task`).
- [x] 10/10 Parser tests pass (`npm run test:parser`).
- [x] Phase 1 regression tests pass (`npm run test:all` - 7/7 passed).
- [x] `npm run build` succeeds (`tsc` 0 errors).

---

# Phase 3: Task Planner

## Architecture Overview
```text
Validated Task (ParsedTask)
        ↓
   Task Planner (TaskPlanner / SemanticPlanner / DeterministicPlanner)
        ↓
  Execution Plan (ExecutionPlan Schema)
        ↓
 Plan Validation (PlanValidator: coverage, exact data, DAG, no runtime selectors)
        ↓
 Ready for Phase 4 (EXECUTION STATUS: NOT STARTED)
```

Phase 3 is an offline planning layer completely decoupled from Playwright and MCP. It establishes what needs to happen, in what order, dependencies between steps, and expected states after each action.

## Phase 3 CLI Usage

Generate an execution plan from any task file:
```bash
npm run plan-task -- .\tasks\create-hr-task.txt
npm run plan-task -- .\test\fixtures\tnskill-user-create.txt
```

Run planner test suite (12 tests):
```bash
npm run test:planner
```

## Phase 3 Definition of Done Checklist

- [x] Validated Phase 2 tasks converted into structured execution plans.
- [x] Plans contain ordered steps with explicit logical progression.
- [x] Plans preserve task data exactly (zero case-modification or data mutation).
- [x] Plans preserve all required creation and verification actions.
- [x] Plans contain explicit verification steps with conditions and locations.
- [x] Step dependencies represented (`dependsOn`).
- [x] Dependency cycles detected and rejected.
- [x] Non-existent step dependencies detected and rejected.
- [x] Expected states represented on all executable steps (`expectedState`).
- [x] Browser-specific selectors (#id, .class, xpath) rejected by validator.
- [x] MCP tool names (`browser_click`, `browser_type`) excluded from plans.
- [x] Runtime element refs (`e1`, `e17`) excluded from plans.
- [x] Planner works 100% without Chromium or browser processes.
- [x] Planner works 100% without Playwright MCP.
- [x] Planner uses existing `LLMProvider` abstraction with deterministic fallback.
- [x] Planner output validated against `PlanValidator`.
- [x] Planner CLI works (`npm run plan-task`).
- [x] 12/12 Planner tests pass (`npm run test:planner`).
- [x] 10/10 Parser tests still pass (`npm run test:parser`).
- [x] 7/7 Phase 1 browser tests still pass (`npm run test:all`).
- [x] `npm run build` succeeds (`tsc` 0 errors).
