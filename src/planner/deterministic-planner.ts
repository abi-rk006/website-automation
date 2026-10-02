/**
 * Deterministic Task Planner for TNSKILL tasks.
 * Converts a validated ParsedTask into an ordered ExecutionPlan
 * with explicit dependencies, expected states, and verification definitions.
 */
import { ParsedTask, CreateAction } from '../parser/types.js';
import { ExecutionPlan, PlanStep } from './types.js';

export class DeterministicPlanner {
  plan(task: ParsedTask): ExecutionPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const steps: PlanStep[] = [];
    let stepNumber = 1;
    let lastStepId: string | null = null;

    // 1. Navigation Planning
    if (task.startNavigation && task.startNavigation.length > 0) {
      const nav = task.startNavigation;
      let navPath: string[];
      let hasFormOpening = false;

      // If the last step is "New" or "Create", separate list navigation from form opening
      if (nav.length > 1 && /^(new|create|add)$/i.test(nav[nav.length - 1])) {
        navPath = nav.slice(0, nav.length - 1);
        hasFormOpening = true;
      } else {
        navPath = nav;
      }

      const navStepId = `step-${stepNumber++}`;
      const navLocation = navPath.slice(1).join(' > ') || navPath.join(' > ');
      steps.push({
        id: navStepId,
        type: 'navigate',
        description: `Navigate to ${navLocation}`,
        action: {
          type: 'navigate',
          target: navPath,
        },
        expectedState: {
          pagePurpose: 'list_view',
          location: navPath[navPath.length - 1],
        },
      });
      lastStepId = navStepId;
    }

    // Map verification items by identifier for interleaved verification planning
    const verificationMap = new Map<string, { location?: string; type: string }>();
    if (task.verification) {
      for (const v of task.verification) {
        if (v.identifiers) {
          for (const id of v.identifiers) {
            verificationMap.set(id, { location: v.location, type: v.type });
          }
        }
      }
    }

    const handledVerifications = new Set<string>();

    // 2. Action Planning
    if (task.actions && task.actions.length > 0) {
      for (const action of task.actions) {
        if (action.type === 'create') {
          const createAction = action as CreateAction;
          const entityTitle = createAction.entity.charAt(0).toUpperCase() + createAction.entity.slice(1);
          const identifier =
            createAction.data.userId ||
            createAction.data.name ||
            createAction.data.title ||
            createAction.data.label ||
            entityTitle;

          // A. Open Form Step
          const openFormStepId = `step-${stepNumber++}`;
          steps.push({
            id: openFormStepId,
            type: 'open_create_form',
            description: `Open the New ${entityTitle} form`,
            dependsOn: lastStepId ? [lastStepId] : undefined,
            action: {
              type: 'open_create_form',
              entity: createAction.entity,
              semanticTarget: `New ${entityTitle} button`,
            },
            expectedState: {
              pagePurpose: 'create_form',
              form: createAction.entity,
            },
          });
          lastStepId = openFormStepId;

          // B. Create Record Step
          const createStepId = `step-${stepNumber++}`;
          steps.push({
            id: createStepId,
            type: 'create_record',
            description: `Create ${identifier}`,
            dependsOn: [openFormStepId],
            action: {
              type: 'create_record',
              entity: createAction.entity,
              data: { ...createAction.data },
              rawLabels: createAction.rawLabels ? { ...createAction.rawLabels } : undefined,
            },
            expectedState: {
              record: createAction.entity,
              identifier,
              operation: 'created_or_saved',
            },
          });
          lastStepId = createStepId;

          // C. Interleaved Verification Step (if specified for this identifier)
          if (verificationMap.has(identifier)) {
            const verInfo = verificationMap.get(identifier)!;
            const verStepId = `step-${stepNumber++}`;
            const locDesc = verInfo.location ? ` in ${verInfo.location}` : '';
            steps.push({
              id: verStepId,
              type: 'verify',
              description: `Verify ${identifier} exists${locDesc}`,
              dependsOn: [createStepId],
              action: {
                type: 'verify',
                entity: createAction.entity,
                target: identifier,
                condition: `Record exists${locDesc}`,
              },
              expectedState: {
                record: createAction.entity,
                identifier,
                location: verInfo.location,
                status: 'verified_in_list',
              },
              verification: {
                type: verInfo.type,
                entity: createAction.entity,
                identifier,
                location: verInfo.location,
                condition: `Record ${identifier} exists${locDesc}`,
              },
            });
            handledVerifications.add(identifier);
            lastStepId = verStepId;
          }
        }
      }
    }

    // 3. Any Remaining Verifications
    if (task.verification && task.verification.length > 0) {
      for (const v of task.verification) {
        if (v.identifiers) {
          for (const id of v.identifiers) {
            if (!handledVerifications.has(id)) {
              const verStepId = `step-${stepNumber++}`;
              const locDesc = v.location ? ` in ${v.location}` : '';
              steps.push({
                id: verStepId,
                type: 'verify',
                description: `Verify ${id} exists${locDesc}`,
                dependsOn: lastStepId ? [lastStepId] : undefined,
                action: {
                  type: 'verify',
                  entity: v.entity,
                  target: id,
                  condition: `Record exists${locDesc}`,
                },
                expectedState: {
                  record: v.entity,
                  identifier: id,
                  location: v.location,
                  status: 'verified_in_list',
                },
                verification: {
                  type: v.type,
                  entity: v.entity,
                  identifier: id,
                  location: v.location,
                  condition: `Record ${id} exists${locDesc}`,
                },
              });
              handledVerifications.add(id);
              lastStepId = verStepId;
            }
          }
        } else if (v.rawText) {
          const verStepId = `step-${stepNumber++}`;
          steps.push({
            id: verStepId,
            type: 'verify',
            description: v.rawText,
            dependsOn: lastStepId ? [lastStepId] : undefined,
            action: {
              type: 'verify',
              entity: v.entity,
              condition: v.rawText,
            },
            expectedState: {
              status: 'verified',
            },
            verification: {
              type: v.type,
              entity: v.entity,
              condition: v.rawText,
            },
          });
          lastStepId = verStepId;
        }
      }
    }

    return {
      planId,
      platform: task.platform,
      taskSummary: task.context?.scenario || task.actions?.map((a) => a.type).join(', '),
      steps,
      metadata: {
        generatedAt: new Date().toISOString(),
        plannerVersion: '3.0.0',
      },
    };
  }
}
