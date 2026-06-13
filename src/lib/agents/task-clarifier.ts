import 'server-only';

import { createChatCompletion } from '@/lib/agents/llm';
import { localMemoryContextProvider } from '@/lib/agents/chat/localMemoryContext';
import {
  isJsonLikeContent,
  parseAssistantResponseJson,
} from '@/lib/agents/clarifier-json';
import { completionOptionsForMode } from '@/lib/agents/orchestrator/model';
import {
  agentAssigneeValues,
  priorityValues,
  statusValues,
  tagValues,
  type AgentAssigneeName,
} from '@/lib/constants';
import type { ChatMessage } from '@/lib/types/chat';
import type {
  TaskClarifierContext,
  TaskClarifierMessage,
  TaskClarifierSuggestedAction,
} from '@/lib/types/task-clarifier';

type RunTaskClarifierChatInput = {
  messages: TaskClarifierMessage[];
  context: TaskClarifierContext;
  plannerAgent?: AgentAssigneeName;
  selectedSourcePaths?: string[];
};

type RunTaskClarifierChatResult = {
  message: TaskClarifierMessage;
};

const SYSTEM_PROMPT = [
  'You are a task clarification assistant inside a task detail page.',
  'Your job is to help the user clarify the current task, missing details, acceptance criteria, time estimate, dates, priority, status, and useful sibling tasks in the same project.',
  'The supplied task/project snapshot is the source of truth for the current app data.',
  'Notes for this task are included in the snapshot. Review them — they record work done, ideas, and context the user has captured.',
  'When local-memory context is provided, use it as private background context for task clarification and planning.',
  'Do not mention local memory, source labels, source paths, document names, chunk IDs, line numbers, or citations in your reply.',
  'You may propose task field updates that the user can apply with a button, but only the user can apply them.',
  'You may propose sibling tasks only when the snapshot includes a project.',
  'You may propose a note-create action to capture a useful observation, decision, or piece of context as a note attached to this task.',
  'When you emit a note-create action, put the complete note text only in suggestedActions[].content.',
  'When you emit a note-create action, keep the top-level content to a short conversational confirmation and do not repeat the full note there.',
  'Do not ask whether the user wants you to add a note when you emit a note-create action.',
  'Do not claim that you have created, updated, deleted, persisted, saved, or applied anything.',
  'Ask concise clarifying questions, usually one or two at a time.',
  'When suggesting new dates or time estimates, label anything not present in the snapshot as an assumption.',
  'Task update actions support these fields: name, description, status, priority, tags, dueDate, completedOn, estTime, assignedTo, acceptanceCriteria, testingCriteria, implementationPlan.',
  'Task create actions support these fields for each sibling task: name, description, status, dueDate, priority, tags, completedOn, estTime, assignedTo, acceptanceCriteria, testingCriteria, implementationPlan.',
  'Note create actions support this field: content (string, max 5000 characters, the full note text).',
  'Valid task statuses are: ' + statusValues.join(', ') + '.',
  'Valid task priorities are: ' + priorityValues.join(', ') + '.',
  'Valid task tags are: ' + tagValues.join(', ') + '.',
  'Valid task assignees are: ' + agentAssigneeValues.join(', ') + '.',
  'Suggested task dates must use YYYY-MM-DD strings.',
  'Suggested task estimated time must be integer minutes as a number.',
  'Do not include a project field in task-create drafts; the app will attach sibling tasks to the current task project.',
  'If the snapshot is missing information needed for a confident answer, say what is missing instead of inventing it.',
  'Return JSON only, with no Markdown fences or surrounding prose.',
  'Use this shape: {"content":"Your conversational reply.","suggestedActions":[{"type":"task-update","title":"Short title","description":"Optional short explanation","patch":{"name":"Current or new name","description":"Task plan","status":"In Progress","priority":"Medium","tags":["Work"],"dueDate":"2026-06-08","completedOn":"2026-06-09","estTime":45,"assignedTo":"Coding","acceptanceCriteria":["Criterion"],"testingCriteria":["Test"],"implementationPlan":["Step"]}},{"type":"task-create","title":"Create sibling tasks","description":"Optional short explanation","tasks":[{"name":"Draft acceptance criteria","description":"Task context","status":"Backlog","priority":"Medium","tags":["Work"],"dueDate":"2026-06-08","estTime":30,"assignedTo":"PM","acceptanceCriteria":["Draft covers scope"],"testingCriteria":["Review against task"],"implementationPlan":["Write acceptance criteria"]}]},{"type":"note-create","title":"Add observation note","description":"Optional short explanation","content":"This task has tricky edge cases around date handling that should be noted."}]}.',
  'Omit suggestedActions or use an empty array when a normal chat reply is enough.',
].join(' ');

const PLANNING_PROMPT = [
  'You are a task planning assistant inside a task detail page.',
  'The user has selected one planning agent. Your job is to turn the current task snapshot into a concrete implementation plan for that selected agent.',
  'The supplied task/project snapshot is the source of truth for the current app data.',
  'Notes for this task are included in the snapshot. Review them — they record work done, ideas, and context the user has captured.',
  'When local-memory context is provided, use it as private background context for task planning.',
  'Do not mention local memory, source labels, source paths, document names, chunk IDs, line numbers, or citations in your reply.',
  'Only propose a task-update action for the selected current task. Do not propose project-update, task-create, delete, assignment-update, or work-create actions.',
  'Only the user can apply the task-update action. Do not claim that you created, updated, deleted, persisted, saved, or applied anything.',
  'The patch should fill or improve the task description, acceptance criteria, testing criteria, implementation plan, estimate, priority/status/tags when useful, and assignedTo.',
  'Set assignedTo in the patch to the selected planning agent exactly as provided.',
  'Task update actions support these fields: name, description, status, priority, tags, dueDate, completedOn, estTime, assignedTo, acceptanceCriteria, testingCriteria, implementationPlan.',
  'Valid task statuses are: ' + statusValues.join(', ') + '.',
  'Valid task priorities are: ' + priorityValues.join(', ') + '.',
  'Valid task tags are: ' + tagValues.join(', ') + '.',
  'Valid task assignees are: ' + agentAssigneeValues.join(', ') + '.',
  'Suggested task dates must use YYYY-MM-DD strings. Suggested task estimated time must be integer minutes as a number.',
  'Return JSON only, with no Markdown fences or surrounding prose.',
  'Use this shape: {"content":"Brief planning summary for the user.","suggestedActions":[{"type":"task-update","title":"Apply task plan","description":"Optional short explanation","patch":{"description":"Detailed implementation plan context","status":"Planning","priority":"High","tags":["Work"],"estTime":120,"assignedTo":"Coding","acceptanceCriteria":["Observable outcome"],"testingCriteria":["Verification step"],"implementationPlan":["Implementation step"]}}]}.',
].join(' ');

export async function runTaskClarifierChat({
  messages,
  context,
  plannerAgent,
  selectedSourcePaths,
}: RunTaskClarifierChatInput): Promise<RunTaskClarifierChatResult> {
  const localMemory = await localMemoryContextProvider(
    {
      messages: buildRetrievalMessages(messages, context),
    },
    {
      presentation: 'hidden',
      sourcePaths: selectedSourcePaths,
    },
  );

  const fullMessages: ChatMessage[] = [
    {
      role: 'system',
      content: plannerAgent ? PLANNING_PROMPT : SYSTEM_PROMPT,
    },
    ...localMemory.messages,
    {
      role: 'system',
      content: buildContextMessage(context),
    },
    ...(plannerAgent
      ? [{
        role: 'system' as const,
        content: buildPlannerContextMessage(plannerAgent),
      }]
      : []),
    ...messages.map(({ role, content }) => ({ role, content })),
  ];

  const result = await createChatCompletion(
    fullMessages,
    plannerAgent ? completionOptionsForMode('pro-planning') : { temperature: 0.4 },
  );

  return {
    message: parseAssistantMessage(result.message.content),
  };
}

function buildPlannerContextMessage(plannerAgent: AgentAssigneeName) {
  return [
    'Planner request context:',
    `Selected planning agent: ${plannerAgent}`,
    'The proposed task-update patch must include this selected agent in assignedTo.',
  ].join('\n');
}

function buildRetrievalMessages(
  messages: TaskClarifierMessage[],
  context: TaskClarifierContext,
): ChatMessage[] {
  return [
    {
      role: 'user',
      content: buildRetrievalSeed(context),
    },
    ...messages.slice(-3).map(({ role, content }) => ({ role, content })),
  ];
}

function buildRetrievalSeed(context: TaskClarifierContext) {
  const task = context.task;
  const relatedLines = context.relatedTasks.slice(0, 20).map((relatedTask) => {
    const details = [
      relatedTask.status && `status: ${relatedTask.status}`,
      relatedTask.priority && `priority: ${relatedTask.priority}`,
      relatedTask.tags.length > 0 && `tags: ${relatedTask.tags.join(', ')}`,
    ].filter(Boolean);

    return `- ${relatedTask.name}${details.length > 0 ? ` (${details.join('; ')})` : ''}`;
  });

  const noteLines = (context.notes ?? []).slice(0, 10).map((note, idx) =>
    `- Note ${idx + 1}: ${note.content.slice(0, 200)}`,
  );

  return [
    'Task clarifier retrieval context:',
    `Task name: ${task.name}`,
    task.status ? `Task status: ${task.status}` : null,
    task.priority ? `Task priority: ${task.priority}` : null,
    task.tags.length > 0 ? `Task tags: ${task.tags.join(', ')}` : null,
    noteLines.length > 0 ? `Notes:\n${noteLines.join('\n')}` : null,
    context.project ? `Project name: ${context.project.name}` : null,
    context.project?.summary ? `Project summary: ${context.project.summary}` : null,
    relatedLines.length > 0 ? `Related tasks:\n${relatedLines.join('\n')}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function buildContextMessage(context: TaskClarifierContext) {
  return [
    'Current task/project snapshot. Null means the optional value is supported but not set.',
    JSON.stringify(contextForPrompt(context), null, 2),
  ].join('\n\n');
}

function contextForPrompt(context: TaskClarifierContext) {
  return {
    task: {
      id: context.task.id,
      name: context.task.name,
      description: context.task.description ?? null,
      status: context.task.status ?? null,
      priority: context.task.priority ?? null,
      tags: context.task.tags,
      dueDate: dateOnlyForPrompt(context.task.dueDate),
      completedOn: dateOnlyForPrompt(context.task.completedOn),
      estTime: context.task.estTime ?? null,
      assignedTo: context.task.assignedTo ?? null,
      acceptanceCriteria: context.task.acceptanceCriteria ?? [],
      testingCriteria: context.task.testingCriteria ?? [],
      implementationPlan: context.task.implementationPlan ?? [],
    },
    project: context.project
      ? {
        id: context.project.id,
        name: context.project.name,
        summary: context.project.summary ?? null,
        status: context.project.status ?? null,
        priority: context.project.priority ?? null,
        tags: context.project.tags,
      }
      : null,
    notes: (context.notes ?? []).map((note) => ({
      content: note.content,
      createdAt: note.createdAt ?? null,
    })),
    relatedTasks: context.relatedTasks.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description ?? null,
      status: task.status ?? null,
      priority: task.priority ?? null,
      tags: task.tags,
      dueDate: dateOnlyForPrompt(task.dueDate),
      completedOn: dateOnlyForPrompt(task.completedOn),
      estTime: task.estTime ?? null,
      assignedTo: task.assignedTo ?? null,
      acceptanceCriteria: task.acceptanceCriteria ?? [],
      testingCriteria: task.testingCriteria ?? [],
      implementationPlan: task.implementationPlan ?? [],
    })),
    supportedTaskUpdateFields: [
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
    ],
    supportedTaskCreateFields: [
      'name',
      'description',
      'status',
      'dueDate',
      'priority',
      'tags',
      'completedOn',
      'estTime',
      'assignedTo',
      'acceptanceCriteria',
      'testingCriteria',
      'implementationPlan',
    ],
  };
}

function dateOnlyForPrompt(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toISOString().slice(0, 10);
}

function parseAssistantMessage(rawContent: string): TaskClarifierMessage {
  const parsed = parseAssistantResponseJson(rawContent);

  if (!parsed) {
    return {
      role: 'assistant',
      content: fallbackAssistantContent(rawContent),
    };
  }

  if (!isRecord(parsed) || typeof parsed.content !== 'string') {
    return {
      role: 'assistant',
      content: fallbackAssistantContent(rawContent),
    };
  }

  const content = stripSourceReferences(parsed.content).trim() || 'I have a task update suggestion ready.';
  const suggestedActions = Array.isArray(parsed.suggestedActions)
    ? (parsed.suggestedActions as TaskClarifierSuggestedAction[])
    : undefined;

  return {
    role: 'assistant',
    content,
    ...(suggestedActions && suggestedActions.length > 0 && { suggestedActions }),
  };
}

function stripSourceReferences(content: string) {
  return content.replace(/\s*\[Source\s+\d+\]/gi, '');
}

function fallbackAssistantContent(rawContent: string) {
  const content = stripSourceReferences(rawContent).trim();

  return isJsonLikeContent(content)
    ? 'I drafted an update, but could not read it cleanly. Please try again.'
    : content;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
