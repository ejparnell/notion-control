import { type NextRequest, NextResponse } from 'next/server';

import { runTaskClarifierChat } from '@/lib/agents/task-clarifier';
import {
  parseSelectedLocalMemorySourcePaths,
} from '@/lib/agents/rag/local-memory-sources';
import { LocalMemorySourceError } from '@/lib/agents/rag/source-document';
import { isRetrievalConfigurationError } from '@/lib/agents/rag/vector/retrieval';
import { createTaskSchema, updateTaskSchema } from '@/lib/validations/tasks';
import {
  agentAssigneeValues,
  type AgentAssigneeName,
} from '@/lib/constants';
import type {
  TaskClarifierContext,
  TaskClarifierMessage,
  TaskClarifierSuggestedAction,
  TaskClarifierSuggestedActionChange,
  TaskClarifierTaskContext,
  TaskClarifierTaskCreateAction,
  TaskClarifierTaskCreateDraft,
  TaskClarifierTaskUpdateAction,
  TaskClarifierTaskUpdateField,
  TaskClarifierTaskUpdatePatch,
} from '@/lib/types/task-clarifier';

export const runtime = 'nodejs';

type ParsedContextResult =
  | { ok: true; context: TaskClarifierContext }
  | { ok: false; error: string };

type ParsedMessagesResult =
  | { ok: true; messages: TaskClarifierMessage[] }
  | { ok: false; error: string };

const taskUpdateFields: TaskClarifierTaskUpdateField[] = [
  'name',
  'description',
  'status',
  'priority',
  'tags',
  'dueDate',
  'completedOn',
  'estTime',
  'assignedTo',
  'acceptanceCriteria',
  'testingCriteria',
  'implementationPlan',
];

const taskUpdateFieldLabels: Record<TaskClarifierTaskUpdateField, string> = {
  name: 'Name',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  tags: 'Tags',
  dueDate: 'Due date',
  completedOn: 'Completed on',
  estTime: 'Est. time',
  assignedTo: 'Assigned to',
  acceptanceCriteria: 'Acceptance criteria',
  testingCriteria: 'Testing criteria',
  implementationPlan: 'Implementation plan',
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
    const result = await runTaskClarifierChat({
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
    message => isRecord(message) && message.role === 'system',
  );

  if (hasSystemMessage) {
    return {
      ok: false,
      error: 'Client-supplied system messages are not allowed.',
    };
  }

  const messages: TaskClarifierMessage[] = [];

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

  if (!messages.some(message => message.role === 'user' && message.content.length > 0)) {
    return {
      ok: false,
      error: 'Request must include at least one non-empty user message.',
    };
  }

  return { ok: true, messages };
}

function sanitizeAssistantMessage(
  message: TaskClarifierMessage,
  context: TaskClarifierContext,
): TaskClarifierMessage {
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
  context: TaskClarifierContext,
): TaskClarifierSuggestedAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const actions: TaskClarifierSuggestedAction[] = [];

  for (const item of value) {
    const action =
      parseTaskUpdateAction(item, context) ??
      parseTaskCreateAction(item, context);

    if (action) {
      actions.push(action);
    }
  }

  return actions;
}

function parseTaskUpdateAction(
  value: unknown,
  context: TaskClarifierContext,
): TaskClarifierTaskUpdateAction | null {
  if (!isRecord(value) || value.type !== 'task-update') {
    return null;
  }

  const rawPatch = parseTaskUpdatePatch(value.patch);

  if (!rawPatch || !updateTaskSchema.safeParse(rawPatch).success) {
    return null;
  }

  const effectiveUpdate = buildEffectiveTaskUpdate(rawPatch, context.task);

  if (
    !effectiveUpdate ||
    !updateTaskSchema.safeParse(effectiveUpdate.patch).success
  ) {
    return null;
  }

  const description = optionalNonEmptyString(value.description);

  return {
    type: 'task-update',
    id: `task-update-${crypto.randomUUID()}`,
    title: optionalNonEmptyString(value.title) ?? 'Update task',
    ...(description && { description }),
    patch: effectiveUpdate.patch,
    changes: effectiveUpdate.changes,
  };
}

function parseTaskCreateAction(
  value: unknown,
  context: TaskClarifierContext,
): TaskClarifierTaskCreateAction | null {
  if (!context.project || !isRecord(value) || value.type !== 'task-create') {
    return null;
  }

  if (!Array.isArray(value.tasks) || value.tasks.length === 0) {
    return null;
  }

  const tasks: TaskClarifierTaskCreateDraft[] = [];

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
    title: optionalNonEmptyString(value.title) ?? 'Create related tasks',
    ...(description && { description }),
    tasks,
  };
}

function parseTaskCreateDraft(
  value: unknown,
): TaskClarifierTaskCreateDraft | null {
  if (!isRecord(value) || hasOwn(value, 'project')) {
    return null;
  }

  const name = optionalNonEmptyString(value.name);

  if (!name) {
    return null;
  }

  const task: TaskClarifierTaskCreateDraft = { name };
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
      task.status = status as TaskClarifierTaskCreateDraft['status'];
    }
  }

  if (hasOwn(value, 'priority')) {
    const priority = optionalNonEmptyString(value.priority);
    invalid = invalid || !priority;

    if (priority) {
      task.priority = priority as TaskClarifierTaskCreateDraft['priority'];
    }
  }

  if (hasOwn(value, 'tags')) {
    const tags = parseStringArrayForPatch(value.tags);
    invalid = invalid || !tags;

    if (tags) {
      task.tags = tags as TaskClarifierTaskCreateDraft['tags'];
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
      task.assignedTo = assignedTo as TaskClarifierTaskCreateDraft['assignedTo'];
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

function parseTaskUpdatePatch(
  value: unknown,
): TaskClarifierTaskUpdatePatch | null {
  if (!isRecord(value) || hasOwn(value, 'project')) {
    return null;
  }

  const patch: TaskClarifierTaskUpdatePatch = {};
  let invalid = false;

  if (hasOwn(value, 'name')) {
    const name = optionalNonEmptyString(value.name);
    invalid = invalid || !name;

    if (name) {
      patch.name = name;
    }
  }

  if (hasOwn(value, 'description')) {
    const description = optionalNonEmptyString(value.description);
    invalid = invalid || !description;

    if (description) {
      patch.description = description;
    }
  }

  if (hasOwn(value, 'status')) {
    const status = optionalNonEmptyString(value.status);
    invalid = invalid || !status;

    if (status) {
      patch.status = status as TaskClarifierTaskUpdatePatch['status'];
    }
  }

  if (hasOwn(value, 'priority')) {
    const priority = optionalNonEmptyString(value.priority);
    invalid = invalid || !priority;

    if (priority) {
      patch.priority = priority as TaskClarifierTaskUpdatePatch['priority'];
    }
  }

  if (hasOwn(value, 'tags')) {
    const tags = parseStringArrayForPatch(value.tags);
    invalid = invalid || !tags;

    if (tags) {
      patch.tags = tags as TaskClarifierTaskUpdatePatch['tags'];
    }
  }

  if (hasOwn(value, 'dueDate')) {
    const dueDate = parseDateOnlyString(value.dueDate);
    invalid = invalid || !dueDate;

    if (dueDate) {
      patch.dueDate = dueDate;
    }
  }

  if (hasOwn(value, 'completedOn')) {
    const completedOn = parseDateOnlyString(value.completedOn);
    invalid = invalid || !completedOn;

    if (completedOn) {
      patch.completedOn = completedOn;
    }
  }

  if (hasOwn(value, 'estTime')) {
    const estTime = value.estTime;
    invalid =
      invalid ||
      typeof estTime !== 'number' ||
      !Number.isInteger(estTime);

    if (typeof estTime === 'number' && Number.isInteger(estTime)) {
      patch.estTime = estTime;
    }
  }

  if (hasOwn(value, 'assignedTo')) {
    const assignedTo = optionalNonEmptyString(value.assignedTo);
    invalid = invalid || !assignedTo;

    if (assignedTo) {
      patch.assignedTo = assignedTo as TaskClarifierTaskUpdatePatch['assignedTo'];
    }
  }

  if (hasOwn(value, 'acceptanceCriteria')) {
    const acceptanceCriteria = parseStringArrayForPatch(value.acceptanceCriteria);
    invalid = invalid || !acceptanceCriteria;

    if (acceptanceCriteria) {
      patch.acceptanceCriteria = acceptanceCriteria;
    }
  }

  if (hasOwn(value, 'testingCriteria')) {
    const testingCriteria = parseStringArrayForPatch(value.testingCriteria);
    invalid = invalid || !testingCriteria;

    if (testingCriteria) {
      patch.testingCriteria = testingCriteria;
    }
  }

  if (hasOwn(value, 'implementationPlan')) {
    const implementationPlan = parseStringArrayForPatch(value.implementationPlan);
    invalid = invalid || !implementationPlan;

    if (implementationPlan) {
      patch.implementationPlan = implementationPlan;
    }
  }

  if (invalid || Object.keys(patch).length === 0) {
    return null;
  }

  return patch;
}

function buildEffectiveTaskUpdate(
  rawPatch: TaskClarifierTaskUpdatePatch,
  task: TaskClarifierTaskContext,
): {
  patch: TaskClarifierTaskUpdatePatch;
  changes: TaskClarifierSuggestedActionChange[];
} | null {
  const patch: TaskClarifierTaskUpdatePatch = {};
  const changes: TaskClarifierSuggestedActionChange[] = [];

  for (const field of taskUpdateFields) {
    if (!hasOwn(rawPatch, field)) {
      continue;
    }

    const afterValue = rawPatch[field] as
      TaskClarifierTaskUpdatePatch[TaskClarifierTaskUpdateField];

    if (isSameTaskUpdateValue(field, task[field], afterValue)) {
      continue;
    }

    assignTaskUpdateValue(patch, field, afterValue);
    changes.push({
      field,
      label: taskUpdateFieldLabels[field],
      before: formatTaskUpdateValue(field, task[field]),
      after: formatTaskUpdateValue(field, afterValue),
    });
  }

  if (changes.length === 0) {
    return null;
  }

  return { patch, changes };
}

function assignTaskUpdateValue(
  patch: TaskClarifierTaskUpdatePatch,
  field: TaskClarifierTaskUpdateField,
  value: TaskClarifierTaskUpdatePatch[TaskClarifierTaskUpdateField],
) {
  switch (field) {
    case 'name':
      patch.name = value as TaskClarifierTaskUpdatePatch['name'];
      break;
    case 'description':
      patch.description = value as TaskClarifierTaskUpdatePatch['description'];
      break;
    case 'status':
      patch.status = value as TaskClarifierTaskUpdatePatch['status'];
      break;
    case 'priority':
      patch.priority = value as TaskClarifierTaskUpdatePatch['priority'];
      break;
    case 'tags':
      patch.tags = value as TaskClarifierTaskUpdatePatch['tags'];
      break;
    case 'dueDate':
      patch.dueDate = value as TaskClarifierTaskUpdatePatch['dueDate'];
      break;
    case 'completedOn':
      patch.completedOn = value as TaskClarifierTaskUpdatePatch['completedOn'];
      break;
    case 'estTime':
      patch.estTime = value as TaskClarifierTaskUpdatePatch['estTime'];
      break;
    case 'assignedTo':
      patch.assignedTo = value as TaskClarifierTaskUpdatePatch['assignedTo'];
      break;
    case 'acceptanceCriteria':
      patch.acceptanceCriteria = value as TaskClarifierTaskUpdatePatch['acceptanceCriteria'];
      break;
    case 'testingCriteria':
      patch.testingCriteria = value as TaskClarifierTaskUpdatePatch['testingCriteria'];
      break;
    case 'implementationPlan':
      patch.implementationPlan = value as TaskClarifierTaskUpdatePatch['implementationPlan'];
      break;
  }
}

function isSameTaskUpdateValue(
  field: TaskClarifierTaskUpdateField,
  currentValue: TaskClarifierTaskContext[TaskClarifierTaskUpdateField],
  nextValue: TaskClarifierTaskUpdatePatch[TaskClarifierTaskUpdateField],
) {
  if (
    field === 'tags' ||
    field === 'acceptanceCriteria' ||
    field === 'testingCriteria' ||
    field === 'implementationPlan'
  ) {
    return arraysMatch(
      normalizeStringArray(currentValue),
      normalizeStringArray(nextValue),
    );
  }

  if (field === 'dueDate' || field === 'completedOn') {
    return dateDisplayValue(currentValue) === dateDisplayValue(nextValue);
  }

  if (field === 'estTime') {
    return currentValue === nextValue;
  }

  return normalizeString(currentValue) === normalizeString(nextValue);
}

function formatTaskUpdateValue(
  field: TaskClarifierTaskUpdateField,
  value: TaskClarifierTaskContext[TaskClarifierTaskUpdateField] |
    TaskClarifierTaskUpdatePatch[TaskClarifierTaskUpdateField],
) {
  if (
    field === 'tags' ||
    field === 'acceptanceCriteria' ||
    field === 'testingCriteria' ||
    field === 'implementationPlan'
  ) {
    const tags = formatStringArray(value);
    return tags.length > 0 ? tags.join(', ') : 'Not set';
  }

  if (field === 'dueDate' || field === 'completedOn') {
    return dateDisplayValue(value) ?? 'Not set';
  }

  if (field === 'estTime') {
    return typeof value === 'number' ? `${value} minutes` : 'Not set';
  }

  return normalizeString(value) || 'Not set';
}

function parseContext(value: unknown): ParsedContextResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      error: 'Request must include task clarifier context.',
    };
  }

  const task = parseTask(value.task);

  if (!task) {
    return {
      ok: false,
      error: 'Request must include valid task context.',
    };
  }

  const project = value.project === undefined
    ? undefined
    : parseProject(value.project);

  if (value.project !== undefined && !project) {
    return {
      ok: false,
      error: 'Task clarifier project context is invalid.',
    };
  }

  const relatedTasks = parseTasks(value.relatedTasks);

  if (!relatedTasks) {
    return {
      ok: false,
      error: 'Task clarifier related tasks must be an array.',
    };
  }

  return {
    ok: true,
    context: {
      task,
      ...(project && { project }),
      relatedTasks,
    },
  };
}

function parseProject(value: unknown): TaskClarifierContext['project'] | null {
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
  };
}

function parseTasks(value: unknown): TaskClarifierTaskContext[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const tasks: TaskClarifierTaskContext[] = [];

  for (const task of value) {
    const parsedTask = parseTask(task);

    if (!parsedTask) {
      return null;
    }

    tasks.push(parsedTask);
  }

  return tasks;
}

function parseTask(value: unknown): TaskClarifierTaskContext | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    return null;
  }

  if (typeof value.name !== 'string') {
    return null;
  }

  const tags = parseStringArray(value.tags);

  if (!tags) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    description: optionalString(value.description),
    status: optionalString(value.status),
    priority: optionalString(value.priority),
    tags,
    dueDate: optionalString(value.dueDate),
    completedOn: optionalString(value.completedOn),
    estTime: optionalNumber(value.estTime),
    assignedTo: optionalString(value.assignedTo),
    acceptanceCriteria: parseOptionalStringArray(value.acceptanceCriteria),
    testingCriteria: parseOptionalStringArray(value.testingCriteria),
    implementationPlan: parseOptionalStringArray(value.implementationPlan),
  };
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
    .map(item => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function formatStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
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

function parseStringArray(value: unknown): string[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
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

function optionalNonEmptyString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
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
