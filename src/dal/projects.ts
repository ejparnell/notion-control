'use server';

import { connectToDatabase } from "@/lib/db/connection";
import { ProjectInterface } from "@/lib/types/project";
import { ProjectModel } from "@/lib/db/models/project";
import { TaskModel } from "@/lib/db/models/task";

type ProjectRecord = Omit<ProjectInterface, 'id'> & {
    id?: string;
    _id?: { toString(): string };
};

const projectId = (project: ProjectRecord) => {
    const id = project.id ?? project._id?.toString();

    if (!id) {
        throw new Error('Project record is missing an id');
    }

    return id;
};

const serializeProject = (project: ProjectRecord): ProjectInterface => ({
    id: projectId(project),
    name: project.name,
    summary: project.summary,
    status: project.status,
    priority: project.priority,
    tags: project.tags ? [...project.tags] : undefined,
    startDate: project.startDate,
    endDate: project.endDate,
    estTime: project.estTime,
    assignedTo: project.assignedTo,
});

export const getAllProjects = async (): Promise<ProjectInterface[]> => {
    await connectToDatabase();
    const projects = await ProjectModel.find().lean();
    return projects.map((project) => serializeProject(project as ProjectRecord));
};

export const getProjectById = async (id: string): Promise<ProjectInterface | null> => {
    await connectToDatabase();
    const project = await ProjectModel.findById(id).lean();
    return project ? serializeProject(project as ProjectRecord) : null;
};

export const createProject = async (projectData: Omit<ProjectInterface, 'id'>): Promise<ProjectInterface> => {
    await connectToDatabase();
    const project = new ProjectModel(projectData);
    await project.save();
    return serializeProject(project.toObject() as ProjectRecord);
};

export const updateProject = async (id: string, updateData: Partial<Omit<ProjectInterface, 'id'>>): Promise<ProjectInterface | null> => {
    await connectToDatabase();
    const updatePayload = buildProjectUpdatePayload(updateData);
    const project = await ProjectModel.findByIdAndUpdate(id, updatePayload, {
        new: true,
        runValidators: true,
    }).lean();
    return project ? serializeProject(project as ProjectRecord) : null;
};

export const deleteProject = async (id: string): Promise<void> => {
    await connectToDatabase();
    const project = await ProjectModel.findByIdAndDelete(id);

    if (project) {
        await TaskModel.deleteMany({ project: id });
    }
};

function buildProjectUpdatePayload(
    updateData: Partial<Omit<ProjectInterface, 'id'>>
) {
    if (!Object.prototype.hasOwnProperty.call(updateData, 'assignedTo')) {
        return updateData;
    }

    if (updateData.assignedTo !== undefined) {
        return updateData;
    }

    const { assignedTo: _assignedTo, ...rest } = updateData;

    return {
        ...rest,
        $unset: {
            assignedTo: '',
        },
    };
}
