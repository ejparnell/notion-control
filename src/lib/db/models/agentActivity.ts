import { Schema, model, models, type Model } from 'mongoose';
import { buildSchemaOptions } from './shared/baseSchema';
import type { AgentActivityInterface } from '@/lib/types/agent-activity';

const agentActivitySchema = new Schema<AgentActivityInterface>(
  {
    modelMode: { type: String, required: true },
    promptPreview: { type: String, required: true },
    pmSummary: { type: String, required: true },
    specialistNotes: [
      {
        agent: { type: String, required: true },
        title: { type: String, required: true },
        content: { type: String, required: true },
      },
    ],
    proposedActions: [{ type: Schema.Types.Mixed }],
    proposedAssignments: [
      {
        type: { type: String, required: true },
        id: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String },
        assignments: [
          {
            targetType: { type: String, required: true },
            targetId: { type: String, required: true },
            targetName: { type: String, required: true },
            currentAssignedTo: { type: String },
            assignedTo: { type: String, required: true },
          },
        ],
      },
    ],
  },
  buildSchemaOptions('agent_activities'),
);

export const AgentActivityModel: Model<AgentActivityInterface> =
  (models.AgentActivity as Model<AgentActivityInterface> | undefined) ||
  model<AgentActivityInterface>('AgentActivity', agentActivitySchema);
