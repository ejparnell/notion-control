import { notFound } from 'next/navigation';
import {
  fetchProjectContext,
  fetchTasksForProject,
} from '../_lib/projectActions';
import { fetchNotesAction } from '@/app/notes/_lib/noteActions';
import ProjectDetailClient, {
  type ProjectDetailClientProject,
} from '../_components/ProjectDetailClient';
import type { ProjectInterface } from '@/lib/types/project';
import type { TaskInterface } from '@/lib/types/task';
import type {
  ProjectClarifierNoteInfo,
  ProjectClarifierTaskContext,
} from '@/lib/types/project-clarifier';

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function dateForContext(value: Date | null | undefined) {
  return value?.toISOString();
}

function buildProjectContext(
  project: ProjectInterface,
): ProjectDetailClientProject {
  return {
    id: project.id,
    name: project.name,
    summary: project.summary,
    status: project.status,
    priority: project.priority,
    tags: project.tags ?? [],
    startDate: dateForContext(project.startDate),
    endDate: dateForContext(project.endDate),
    estTime: project.estTime,
    assignedTo: project.assignedTo,
  };
}

function buildTaskContext(
  tasks: TaskInterface[],
): ProjectClarifierTaskContext[] {
  return tasks.map((task) => ({
    id: task.id,
    name: task.name,
    description: task.description,
    status: task.status,
    priority: task.priority,
    tags: task.tags ?? [],
    dueDate: dateForContext(task.dueDate),
    completedOn: dateForContext(task.completedOn),
    estTime: task.estTime,
    assignedTo: task.assignedTo,
    acceptanceCriteria: task.acceptanceCriteria,
    testingCriteria: task.testingCriteria,
    implementationPlan: task.implementationPlan,
  }));
}

function buildTaskItems(
  tasks: TaskInterface[],
) {
  return tasks.map((task) => ({
    id: task.id,
    name: task.name,
    status: task.status,
  }));
}

function buildNoteInfo(note: { content: string; createdAt?: Date }): ProjectClarifierNoteInfo {
  return {
    content: note.content,
    createdAt: note.createdAt?.toISOString(),
  };
}

function buildProjectClarifierContext(
  project: ProjectInterface,
  tasks: TaskInterface[],
  notes: { content: string; createdAt?: Date }[],
): {
  project: ProjectDetailClientProject;
  tasks: ProjectClarifierTaskContext[];
  notes: ProjectClarifierNoteInfo[];
} {
  return {
    project: buildProjectContext(project),
    tasks: buildTaskContext(tasks),
    notes: notes.map(buildNoteInfo),
  };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await fetchProjectContext(id);
  const tasks = await fetchTasksForProject(id);

  if (!project) {
    notFound();
  }

  const notes = await fetchNotesAction('project', id);
  const clarifierContext = buildProjectClarifierContext(project, tasks, notes);

  return (
    <ProjectDetailClient
      initialProject={clarifierContext.project}
      taskItems={buildTaskItems(tasks)}
      taskContext={clarifierContext.tasks}
      noteInfo={clarifierContext.notes}
    />
  );
}
