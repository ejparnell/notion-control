import { type NextRequest, NextResponse } from 'next/server';

import { runProjectClarifierChat } from '@/lib/agents/project-clarifier';
import {
  parseSelectedLocalMemorySourcePaths,
} from '@/lib/agents/rag/local-memory-sources';
import { LocalMemorySourceError } from '@/lib/agents/rag/source-document';
import { isRetrievalConfigurationError } from '@/lib/agents/rag/vector/retrieval';
import { updateProjectSchema } from '@/lib/validations/projects';
import { createTaskSchema } from '@/lib/validations/tasks';
import {
  agentAssigneeValues,
  type AgentAssigneeName,
} from '@/lib/constants';
import type {
  ProjectClarifierContext,
  ProjectClarifierMessage,
  ProjectClarifierProjectContext,
  ProjectClarifierProjectUpdateAction,
  ProjectClarifierProjectUpdateField,
  ProjectClarifierProjectUpdatePatch,
  ProjectClarifierSuggestedAction,
  ProjectClarifierSuggestedActionChange,
  ProjectClarifierTaskCreateAction,
  ProjectClarifierTaskCreateDraft,
  ProjectClarifierTaskContext,
} from '@/lib/types/project-clarifier';

export const runtime = 'nodejs';

type ParsedContextResult =
  | { ok: true; context: ProjectClarifierContext }
  | { ok: false; error: string };

type ParsedMessagesResult =
  | { ok: true; messages: ProjectClarifierMessage[] }
  | { ok: false; error: string };

const projectUpdateFields: ProjectClarifierProjectUpdateField[] = [
  'name',
  'summary',
  'status',
  'priority',
  'tags',
  'startDate',
  'endDate',
  'estTime',
];

const projectUpdateFieldLabels: Record<ProjectClarifierProjectUpdateField, string> = {
  name: 'Name',
  summary: 'Summary',
  status: 'Status',
  priority: 'Priority',
  tags: 'Tags',
  startDate: 'Start date',
  endDate: 'End date',
  estTime: 'Est. time',
};

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  let body: {
    messages?: unknown;
    context?: unknown;
    plannerAgent?: unknown;
    selectedSourcePaths?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  const parsedMessages = parseMessages(body.messages);

  if (!parsedMessages.ok) {
    return NextResponse.json(
      { error: parsedMessages.error },
      { status: 400 },
    );
  }

  const parsedContext = parseContext(body.context);

  if (!parsedContext.ok) {
    return NextResponse.json(
      { error: parsedContext.error },
      { status: 400 },
    );
  }

  const plannerAgent = parsePlannerAgent(body.plannerAgent);

  if (plannerAgent === null) {
    return NextResponse.json(
      { error: 'plannerAgent must be PM, Frontend, Backend, or Coding.' },
      { status: 400 },
    );
  }

  try {
    const selectedSourcePaths = await parseSelectedLocalMemorySourcePaths(
      body.selectedSourcePaths,
    );
    const result = await runProjectClarifierChat({
      messages: parsedMessages.messages,
      context: parsedContext.context,
      ...(plannerAgent && { plannerAgent }),
      ...(selectedSourcePaths.length > 0 && { selectedSourcePaths }),
    });

    return NextResponse.json({
      message: sanitizeAssistantMessage(result.message, parsedContext.context),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('DEEPSEEK_API_KEY')) {
      return NextResponse.json(
        { error: 'Server configuration error: DeepSeek API key is not set.' },
        { status: 500 },
      );
    }

    if (err instanceof LocalMemorySourceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.code === 'not_found' ? 404 : 400 },
      );
    }

    if (isRetrievalConfigurationError(err)) {
      return NextResponse.json(
        { error: message },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: `Upstream error: ${message}` },
      { status: 502 },
    );
  }
}

function parseMessages(value: unknown): ParsedMessagesResult {
  if (!Array.isArray(value) || value.length === 0) {
    return {
      ok: false,
      error: 'Request must include at least one message.',
    };
  }

  const hasSystemMessage = value.some(
    (message) => isRecord(message) && message.role === 'system',
  );

  if (hasSystemMessage) {
    return {
      ok: false,
      error: 'Client-supplied system messages are not allowed.',
    };
  }

  const messages: ProjectClarifierMessage[] = [];

  for (const message of value) {
    if (!isRecord(message)) {
      return {
        ok: false,
        error: 'Messages must be objects with role and content fields.',
      };
    }

    if (message.role !== 'user' && message.role !== 'assistant') {
      return {
        ok: false,
        error: 'Messages may only use user or assistant roles.',
      };
    }

    if (typeof message.content !== 'string') {
      return {
        ok: false,
        error: 'Messages must include string content.',
      };
    }

    const content = message.content.trim();

    if (message.role === 'user' && content.length === 0) {
      return {
        ok: false,
        error: 'User messages must not be empty.',
      };
    }

    messages.push({
      role: message.role,
      content,
    });
  }

  if (!messages.some((message) => message.role === 'user' && message.content.length > 0)) {
    return {
      ok: false,
      error: 'Request must include at least one non-empty user message.',
    };
  }

  return { ok: true, messages };
}

function sanitizeAssistantMessage(
  message: ProjectClarifierMessage,
  context: ProjectClarifierContext,
): ProjectClarifierMessage {
  const suggestedActions = parseSuggestedActions(
    message.suggestedActions,
    context,
  );

  return {
    role: message.role,
    content: message.content,
    ...(suggestedActions.length > 0 && { suggestedActions }),
  };
}

function parseSuggestedActions(
  value: unknown,
  context: ProjectClarifierContext,
): ProjectClarifierSuggestedAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const actions: ProjectClarifierSuggestedAction[] = [];

  for (const item of value) {
    const action =
      parseProjectUpdateAction(item, context) ??
      parseTaskCreateAction(item);

    if (action) {
      actions.push(action);
    }
  }

  return actions;
}

function parseProjectUpdateAction(
  value: unknown,
  context: ProjectClarifierContext,
): ProjectClarifierProjectUpdateAction | null {
  if (!isRecord(value) || value.type !== 'project-update') {
    return null;
  }

  const rawPatch = parseProjectUpdatePatch(value.patch);

  if (!rawPatch || !updateProjectSchema.safeParse(rawPatch).success) {
    return null;
  }

  const effectiveUpdate = buildEffectiveProjectUpdate(
    rawPatch,
    context.project,
  );

  if (
    !effectiveUpdate ||
    !updateProjectSchema.safeParse(effectiveUpdate.patch).success
  ) {
    return null;
  }

  const description = optionalNonEmptyString(value.description);

  return {
    type: 'project-update',
    id: `project-update-${crypto.randomUUID()}`,
    title: optionalNonEmptyString(value.title) ?? 'Update project',
    ...(description && { description }),
    patch: effectiveUpdate.patch,
    changes: effectiveUpdate.changes,
  };
}

function parseTaskCreateAction(
  value: unknown,
): ProjectClarifierTaskCreateAction | null {
  if (!isRecord(value) || value.type !== 'task-create') {
    return null;
  }

  if (!Array.isArray(value.tasks) || value.tasks.length === 0) {
    return null;
  }

  const tasks: ProjectClarifierTaskCreateDraft[] = [];

  for (const item of value.tasks) {
    const task = parseTaskCreateDraft(item);

    if (!task || !createTaskSchema.safeParse(task).success) {
      return null;
    }

    tasks.push(task);
  }

  const description = optionalNonEmptyString(value.description);

  return {
    type: 'task-create',
    id: `task-create-${crypto.randomUUID()}`,
    title: optionalNonEmptyString(value.title) ?? 'Create tasks',
    ...(description && { description }),
    tasks,
  };
}

function parseTaskCreateDraft(
  value: unknown,
): ProjectClarifierTaskCreateDraft | null {
  if (!isRecord(value) || hasOwn(value, 'project')) {
    return null;
  }

  const name = optionalNonEmptyString(value.name);

  if (!name) {
    return null;
  }

  const task: ProjectClarifierTaskCreateDraft = { name };
  let invalid = false;

  if (hasOwn(value, 'description')) {
    const description = optionalNonEmptyString(value.description);
    invalid = invalid || !description;

    if (description) {
      task.description = description;
    }
  }

  if (hasOwn(value, 'status')) {
    const status = optionalNonEmptyString(value.status);
    invalid = invalid || !status;

    if (status) {
      task.status = status as ProjectClarifierTaskCreateDraft['status'];
    }
  }

  if (hasOwn(value, 'priority')) {
    const priority = optionalNonEmptyString(value.priority);
    invalid = invalid || !priority;

    if (priority) {
      task.priority = priority as ProjectClarifierTaskCreateDraft['priority'];
    }
  }

  if (hasOwn(value, 'tags')) {
    const tags = parseStringArrayForPatch(value.tags);
    invalid = invalid || !tags;

    if (tags) {
      task.tags = tags as ProjectClarifierTaskCreateDraft['tags'];
    }
  }

  if (hasOwn(value, 'dueDate')) {
    const dueDate = parseDateOnlyString(value.dueDate);
    invalid = invalid || !dueDate;

    if (dueDate) {
      task.dueDate = dueDate;
    }
  }

  if (hasOwn(value, 'completedOn')) {
    const completedOn = parseDateOnlyString(value.completedOn);
    invalid = invalid || !completedOn;

    if (completedOn) {
      task.completedOn = completedOn;
    }
  }

  if (hasOwn(value, 'estTime')) {
    const estTime = value.estTime;
    invalid =
      invalid ||
      typeof estTime !== 'number' ||
      !Number.isInteger(estTime);

    if (typeof estTime === 'number' && Number.isInteger(estTime)) {
      task.estTime = estTime;
    }
  }

  if (hasOwn(value, 'assignedTo')) {
    const assignedTo = optionalNonEmptyString(value.assignedTo);
    invalid = invalid || !assignedTo;

    if (assignedTo) {
      task.assignedTo = assignedTo as ProjectClarifierTaskCreateDraft['assignedTo'];
    }
  }

  if (hasOwn(value, 'acceptanceCriteria')) {
    const acceptanceCriteria = parseStringArrayForPatch(value.acceptanceCriteria);
    invalid = invalid || !acceptanceCriteria;

    if (acceptanceCriteria) {
      task.acceptanceCriteria = acceptanceCriteria;
    }
  }

  if (hasOwn(value, 'testingCriteria')) {
    const testingCriteria = parseStringArrayForPatch(value.testingCriteria);
    invalid = invalid || !testingCriteria;

    if (testingCriteria) {
      task.testingCriteria = testingCriteria;
    }
  }

  if (hasOwn(value, 'implementationPlan')) {
    const implementationPlan = parseStringArrayForPatch(value.implementationPlan);
    invalid = invalid || !implementationPlan;

    if (implementationPlan) {
      task.implementationPlan = implementationPlan;
    }
  }

  return invalid ? null : task;
}

function parseProjectUpdatePatch(
  value: unknown,
): ProjectClarifierProjectUpdatePatch | null {
  if (!isRecord(value)) {
    return null;
  }

  const patch: ProjectClarifierProjectUpdatePatch = {};
  let invalid = false;

  if (hasOwn(value, 'name')) {
    const name = optionalNonEmptyString(value.name);
    invalid = invalid || !name;

    if (name) {
      patch.name = name;
    }
  }

  if (hasOwn(value, 'summary')) {
    const summary = optionalNonEmptyString(value.summary);
    invalid = invalid || !summary;

    if (summary) {
      patch.summary = summary;
    }
  }

  if (hasOwn(value, 'status')) {
    const status = optionalNonEmptyString(value.status);
    invalid = invalid || !status;

    if (status) {
      patch.status = status as ProjectClarifierProjectUpdatePatch['status'];
    }
  }

  if (hasOwn(value, 'priority')) {
    const priority = optionalNonEmptyString(value.priority);
    invalid = invalid || !priority;

    if (priority) {
      patch.priority = priority as ProjectClarifierProjectUpdatePatch['priority'];
    }
  }

  if (hasOwn(value, 'tags')) {
    const tags = parseStringArrayForPatch(value.tags);
    invalid = invalid || !tags;

    if (tags) {
      patch.tags = tags as ProjectClarifierProjectUpdatePatch['tags'];
    }
  }

  if (hasOwn(value, 'startDate')) {
    const startDate = parseDateOnlyString(value.startDate);
    invalid = invalid || !startDate;

    if (startDate) {
      patch.startDate = startDate;
    }
  }

  if (hasOwn(value, 'endDate')) {
    const endDate = parseDateOnlyString(value.endDate);
    invalid = invalid || !endDate;

    if (endDate) {
      patch.endDate = endDate;
    }
  }

  if (hasOwn(value, 'estTime')) {
    const estTime = value.estTime;
    invalid =
      invalid ||
      typeof estTime !== 'number' ||
      !Number.isFinite(estTime);

    if (typeof estTime === 'number' && Number.isFinite(estTime)) {
      patch.estTime = estTime;
    }
  }

  if (invalid || Object.keys(patch).length === 0) {
    return null;
  }

  return patch;
}

function buildEffectiveProjectUpdate(
  rawPatch: ProjectClarifierProjectUpdatePatch,
  project: ProjectClarifierProjectContext,
): {
  patch: ProjectClarifierProjectUpdatePatch;
  changes: ProjectClarifierSuggestedActionChange[];
} | null {
  const patch: ProjectClarifierProjectUpdatePatch = {};
  const changes: ProjectClarifierSuggestedActionChange[] = [];

  for (const field of projectUpdateFields) {
    if (!hasOwn(rawPatch, field)) {
      continue;
    }

    const afterValue = rawPatch[field] as
      ProjectClarifierProjectUpdatePatch[ProjectClarifierProjectUpdateField];

    if (isSameProjectUpdateValue(field, project[field], afterValue)) {
      continue;
    }

    assignProjectUpdateValue(patch, field, afterValue);
    changes.push({
      field,
      label: projectUpdateFieldLabels[field],
      before: formatProjectUpdateValue(field, project[field]),
      after: formatProjectUpdateValue(field, afterValue),
    });
  }

  if (changes.length === 0) {
    return null;
  }

  return { patch, changes };
}

function assignProjectUpdateValue(
  patch: ProjectClarifierProjectUpdatePatch,
  field: ProjectClarifierProjectUpdateField,
  value: ProjectClarifierProjectUpdatePatch[ProjectClarifierProjectUpdateField],
) {
  switch (field) {
    case 'name':
      patch.name = value as ProjectClarifierProjectUpdatePatch['name'];
      break;
    case 'summary':
      patch.summary = value as ProjectClarifierProjectUpdatePatch['summary'];
      break;
    case 'status':
      patch.status = value as ProjectClarifierProjectUpdatePatch['status'];
      break;
    case 'priority':
      patch.priority = value as ProjectClarifierProjectUpdatePatch['priority'];
      break;
    case 'tags':
      patch.tags = value as ProjectClarifierProjectUpdatePatch['tags'];
      break;
    case 'startDate':
      patch.startDate = value as ProjectClarifierProjectUpdatePatch['startDate'];
      break;
    case 'endDate':
      patch.endDate = value as ProjectClarifierProjectUpdatePatch['endDate'];
      break;
    case 'estTime':
      patch.estTime = value as ProjectClarifierProjectUpdatePatch['estTime'];
      break;
  }
}

function isSameProjectUpdateValue(
  field: ProjectClarifierProjectUpdateField,
  currentValue: ProjectClarifierProjectContext[ProjectClarifierProjectUpdateField],
  nextValue: ProjectClarifierProjectUpdatePatch[ProjectClarifierProjectUpdateField],
) {
  if (field === 'tags') {
    return arraysMatch(
      normalizeStringArray(currentValue),
      normalizeStringArray(nextValue),
    );
  }

  if (field === 'startDate' || field === 'endDate') {
    return dateDisplayValue(currentValue) === dateDisplayValue(nextValue);
  }

  if (field === 'estTime') {
    return currentValue === nextValue;
  }

  return normalizeString(currentValue) === normalizeString(nextValue);
}

function formatProjectUpdateValue(
  field: ProjectClarifierProjectUpdateField,
  value: ProjectClarifierProjectContext[ProjectClarifierProjectUpdateField] |
    ProjectClarifierProjectUpdatePatch[ProjectClarifierProjectUpdateField],
) {
  if (field === 'tags') {
    const tags = formatStringArray(value);
    return tags.length > 0 ? tags.join(', ') : 'Not set';
  }

  if (field === 'startDate' || field === 'endDate') {
    return dateDisplayValue(value) ?? 'Not set';
  }

  if (field === 'estTime') {
    return typeof value === 'number' ? `${value} minutes` : 'Not set';
  }

  return normalizeString(value) || 'Not set';
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function formatStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function arraysMatch(first: string[], second: string[]) {
  return (
    first.length === second.length &&
    first.every((item, index) => item === second[index])
  );
}

function dateDisplayValue(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const dateValue = value.trim();

  if (dateOnlyPattern.test(dateValue)) {
    return dateValue;
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return parsedDate.toISOString().slice(0, 10);
}

function parseDateOnlyString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const dateValue = value.trim();

  return dateOnlyPattern.test(dateValue) ? dateValue : null;
}

function parseStringArrayForPatch(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const strings: string[] = [];

  for (const item of value) {
    const stringValue = optionalNonEmptyString(item);

    if (!stringValue) {
      return null;
    }

    strings.push(stringValue);
  }

  return strings;
}

function optionalNonEmptyString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function parseContext(value: unknown): ParsedContextResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      error: 'Request must include project clarifier context.',
    };
  }

  const project = parseProject(value.project);

  if (!project) {
    return {
      ok: false,
      error: 'Request must include valid project context.',
    };
  }

  const tasks = parseTasks(value.tasks);

  if (!tasks) {
    return {
      ok: false,
      error: 'Project clarifier tasks must be an array.',
    };
  }

  return {
    ok: true,
    context: {
      project,
      tasks,
    },
  };
}

function parseProject(value: unknown): ProjectClarifierProjectContext | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null;
  }

  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    return null;
  }

  const tags = parseStringArray(value.tags);

  if (!tags) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    summary: optionalString(value.summary),
    status: optionalString(value.status),
    priority: optionalString(value.priority),
    tags,
    startDate: optionalString(value.startDate),
    endDate: optionalString(value.endDate),
    estTime: optionalNumber(value.estTime),
    assignedTo: optionalString(value.assignedTo),
  };
}

function parseTasks(value: unknown): ProjectClarifierTaskContext[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const tasks: ProjectClarifierTaskContext[] = [];

  for (const task of value) {
    if (!isRecord(task)) {
      return null;
    }

    if (typeof task.id !== 'string' || task.id.trim().length === 0) {
      return null;
    }

    if (typeof task.name !== 'string') {
      return null;
    }

    const tags = parseStringArray(task.tags);

    if (!tags) {
      return null;
    }

    tasks.push({
      id: task.id,
      name: task.name,
      description: optionalString(task.description),
      status: optionalString(task.status),
      priority: optionalString(task.priority),
      tags,
      dueDate: optionalString(task.dueDate),
      completedOn: optionalString(task.completedOn),
      estTime: optionalNumber(task.estTime),
      assignedTo: optionalString(task.assignedTo),
      acceptanceCriteria: parseOptionalStringArray(task.acceptanceCriteria),
      testingCriteria: parseOptionalStringArray(task.testingCriteria),
      implementationPlan: parseOptionalStringArray(task.implementationPlan),
    });
  }

  return tasks;
}

function parseStringArray(value: unknown): string[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return null;
  }

  return value;
}

function parseOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseStringArray(value) ?? undefined;
}

function parsePlannerAgent(value: unknown): AgentAssigneeName | undefined | null {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (
    typeof value === 'string' &&
    agentAssigneeValues.includes(value as AgentAssigneeName)
  ) {
    return value as AgentAssigneeName;
  }

  return null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn<T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}
