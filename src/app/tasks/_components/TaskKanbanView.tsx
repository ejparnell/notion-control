'use client';

import Link from 'next/link';
import KanbanView, {
  type KanbanColumn,
  type KanbanMoveEvent,
} from '@/components/shared/data-display/KanbanView';
import {
  PriorityPill,
  StatusPill,
} from '@/components/shared/data-display/TableCells';
import { STATUS_MAP, statusValues, type StatusName } from '@/lib/constants';
import { cn, formatDate } from '@/lib/helper/client';
import type { ProjectInterface } from '@/lib/types/project';
import type { TaskInterface } from '@/lib/types/task';

type TaskKanbanMove = {
  taskId: string;
  fromStatus: StatusName;
  toStatus: StatusName;
};

type TaskKanbanViewProps = {
  tasks: TaskInterface[];
  projects: ProjectInterface[];
  onMoveStatus: (move: TaskKanbanMove) => void | Promise<void>;
};

const statusSet = new Set<string>(statusValues);

const columns: KanbanColumn[] = statusValues.map(status => ({
  id: status,
  title: status,
  badgeClassName: getStatusBadgeStyle(status),
  emptyMessage: 'Drop tasks here.',
}));

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'Done':
      return 'border-success/40 bg-success-soft text-success';

    case 'In Progress':
      return 'border-primary/40 bg-primary-soft text-primary';

    case 'Queued':
      return 'border-accent/40 bg-accent-soft text-accent';

    case 'Backlog':
    case 'Planning':
      return 'border-warning/40 bg-warning-soft text-warning';

    case 'Blocked':
    case 'Cancelled':
      return 'border-danger/40 bg-danger-soft text-danger';

    default:
      return 'border-border bg-surface-soft text-muted';
  }
}

function getTagBadgeStyle(tag: string) {
  const normalizedTag = tag.toLowerCase();

  if (
    normalizedTag.includes('client') ||
    normalizedTag.includes('ai') ||
    normalizedTag.includes('agent') ||
    normalizedTag.includes('automation')
  ) {
    return 'border-secondary/40 bg-secondary-soft text-secondary';
  }

  if (
    normalizedTag.includes('work') ||
    normalizedTag.includes('frontend') ||
    normalizedTag.includes('ui') ||
    normalizedTag.includes('design')
  ) {
    return 'border-primary/40 bg-primary-soft text-primary';
  }

  if (
    normalizedTag.includes('personal') ||
    normalizedTag.includes('backend') ||
    normalizedTag.includes('api') ||
    normalizedTag.includes('data')
  ) {
    return 'border-accent/40 bg-accent-soft text-accent';
  }

  if (normalizedTag.includes('urgent')) {
    return 'border-danger/40 bg-danger-soft text-danger';
  }

  return 'border-border bg-surface-soft text-muted';
}

function getTaskStatus(task: TaskInterface) {
  return task.status ?? STATUS_MAP.BACKLOG.name;
}

function isStatusName(value: string): value is StatusName {
  return statusSet.has(value);
}

function TaskKanbanCard({
  task,
  projectName,
  isOverlay,
}: {
  task: TaskInterface;
  projectName?: string;
  isOverlay: boolean;
}) {
  return (
    <article
      className={cn(
        'rounded-lg border border-border bg-surface p-3 text-sm text-foreground shadow-sm transition',
        'hover:border-primary/50 hover:bg-surface-soft hover:shadow-glow',
        isOverlay && 'border-primary shadow-glow',
      )}
    >
      <Link
        href={`/tasks/${task.id}`}
        className="block truncate font-semibold text-foreground transition-colors hover:text-primary"
      >
        {task.name}
      </Link>

      {projectName && (
        <p className="mt-1 truncate text-xs text-muted">
          {projectName}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusPill value={task.status ?? null} />
        <PriorityPill value={task.priority ?? null} />
      </div>

      {(task.dueDate || task.completedOn || task.estTime != null) && (
        <div className="mt-3 grid gap-1.5 text-xs text-muted-soft">
          {task.dueDate && (
            <span>Due {formatDate(task.dueDate)}</span>
          )}
          {task.completedOn && (
            <span>Completed {formatDate(task.completedOn)}</span>
          )}
          {task.estTime != null && (
            <span>{task.estTime}m estimated</span>
          )}
        </div>
      )}

      {task.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.tags.map(tag => (
            <span
              key={tag}
              className={cn(
                'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
                getTagBadgeStyle(tag),
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function TaskKanbanView({
  tasks,
  projects,
  onMoveStatus,
}: TaskKanbanViewProps) {
  const projectNameById = new Map(
    projects.map(project => [project.id, project.name]),
  );

  async function handleMove(event: KanbanMoveEvent<TaskInterface>) {
    if (event.fromColumnId === event.toColumnId) {
      return;
    }

    if (!isStatusName(event.fromColumnId) || !isStatusName(event.toColumnId)) {
      return;
    }

    await onMoveStatus({
      taskId: event.item.id,
      fromStatus: event.fromColumnId,
      toStatus: event.toColumnId,
    });
  }

  return (
    <KanbanView
      items={tasks}
      columns={columns}
      getColumnId={getTaskStatus}
      getItemLabel={task => task.name}
      emptyMessage="No tasks."
      onMove={handleMove}
      renderCard={(task, state) => (
        <TaskKanbanCard
          task={task}
          projectName={task.project ? projectNameById.get(task.project) : undefined}
          isOverlay={state.isOverlay}
        />
      )}
    />
  );
}
