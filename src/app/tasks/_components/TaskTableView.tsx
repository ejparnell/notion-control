import TableView, {
  type TableColumn,
} from '@/components/shared/data-display/TableView';
import {
  EmptyCell,
  AgentAssigneePill,
  PageTitleCell,
  PriorityPill,
  StatusPill,
} from '@/components/shared/data-display/TableCells';
import {
  ClockIcon,
  DateIcon,
  SelectIcon,
  StatusIcon,
  TextIcon,
} from '@/components/svg';
import { cn, formatDate } from '@/lib/helper/client';
import type { ProjectInterface } from '@/lib/types/project';
import type { TaskInterface } from '@/lib/types/task';

type TaskTableViewProps = {
  tasks: TaskInterface[];
  projects: ProjectInterface[];
};

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

export default function TaskTableView({
  tasks,
  projects,
}: TaskTableViewProps) {
  const projectNameById = new Map(
    projects.map(project => [project.id, project.name]),
  );

  const columns: TableColumn<TaskInterface>[] = [
    {
      id: 'name',
      header: 'Task name',
      icon: <TextIcon />,
      width: 320,
      render: task => (
        <PageTitleCell name={task.name} id={task.id} hrefBase="/tasks" />
      ),
    },
    {
      id: 'project',
      header: 'Project',
      icon: <TextIcon />,
      width: 220,
      render: task =>
        task.project ? (
          <span className="text-foreground">
            {projectNameById.get(task.project) ?? task.project}
          </span>
        ) : (
          <EmptyCell />
        ),
    },
    {
      id: 'status',
      header: 'Status',
      icon: <StatusIcon />,
      width: 150,
      render: task => <StatusPill value={task.status ?? null} />,
    },
    {
      id: 'priority',
      header: 'Priority',
      icon: <SelectIcon />,
      width: 150,
      render: task => <PriorityPill value={task.priority ?? null} />,
    },
    {
      id: 'dueDate',
      header: 'Due date',
      icon: <DateIcon />,
      width: 150,
      render: task =>
        task.dueDate ? (
          <span className="text-foreground">{formatDate(task.dueDate)}</span>
        ) : (
          <EmptyCell />
        ),
    },
    {
      id: 'completedOn',
      header: 'Completed on',
      icon: <DateIcon />,
      width: 150,
      render: task =>
        task.completedOn ? (
          <span className="text-foreground">
            {formatDate(task.completedOn)}
          </span>
        ) : (
          <EmptyCell />
        ),
    },
    {
      id: 'estTime',
      header: 'Est. time',
      icon: <ClockIcon />,
      width: 120,
      render: task =>
        task.estTime != null ? (
          <span className="text-foreground">{task.estTime}m</span>
        ) : (
          <EmptyCell />
        ),
    },
    {
      id: 'assignedTo',
      header: 'Assigned to',
      icon: <SelectIcon />,
      width: 150,
      render: task => <AgentAssigneePill value={task.assignedTo ?? null} />,
    },
    {
      id: 'tags',
      header: 'Tags',
      icon: <SelectIcon />,
      width: 180,
      render: task =>
        task.tags?.length ? (
          <div className="flex flex-wrap gap-1.5">
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
        ) : (
          <EmptyCell />
        ),
    },
  ];

  return <TableView items={tasks} columns={columns} />;
}
