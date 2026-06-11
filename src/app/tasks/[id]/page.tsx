import { notFound } from 'next/navigation';
import { fetchProjects } from '@/app/projects/_lib/projectActions';
import {
  fetchRelatedTasksForTask,
  fetchTaskContext,
} from '../_lib/taskActions';
import TaskDetailClient, {
  type TaskDetailClientProject,
  type TaskDetailClientTask,
} from '../_components/TaskDetailClient';
import type { ProjectInterface } from '@/lib/types/project';
import type { TaskInterface } from '@/lib/types/task';
import type { TaskClarifierTaskContext } from '@/lib/types/task-clarifier';

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function dateForContext(value: Date | null | undefined) {
  return value?.toISOString();
}

function buildTaskContext(
  task: TaskInterface,
): TaskDetailClientTask {
  return {
    id: task.id,
    name: task.name,
    status: task.status,
    dueDate: dateForContext(task.dueDate),
    priority: task.priority,
    tags: task.tags ?? [],
    project: task.project,
    completedOn: dateForContext(task.completedOn),
    estTime: task.estTime,
    assignedTo: task.assignedTo,
    description: task.description,
    acceptanceCriteria: task.acceptanceCriteria,
    testingCriteria: task.testingCriteria,
    implementationPlan: task.implementationPlan,
  };
}

function buildProjectContext(
  project: ProjectInterface,
): TaskDetailClientProject {
  return {
    id: project.id,
    name: project.name,
    summary: project.summary,
    status: project.status,
    priority: project.priority,
    tags: project.tags ?? [],
    estTime: project.estTime,
    assignedTo: project.assignedTo,
  };
}

function buildRelatedTaskContext(
  tasks: TaskInterface[],
): TaskClarifierTaskContext[] {
  return tasks.map(task => ({
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

function buildTaskItems(tasks: TaskInterface[]) {
  return tasks.map(task => ({
    id: task.id,
    name: task.name,
    status: task.status,
  }));
}

export default async function TaskDetailPage({
  params,
}: TaskDetailPageProps) {
  const { id } = await params;
  const task = await fetchTaskContext(id);

  if (!task) {
    notFound();
  }

  const [projects, relatedTasks] = await Promise.all([
    fetchProjects(),
    fetchRelatedTasksForTask(task),
  ]);
  const project = task.project
    ? projects.find(projectItem => projectItem.id === task.project)
    : undefined;

  return (
    <TaskDetailClient
      initialTask={buildTaskContext(task)}
      projects={projects}
      project={project ? buildProjectContext(project) : undefined}
      relatedTaskItems={buildTaskItems(relatedTasks)}
      relatedTaskContext={buildRelatedTaskContext(relatedTasks)}
    />
  );
}
