import Link from 'next/link';
import { cn } from '@/lib/helper/client';

type ListViewItem = {
  id: string;
  name: string;
  status?: string;
};

type ListViewProps = {
  items: ListViewItem[];
  to: string;
  emptyMessage?: string;
};

function getStatusStyle(status?: string) {
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

    case 'Todo':
    default:
      return 'border-border bg-surface-soft text-muted';
  }
}

export default function ListView({
  items,
  to,
  emptyMessage = 'No items found.',
}: ListViewProps) {
  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-surface/80 px-4 py-10 text-center text-sm text-muted shadow-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface/80 text-foreground shadow-sm">
      {items.map((item) => {
        const status = item.status ?? 'Todo';

        return (
          <li key={item.id} className="border-b border-border/70 last:border-b-0">
            <Link
              href={`${to}/${item.id}`}
              className="group flex items-center justify-between gap-4 px-4 py-3 transition-all hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            >
              <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                {item.name}
              </p>

              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                  getStatusStyle(status),
                )}
              >
                {item.status ?? 'No status'}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}