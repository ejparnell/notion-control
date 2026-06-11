'use client';

import { cn } from '@/lib/helper/client';
import { DataLayout, layoutOptions } from '@/lib/helper/data-display';

type DataToolbarSettingsMenuProps = {
  selectedLayout: DataLayout;
  onLayoutChange: (layout: DataLayout) => void;
};

export function DataToolbarSettingsMenu({
  selectedLayout,
  onLayoutChange,
}: DataToolbarSettingsMenuProps) {
  return (
    <div className="absolute right-0 top-11 z-50 w-[320px] rounded-2xl border border-border bg-surface p-4 text-foreground shadow-glow">
      <div className="grid grid-cols-3 gap-2">
        {layoutOptions.map((option) => {
          const isSelected = selectedLayout === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onLayoutChange(option.id)}
              className={cn(
                'flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isSelected
                  ? 'border-primary bg-primary-soft text-primary shadow-glow'
                  : 'border-border bg-surface-soft text-muted hover:border-primary/60 hover:bg-primary-soft hover:text-primary hover:shadow-glow',
              )}
            >
              <span className="text-current">{option.icon}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
