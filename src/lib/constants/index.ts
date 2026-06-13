export const STATUS_MAP = {
  BACKLOG: {
    name: 'Backlog',
    color: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  PLANNING: {
    name: 'Planning',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  QUEUED: {
    name: 'Queued',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  IN_PROGRESS: {
    name: 'In Progress',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  CANCELLED: {
    name: 'Cancelled',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  DONE: {
    name: 'Done',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
} as const;

export type StatusMap = keyof typeof STATUS_MAP;

export type StatusName =
  (typeof STATUS_MAP)[StatusMap]['name'];

export type StatusColor =
  (typeof STATUS_MAP)[StatusMap]['color'];

export const statusValues: StatusName[] = Object.values(STATUS_MAP).map(
  s => s.name
);

export const PRIORITY_MAP = {
  LOW: {
    name: 'Low',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  MEDIUM: {
    name: 'Medium',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  HIGH: {
    name: 'High',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
} as const;

export type PriorityMap = keyof typeof PRIORITY_MAP;

export type PriorityName =
  (typeof PRIORITY_MAP)[PriorityMap]['name'];

export type PriorityColor =
  (typeof PRIORITY_MAP)[PriorityMap]['color'];

export const priorityValues: PriorityName[] = Object.values(PRIORITY_MAP).map(
  p => p.name
);

export const TAGS_MAP = {
  WORK: {
    name: 'Work',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  CLIENT_WORK: {
    name: 'Client Work',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  PERSONAL: {
    name: 'Personal',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  CAREER_DEVELOPMENT: {
    name: 'Career Development',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  URGENT: {
    name: 'Urgent',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
  },
} as const;

export type TagMap = keyof typeof TAGS_MAP;

export type TagName =
  (typeof TAGS_MAP)[TagMap]['name'];

export type TagColor =
  (typeof TAGS_MAP)[TagMap]['color'];

export const tagValues: TagName[] = Object.values(TAGS_MAP).map(
  t => t.name
);

export const AGENT_ASSIGNEE_MAP = {
  PM: {
    name: 'PM',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  FRONTEND: {
    name: 'Frontend',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  BACKEND: {
    name: 'Backend',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  CODING: {
    name: 'Coding',
    color: 'bg-violet-100 text-violet-700 border-violet-200',
  },
} as const;

export type AgentAssigneeMap = keyof typeof AGENT_ASSIGNEE_MAP;

export type AgentAssigneeName =
  (typeof AGENT_ASSIGNEE_MAP)[AgentAssigneeMap]['name'];

export type AgentAssigneeColor =
  (typeof AGENT_ASSIGNEE_MAP)[AgentAssigneeMap]['color'];

export const agentAssigneeValues: AgentAssigneeName[] = Object.values(
  AGENT_ASSIGNEE_MAP,
).map(agent => agent.name);

export const NOTE_TARGET_TYPE_MAP = {
  PROJECT: {
    name: 'project',
  },
  TASK: {
    name: 'task',
  },
} as const;

export type NoteTargetTypeMap = keyof typeof NOTE_TARGET_TYPE_MAP;

export type NoteTargetType =
  (typeof NOTE_TARGET_TYPE_MAP)[NoteTargetTypeMap]['name'];

export const noteTargetTypeValues: NoteTargetType[] = Object.values(
  NOTE_TARGET_TYPE_MAP,
).map(t => t.name);
