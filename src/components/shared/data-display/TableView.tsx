import type { ReactNode } from 'react';
import { cn } from '@/lib/helper/client';

export type TableColumn<T> = {
  id: string;
  header: string;
  icon?: ReactNode;
  width?: number;
  align?: 'left' | 'right' | 'center';
  render: (item: T) => ReactNode;
};

type TableViewProps<T extends { id: string }> = {
  items: T[];
  columns: TableColumn<T>[];
  emptyMessage?: string;
};

export default function TableView<T extends { id: string }>({
  items,
  columns,
  emptyMessage = 'No items found.',
}: TableViewProps<T>) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface/80 text-foreground shadow-sm backdrop-blur">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-surface-soft/80 text-left text-xs font-medium text-muted">
              {columns.map((column) => (
                <th
                  key={column.id}
                  style={{ width: column.width, minWidth: column.width }}
                  className="border-b border-r border-border/70 px-3 py-2.5 font-medium last:border-r-0"
                >
                  <div
                    className={cn(
                      'flex items-center gap-2',
                      column.align === 'right' && 'justify-end',
                      column.align === 'center' && 'justify-center',
                    )}
                  >
                    {column.icon && (
                      <span className="text-muted-soft">
                        {column.icon}
                      </span>
                    )}

                    <span className="truncate">{column.header}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-10 text-center text-sm text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="group bg-surface/40 transition-colors hover:bg-primary-soft/40"
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      style={{ width: column.width, minWidth: column.width }}
                      className={cn(
                        'h-11 border-b border-r border-border/60 px-3 py-1.5 align-middle text-foreground last:border-r-0 group-last:border-b-0',
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center',
                      )}
                    >
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
