import { Schema, deleteModel, model, models, type Model } from 'mongoose';
import { buildSchemaOptions } from './shared/baseSchema';
import type { TaskInterface } from '@/lib/types/task';
import {
  agentAssigneeValues,
  priorityValues,
  statusValues,
  tagValues,
} from '@/lib/constants';

const taskSchema = new Schema<TaskInterface>(
  {
    name: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: statusValues,
    },
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: priorityValues,
    },
    tags: [
      {
        type: String,
        enum: tagValues,
      },
    ],
    project: { type: String },
    completedOn: { type: Date },
    estTime: { type: Number },
    assignedTo: {
      type: String,
      enum: agentAssigneeValues,
    },
    acceptanceCriteria: [{ type: String }],
    testingCriteria: [{ type: String }],
    implementationPlan: [{ type: String }],
  },
  buildSchemaOptions('tasks'),
);

const existingTaskModel = models.Task as Model<TaskInterface> | undefined;

if (
  existingTaskModel &&
  (
    existingTaskModel.schema.path('tags')?.instance !== 'Array' ||
    !existingTaskModel.schema.path('assignedTo') ||
    !existingTaskModel.schema.path('description') ||
    existingTaskModel.schema.path('acceptanceCriteria')?.instance !== 'Array' ||
    existingTaskModel.schema.path('testingCriteria')?.instance !== 'Array' ||
    existingTaskModel.schema.path('implementationPlan')?.instance !== 'Array'
  )
) {
  // Next dev hot reloads can keep an older Mongoose model compiled in memory.
  deleteModel('Task');
}

export const TaskModel: Model<TaskInterface> =
  (models.Task as Model<TaskInterface> | undefined) ||
  model<TaskInterface>('Task', taskSchema);
