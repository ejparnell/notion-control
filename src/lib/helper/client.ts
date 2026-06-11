import {
  AGENT_ASSIGNEE_MAP,
  STATUS_MAP,
  PRIORITY_MAP,
  TAGS_MAP,
} from '@/lib/constants';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dateForValidation(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const match = dateOnlyPattern.exec(value);

  if (!match) {
    return value;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return value;
  }

  return date;
}

type FormatDateOptions = {
  variant?: 'compact' | 'long';
  fallback?: string;
};

export function formatDate(
  value: Date | null | undefined,
  { variant = 'compact', fallback }: FormatDateOptions = {},
) {
  if (!value) {
    return fallback ?? '';
  }

  return new Intl.DateTimeFormat('en', {
    month: variant === 'long' ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

type ConstantsMap = Record<
  string,
  {
    name: string;
    color: string;
  }
>;

type MapName<T extends ConstantsMap> = T[keyof T]['name'];
type MapColor<T extends ConstantsMap> = T[keyof T]['color'];

function createStyleLookup<T extends ConstantsMap>(map: T) {
  return Object.fromEntries(
    Object.values(map).map(item => [item.name, item.color])
  ) as Record<MapName<T>, MapColor<T>>;
}

function getStyle<T extends Record<string, string>>(
  lookup: T,
  value: string | null | undefined,
  fallback: string
) {
  if (!value) return fallback;

  return lookup[value as keyof T] ?? fallback;
}

const statusStyleLookup = createStyleLookup(STATUS_MAP);

export function getStatusStyle(status: string | null | undefined) {
  return getStyle(
    statusStyleLookup,
    status,
    'bg-slate-100 text-slate-500 ring-slate-200'
  );
}

const priorityStyleLookup = createStyleLookup(PRIORITY_MAP);

export function getPriorityStyle(priority: string | null | undefined) {
  return getStyle(
    priorityStyleLookup,
    priority,
    'bg-slate-100 text-slate-500 ring-slate-200'
  );
}

export type ColorMapValue = {
  readonly name: string;
  readonly color: string;
};

export function getColorByName(
  options: readonly ColorMapValue[],
  value: string | null | undefined,
  fallback = 'bg-slate-100 text-slate-700 border-slate-200'
) {
  if (!value) {
    return fallback;
  }

  return options.find(option => option.name === value)?.color ?? fallback;
}

export function getStatusColor(status: string | null | undefined) {
  return getColorByName(Object.values(STATUS_MAP), status);
}

export function getPriorityColor(priority: string | null | undefined) {
  return getColorByName(Object.values(PRIORITY_MAP), priority);
}

export function getTagColor(tag: string | null | undefined) {
  return getColorByName(Object.values(TAGS_MAP), tag);
}

export function getAgentAssigneeColor(assignee: string | null | undefined) {
  return getColorByName(Object.values(AGENT_ASSIGNEE_MAP), assignee);
}
