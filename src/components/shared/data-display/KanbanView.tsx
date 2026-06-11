'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/helper/client';

const columnDropIdPrefix = 'kanban-column:';

export type KanbanColumn = {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  badgeClassName?: string;
  emptyMessage?: string;
};

export type KanbanMoveEvent<T extends { id: string }> = {
  item: T;
  fromColumnId: string;
  toColumnId: string;
  oldIndex: number;
  newIndex: number;
};

type KanbanRenderState = {
  isDragging: boolean;
  isOverlay: boolean;
};

type KanbanViewProps<T extends { id: string }> = {
  items: T[];
  columns: KanbanColumn[];
  getColumnId: (item: T) => string;
  renderCard: (item: T, state: KanbanRenderState) => ReactNode;
  getItemLabel: (item: T) => string;
  onMove?: (event: KanbanMoveEvent<T>) => void | Promise<void>;
  emptyMessage?: string;
  className?: string;
};

function getColumnDropId(columnId: string) {
  return `${columnDropIdPrefix}${columnId}`;
}

function getColumnIdFromDropId(id: UniqueIdentifier) {
  const value = String(id);

  if (!value.startsWith(columnDropIdPrefix)) {
    return null;
  }

  return value.slice(columnDropIdPrefix.length);
}

function insertAt<T>(items: T[], item: T, index: number) {
  return [...items.slice(0, index), item, ...items.slice(index)];
}

function getLastIndexInColumn<T extends { id: string }>(
  items: T[],
  columnId: string,
  getColumnId: (item: T) => string,
) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (getColumnId(items[index]) === columnId) {
      return index;
    }
  }

  return -1;
}

function KanbanColumnDropZone({
  children,
  column,
}: {
  children: ReactNode;
  column: KanbanColumn;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: getColumnDropId(column.id),
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex min-h-[420px] w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-sm backdrop-blur',
        'transition-all duration-200',
        isOver && 'border-primary/70 bg-primary-soft/70 shadow-glow',
      )}
    >
      {children}
    </section>
  );
}

function SortableKanbanCard<T extends { id: string }>({
  item,
  label,
  renderCard,
}: {
  item: T;
  label: string;
  renderCard: (item: T, state: KanbanRenderState) => ReactNode;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: item.id,
    data: { item },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      aria-label={label}
      className={cn(
        'rounded-xl outline-none transition-all',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDragging && 'opacity-40',
      )}
      {...attributes}
      {...listeners}
    >
      {renderCard(item, { isDragging, isOverlay: false })}
    </div>
  );
}

export default function KanbanView<T extends { id: string }>({
  items,
  columns,
  getColumnId,
  renderCard,
  getItemLabel,
  onMove,
  emptyMessage = 'No items found.',
  className,
}: KanbanViewProps<T>) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [columnOverrides, setColumnOverrides] = useState<Record<string, string>>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const dragOriginColumnId = useRef<string | null>(null);
  const dragOriginIndex = useRef<number>(-1);

  useEffect(() => {
    setOrderedItems(items);
    setColumnOverrides({});
  }, [items]);

  const itemById = useMemo(() => {
    return new Map(orderedItems.map(item => [item.id, item]));
  }, [orderedItems]);

  const columnIdSet = useMemo(() => {
    return new Set(columns.map(column => column.id));
  }, [columns]);

  const getCurrentColumnId = (item: T) => {
    return columnOverrides[item.id] ?? getColumnId(item);
  };

  const getColumnIdForIdentifier = (id: UniqueIdentifier) => {
    const columnId = getColumnIdFromDropId(id);

    if (columnId) {
      return columnId;
    }

    const item = itemById.get(String(id));

    if (!item) {
      return null;
    }

    return getCurrentColumnId(item);
  };

  const groupedItems = useMemo(() => {
    const groups = new Map<string, T[]>();

    columns.forEach(column => groups.set(column.id, []));

    orderedItems.forEach(item => {
      const columnId = getCurrentColumnId(item);
      const group = groups.get(columnId);

      if (group) {
        group.push(item);
      }
    });

    return groups;
  }, [columns, orderedItems, columnOverrides]);

  const activeItem = activeItemId ? itemById.get(activeItemId) ?? null : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function moveItemPreview(
    activeId: string,
    overId: UniqueIdentifier,
    toColumnId: string,
  ) {
    setColumnOverrides(current => ({
      ...current,
      [activeId]: toColumnId,
    }));

    setOrderedItems(current => {
      const activeIndex = current.findIndex(item => item.id === activeId);

      if (activeIndex === -1) {
        return current;
      }

      const active = current[activeIndex];
      const overItemIndex = current.findIndex(item => item.id === String(overId));

      if (overItemIndex !== -1) {
        return arrayMove(current, activeIndex, overItemIndex);
      }

      const withoutActive = current.filter(item => item.id !== activeId);

      const lastIndex = getLastIndexInColumn(withoutActive, toColumnId, item => {
        if (item.id === activeId) {
          return toColumnId;
        }

        return columnOverrides[item.id] ?? getColumnId(item);
      });

      return insertAt(withoutActive, active, lastIndex + 1);
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const item = itemById.get(String(event.active.id));

    if (!item) {
      return;
    }

    const fromColumnId = getCurrentColumnId(item);

    setActiveItemId(item.id);
    dragOriginColumnId.current = fromColumnId;
    dragOriginIndex.current =
      groupedItems.get(fromColumnId)?.findIndex(groupItem => groupItem.id === item.id) ??
      -1;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeItem = itemById.get(String(active.id));
    const toColumnId = getColumnIdForIdentifier(over.id);

    if (!activeItem || !toColumnId || !columnIdSet.has(toColumnId)) {
      return;
    }

    moveItemPreview(activeItem.id, over.id, toColumnId);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const item = itemById.get(String(active.id));

    setActiveItemId(null);

    if (!item || !over) {
      setColumnOverrides({});
      return;
    }

    const fromColumnId = dragOriginColumnId.current ?? getColumnId(item);
    const toColumnId = getColumnIdForIdentifier(over.id) ?? getCurrentColumnId(item);

    const destinationItems = orderedItems.filter(
      groupItem => getCurrentColumnId(groupItem) === toColumnId,
    );

    const newIndex = destinationItems.findIndex(groupItem => groupItem.id === item.id);
    const oldIndex = dragOriginIndex.current;

    dragOriginColumnId.current = null;
    dragOriginIndex.current = -1;

    if (fromColumnId === toColumnId && oldIndex === newIndex) {
      setColumnOverrides({});
      return;
    }

    try {
      await onMove?.({
        item,
        fromColumnId,
        toColumnId,
        oldIndex,
        newIndex,
      });
    } finally {
      setColumnOverrides({});
    }
  }

  function handleDragCancel() {
    setActiveItemId(null);
    setColumnOverrides({});
    dragOriginColumnId.current = null;
    dragOriginIndex.current = -1;
    setOrderedItems(items);
  }

  if (columns.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-surface/80 px-4 py-10 text-center text-sm text-muted shadow-sm backdrop-blur">
        {emptyMessage}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={cn('mt-4 text-foreground', className)}>
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4">
            {columns.map(column => {
              const columnItems = groupedItems.get(column.id) ?? [];

              return (
                <KanbanColumnDropZone key={column.id} column={column}>
                  <header className="sticky top-0 z-10 border-b border-border/70 bg-surface/95 px-3 py-3 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {column.icon && (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-soft text-primary">
                            {column.icon}
                          </span>
                        )}

                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-semibold text-foreground">
                            {column.title}
                          </h2>

                          {column.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                              {column.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={cn(
                          'inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-xs font-semibold',
                          column.badgeClassName ??
                            'border-primary/40 bg-primary-soft text-primary',
                        )}
                      >
                        {columnItems.length}
                      </span>
                    </div>
                  </header>

                  <SortableContext
                    items={columnItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-1 flex-col gap-2.5 p-3">
                      {columnItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-surface-soft/70 px-3 py-8 text-center text-sm text-muted-soft">
                          {column.emptyMessage ?? emptyMessage}
                        </div>
                      ) : (
                        columnItems.map(item => (
                          <SortableKanbanCard
                            key={item.id}
                            item={item}
                            label={getItemLabel(item)}
                            renderCard={renderCard}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </KanbanColumnDropZone>
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="w-[276px] rotate-1 opacity-95 shadow-glow-strong">
            {renderCard(activeItem, { isDragging: false, isOverlay: true })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}