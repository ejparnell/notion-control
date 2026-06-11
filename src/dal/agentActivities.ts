'use server';

import { connectToDatabase } from '@/lib/db/connection';
import { AgentActivityModel } from '@/lib/db/models/agentActivity';
import type { AgentActivityInterface } from '@/lib/types/agent-activity';
import type {
  AgentOrchestratorAssignmentAction,
  AgentOrchestratorSuggestedAction,
} from '@/lib/agents/orchestrator/types';

type AgentActivityRecord = Omit<AgentActivityInterface, 'id'> & {
  id?: string;
  _id?: { toString(): string };
};

const activityId = (activity: AgentActivityRecord) => {
  const id = activity.id ?? activity._id?.toString();

  if (!id) {
    throw new Error('Agent activity record is missing an id');
  }

  return id;
};

const serializeAgentActivity = (
  activity: AgentActivityRecord,
): AgentActivityInterface => {
  const proposedAssignments: AgentOrchestratorAssignmentAction[] =
    (activity.proposedAssignments ?? []).map(action => ({
      type: action.type,
      id: action.id,
      title: action.title,
      ...(action.description && { description: action.description }),
      assignments: action.assignments.map(assignment => ({
        targetType: assignment.targetType,
        targetId: assignment.targetId,
        targetName: assignment.targetName,
        ...(assignment.currentAssignedTo && {
          currentAssignedTo: assignment.currentAssignedTo,
        }),
        assignedTo: assignment.assignedTo,
      })),
    }));
  const proposedActions = Array.isArray(activity.proposedActions)
    ? activity.proposedActions as AgentOrchestratorSuggestedAction[]
    : proposedAssignments;

  return {
    id: activityId(activity),
    modelMode: activity.modelMode,
    promptPreview: activity.promptPreview,
    pmSummary: activity.pmSummary,
    specialistNotes: (activity.specialistNotes ?? []).map(note => ({
      agent: note.agent,
      title: note.title,
      content: note.content,
    })),
    proposedActions,
    proposedAssignments,
    createdAt: dateForClient(activity.createdAt),
  };
};

export const createAgentActivity = async (
  data: Omit<AgentActivityInterface, 'id' | 'createdAt'>,
): Promise<AgentActivityInterface> => {
  await connectToDatabase();

  const activity = new AgentActivityModel(data);
  await activity.save();

  return serializeAgentActivity(activity.toObject() as AgentActivityRecord);
};

export const getRecentAgentActivities = async (
  limit = 5,
): Promise<AgentActivityInterface[]> => {
  await connectToDatabase();

  const activities = await AgentActivityModel.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return activities.map(activity =>
    serializeAgentActivity(activity as AgentActivityRecord),
  );
};

function dateForClient(value: Date | string | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : value;
}
