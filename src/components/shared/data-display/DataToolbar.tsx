'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/helper/client';
import Button from '@/components/shared/actions/Button';

type ToolbarItem = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

type PrimaryAction = {
  label: string;
  onClick: () => void;
  menuLabel?: string;
  onMenuClick?: () => void;
};

type DataToolbarProps = {
  items: ToolbarItem[];
  primaryAction?: PrimaryAction;
  className?: string;
};

export function DataToolbar({
  items,
  primaryAction,
  className,
}: DataToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 px-4 py-3 text-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            aria-label={item.label}
            title={item.label}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-muted transition-all',
              'hover:border-primary/50 hover:bg-primary-soft hover:text-primary hover:shadow-glow',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              item.active &&
                'border-primary/60 bg-primary-soft text-primary shadow-glow',
              item.disabled &&
                'cursor-not-allowed opacity-40 hover:border-transparent hover:bg-transparent hover:text-muted hover:shadow-none',
            )}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {primaryAction && (
        <Button
          variant="primary"
          size="md"
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </Button>
      )}
    </div>
  );
}
