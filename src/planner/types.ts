/**
 * Type Definitions for Phase 3: Task Planner
 */

export type PlanStepType =
  | 'navigate'
  | 'open_create_form'
  | 'create_record'
  | 'update_record'
  | 'delete_record'
  | 'configure'
  | 'search'
  | 'verify'
  | 'custom';

export interface ExpectedState {
  pagePurpose?: string;
  form?: string;
  record?: string;
  identifier?: string;
  operation?: string;
  location?: string;
  status?: string;
  details?: Record<string, any>;
}

export interface VerificationDefinition {
  type: string;
  entity?: string;
  identifier?: string;
  location?: string;
  condition?: string;
  expected?: any;
}

export interface PlanAction {
  type: string;
  entity?: string;
  target?: string | string[];
  semanticTarget?: string;
  data?: Record<string, any>;
  rawLabels?: Record<string, string>;
  condition?: string;
  parameters?: Record<string, any>;
}

export interface PlanStep {
  id: string;
  type: PlanStepType;
  description: string;
  dependsOn?: string[];
  action?: PlanAction;
  expectedState?: ExpectedState;
  verification?: VerificationDefinition;
}

export interface ExecutionPlan {
  planId: string;
  platform?: string;
  taskSummary?: string;
  steps: PlanStep[];
  metadata?: {
    generatedAt: string;
    plannerVersion: string;
    sourceTaskId?: string;
  };
}

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: string;
}
