import { Schema, deleteModel, model, models, type Model } from 'mongoose';
import { buildSchemaOptions } from './shared/baseSchema';
import { ProjectInterface } from '@/lib/types/project';
import {
    agentAssigneeValues,
    statusValues,
    priorityValues,
    tagValues,
} from "@/lib/constants";

const projectSchema = new Schema<ProjectInterface>(
    {
        name: { type: String, required: true },
        summary: { type: String },
        status: {
            type: String,
            enum: statusValues,
            default: 'Planning'
        },
        priority: {
            type: String,
            enum: priorityValues
        },
        startDate: { type: Date },
        endDate: { type: Date },
        estTime: { type: Number },
        assignedTo: {
            type: String,
            enum: agentAssigneeValues,
        },
        tags: [{
            type: String,
            enum: tagValues
        }],
    },
    buildSchemaOptions('projects')
);

const existingProjectModel = models.Project as Model<ProjectInterface> | undefined;

if (
    existingProjectModel &&
    (
        existingProjectModel.schema.path('tags')?.instance !== 'Array' ||
        !existingProjectModel.schema.path('assignedTo')
    )
) {
    // Next dev hot reloads can keep an older Mongoose model compiled in memory.
    deleteModel('Project');
}

export const ProjectModel: Model<ProjectInterface> =
    (models.Project as Model<ProjectInterface> | undefined) || model<ProjectInterface>('Project', projectSchema);
