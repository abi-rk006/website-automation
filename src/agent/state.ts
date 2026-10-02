export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface ActionRecord {
  step: number;
  tool: string;
  args: Record<string, any>;
  result: string;
  isError: boolean;
  durationMs: number;
  timestamp: string;
}

export interface AgentState {
  status: ExecutionStatus;
  currentTask: string;
  currentUrl?: string;
  actionCount: number;
  startTime: number;
  endTime?: number;
  lastTool?: string;
  lastToolResult?: string;
  currentAction?: string;
  failureReason?: string;
  history: ActionRecord[];
}

export function createInitialState(task: string): AgentState {
  return {
    status: 'idle',
    currentTask: task,
    actionCount: 0,
    startTime: Date.now(),
    history: [],
  };
}
