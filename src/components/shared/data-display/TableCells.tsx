import Link from 'next/link';
import { cn } from '@/lib/helper/client';

function getStatusStyle(value: string) {
  switch (value) {
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

    case 'Todo':
    case 'No status':
    default:
      return 'border-border bg-surface-soft text-muted';
  }
}

function getPriorityStyle(value: string) {
  switch (value) {
    case 'High':
      return 'border-danger/40 bg-danger-soft text-danger';

    case 'Medium':
      return 'border-warning/40 bg-warning-soft text-warning';

    case 'Low':
      return 'border-success/40 bg-success-soft text-success';

    default:
      return 'border-border bg-surface-soft text-muted';
  }
}

function getAgentAssigneeStyle(value: string) {
  const normalizedValue = value.toLowerCase();

  if (
    normalizedValue.includes('ai') ||
    normalizedValue.includes('agent') ||
    normalizedValue.includes('automation')
  ) {
    return 'border-secondary/40 bg-secondary-soft text-secondary';
  }

  if (
    normalizedValue.includes('frontend') ||
    normalizedValue.includes('design') ||
    normalizedValue.includes('ui')
  ) {
    return 'border-primary/40 bg-primary-soft text-primary';
  }

  if (
    normalizedValue.includes('backend') ||
    normalizedValue.includes('api') ||
    normalizedValue.includes('data')
  ) {
    return 'border-accent/40 bg-accent-soft text-accent';
  }

  return 'border-border bg-surface-soft text-muted';
}

export function PageTitleCell({
  name,
  id,
  hrefBase = '/projects',
}: {
  name: string;
  id: string;
  hrefBase?: string;
}) {
  return (
    <Link
      href={`${hrefBase}/${id}`}
      className="group inline-flex min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
          {name}
        </span>
      </div>
    </Link>
  );
}

export function StatusPill({ value }: { value: string | null }) {
  const label = value ?? 'No status';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        getStatusStyle(label),
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

export function PriorityPill({ value }: { value: string | null }) {
  if (!value) return <EmptyCell />;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        getPriorityStyle(value),
      )}
    >
      {value}
    </span>
  );
}

export function AgentAssigneePill({ value }: { value: string | null }) {
  if (!value) return <EmptyCell />;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        getAgentAssigneeStyle(value),
      )}
    >
      {value}
    </span>
  );
}

export function EmptyCell() {
  return <span className="text-muted-soft">—</span>;
}