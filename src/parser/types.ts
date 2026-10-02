/**
 * Core Type Definitions for Phase 2: TNSKILL Instruction Parser
 */

export type ActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'configure'
  | 'navigate'
  | 'search'
  | 'assign'
  | 'enable'
  | 'disable'
  | 'verify'
  | 'custom';

export interface BaseAction {
  type: ActionType;
  description?: string;
}

export interface CreateAction extends BaseAction {
  type: 'create';
  entity: string;
  data: Record<string, any>;
  quantity?: number;
  rawLabels?: Record<string, string>;
}

export interface UpdateAction extends BaseAction {
  type: 'update';
  entity: string;
  targetIdentifier: string;
  data: Record<string, any>;
  rawLabels?: Record<string, string>;
}

export interface DeleteAction extends BaseAction {
  type: 'delete';
  entity: string;
  targetIdentifier: string;
}

export interface NavigateAction extends BaseAction {
  type: 'navigate';
  path: string[];
}

export interface SearchAction extends BaseAction {
  type: 'search';
  query: string;
  target?: string;
}

export interface ConfigureAction extends BaseAction {
  type: 'configure';
  target: string;
  settings: Record<string, any>;
}

export interface AssignAction extends BaseAction {
  type: 'assign';
  entity: string;
  assignee: string;
  role?: string;
}

export interface ToggleAction extends BaseAction {
  type: 'enable' | 'disable';
  target: string;
}

export interface VerifyAction extends BaseAction {
  type: 'verify';
  requirement: VerificationRequirement;
}

export interface CustomAction extends BaseAction {
  type: 'custom';
  action: string;
  parameters: Record<string, any>;
}

export type TaskAction =
  | CreateAction
  | UpdateAction
  | DeleteAction
  | NavigateAction
  | SearchAction
  | ConfigureAction
  | AssignAction
  | ToggleAction
  | VerifyAction
  | CustomAction;

export type VerificationType =
  | 'record_exists'
  | 'field_value'
  | 'status_equals'
  | 'element_visible'
  | 'custom';

export interface VerificationRequirement {
  type: VerificationType;
  entity?: string;
  identifiers?: string[];
  location?: string;
  condition?: string;
  expected?: any;
  rawText?: string;
}

export interface ExtractedSections {
  lesson?: string;
  scenario?: string;
  taskObjective?: string;
  navigation?: string;
  verification?: string;
  rawText: string;
}

export interface ParsedTask {
  platform?: string;
  role?: string;
  context?: {
    lesson?: string;
    scenario?: string;
    department?: string;
    businessContext?: string;
  };
  startNavigation?: string[];
  actions: TaskAction[];
  verification: VerificationRequirement[];
  metadata?: {
    source?: string;
    parserVersion?: string;
    timestamp?: string;
    rawSections?: ExtractedSections;
  };
}

export interface MissingFieldDetail {
  entity?: string;
  field: string;
  status: 'missing' | 'ambiguous';
  reason?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  requiresClarification: boolean;
  missingFields: MissingFieldDetail[];
  summary: string;
}
