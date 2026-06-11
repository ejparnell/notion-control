import 'server-only';

import { createChatCompletion } from '@/lib/agents/llm';
import { localMemoryContextProvider } from '@/lib/agents/chat/localMemoryContext';
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
  ProjectClarifierContext,
  ProjectClarifierMessage,
  ProjectClarifierSuggestedAction,
} from '@/lib/types/project-clarifier';

type RunProjectClarifierChatInput = {
  messages: ProjectClarifierMessage[];
  context: ProjectClarifierContext;
  plannerAgent?: AgentAssigneeName;
  selectedSourcePaths?: string[];
};

type RunProjectClarifierChatResult = {
  message: ProjectClarifierMessage;
};

const SYSTEM_PROMPT = [
  'You are a project and task clarification assistant inside a project detail page.',
  'Your job is to help the user clarify project scope, task breakdown, missing task details, time estimates, dates, priorities, and sequencing.',
  'The supplied project/task snapshot is the source of truth for the current app data.',
  'When local-memory context is provided, use it as private background context for project planning and task suggestions.',
  'Do not mention local memory, source labels, source paths, document names, chunk IDs, line numbers, or citations in your reply.',
  'You may propose project field updates that the user can apply with a button, but only the user can apply them.',
  'Do not claim that you have created, updated, deleted, persisted, saved, or applied anything.',
  'Ask concise clarifying questions, usually one or two at a time.',
  'When suggesting new tasks, dates, or time estimates, label anything not present in the snapshot as an assumption.',
  'You may propose new tasks for this project with a task-create action. Do not propose task update or delete actions.',
  'Project update actions support these fields: name, summary, status, priority, tags, startDate, endDate, estTime.',
  'Task create actions support these fields for each task: name, status, dueDate, priority, tags, completedOn, estTime.',
  'Do not say startDate or endDate cannot be updated. If either date is missing from the snapshot, it is supported but not set yet.',
  'When useful, include one project-update suggested action for concrete project field changes the user may want to apply.',
  'When useful, include one task-create suggested action with all new task drafts the user may want to create.',
  'When suggesting a broad project cleanup or refocus, include a complete patch with every existing project field carried forward plus the changed values.',
  'Omit unset optional fields from the patch only when you are not assigning a concrete value for them. Do not use null in patches.',
  'If the user asks about updating startDate or endDate, answer yes and either ask for the desired dates or propose clearly labeled YYYY-MM-DD assumptions.',
  'Valid project statuses are: ' + statusValues.join(', ') + '.',
  'Valid project priorities are: ' + priorityValues.join(', ') + '.',
  'Valid project tags are: ' + tagValues.join(', ') + '.',
  'Suggested project and task dates must use YYYY-MM-DD strings.',
  'Suggested project estimated time must be minutes as a number. Suggested task estimated time must be integer minutes as a number.',
  'Do not include a project field in task-create task drafts; the app will attach tasks to the current project.',
  'If the snapshot is missing information needed for a confident answer, say what is missing instead of inventing it.',
  'Return JSON only, with no Markdown fences or surrounding prose.',
  'Use this shape: {"content":"Your conversational reply.","suggestedActions":[{"type":"project-update","title":"Short title","description":"Optional short explanation","patch":{"name":"Current or new name","summary":"Current or new summary","status":"Planning","priority":"Medium","tags":["Personal"],"startDate":"2026-06-08","endDate":"2026-06-14","estTime":120}},{"type":"task-create","title":"Create meal prep tasks","description":"Optional short explanation","tasks":[{"name":"Choose recipes","status":"Backlog","priority":"Medium","tags":["Personal"],"dueDate":"2026-06-08","estTime":30}]}]}.',
  'Omit suggestedActions or use an empty array when a normal chat reply is enough.',
].join(' ');

const PLANNING_PROMPT = [
  'You are a project planning assistant inside a project detail page.',
  'The user has selected one planning agent. Your job is to turn the current project snapshot into concrete implementation tasks for that selected agent.',
  'The supplied project/task snapshot is the source of truth for the current app data.',
  'When local-memory context is provided, use it as private background context for project planning.',
  'Do not mention local memory, source labels, source paths, document names, chunk IDs, line numbers, or citations in your reply.',
  'Only propose new task drafts for the current project. Do not propose project-update, task-update, delete, assignment-update, or work-create actions.',
  'Only the user can apply the task-create action. Do not claim that you created, updated, deleted, persisted, saved, or applied anything.',
  'Create a practical plan that a coding team agent can execute. Include acceptance criteria, testing criteria, and implementation plan steps on each task.',
  'Set assignedTo on every task draft to the selected planning agent exactly as provided.',
  'If one task is enough, return one task. If the project needs multiple clear pieces, return a small ordered set of tasks.',
  'Task create actions support these fields for each task: name, description, status, dueDate, priority, tags, completedOn, estTime, assignedTo, acceptanceCriteria, testingCriteria, implementationPlan.',
  'Valid task statuses are: ' + statusValues.join(', ') + '.',
  'Valid task priorities are: ' + priorityValues.join(', ') + '.',
  'Valid task tags are: ' + tagValues.join(', ') + '.',
  'Valid task assignees are: ' + agentAssigneeValues.join(', ') + '.',
  'Suggested task dates must use YYYY-MM-DD strings. Suggested task estimated time must be integer minutes as a number.',
  'Do not include a project field in task-create task drafts; the app will attach tasks to the current project.',
  'Return JSON only, with no Markdown fences or surrounding prose.',
  'Use this shape: {"content":"Brief planning summary for the user.","suggestedActions":[{"type":"task-create","title":"Create project plan tasks","description":"Optional short explanation","tasks":[{"name":"Implement reusable planner controls","description":"Ticket goal and context","status":"Backlog","priority":"Medium","tags":["Work"],"estTime":90,"assignedTo":"Coding","acceptanceCriteria":["Planner controls appear in both clarifier chats"],"testingCriteria":["Run typecheck","Verify planner action creates an apply card"],"implementationPlan":["Update client components","Call planner API path","Render returned action card"]}]}]}.',
].join(' ');

export async function runProjectClarifierChat({
  messages,
  context,
  plannerAgent,
  selectedSourcePaths,
}: RunProjectClarifierChatInput): Promise<RunProjectClarifierChatResult> {
  const localMemory = await localMemoryContextProvider(
    {
      messages: buildProjectClarifierRetrievalMessages(messages, context),
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
    'Every proposed task draft must include this selected agent in assignedTo.',
  ].join('\n');
}

function buildProjectClarifierRetrievalMessages(
  messages: ProjectClarifierMessage[],
  context: ProjectClarifierContext,
): ChatMessage[] {
  return [
    {
      role: 'user',
      content: buildProjectClarifierRetrievalSeed(context),
    },
    ...messages.slice(-3).map(({ role, content }) => ({ role, content })),
  ];
}

function buildProjectClarifierRetrievalSeed(context: ProjectClarifierContext) {
  const project = context.project;
  const taskLines = context.tasks.slice(0, 20).map((task) => {
    const details = [
      task.status && `status: ${task.status}`,
      task.priority && `priority: ${task.priority}`,
      task.tags.length > 0 && `tags: ${task.tags.join(', ')}`,
    ].filter(Boolean);

    return `- ${task.name}${details.length > 0 ? ` (${details.join('; ')})` : ''}`;
  });

  return [
    'Project clarifier retrieval context:',
    `Project name: ${project.name}`,
    project.summary ? `Project summary: ${project.summary}` : null,
    project.status ? `Project status: ${project.status}` : null,
    project.priority ? `Project priority: ${project.priority}` : null,
    project.tags.length > 0 ? `Project tags: ${project.tags.join(', ')}` : null,
    taskLines.length > 0 ? `Tasks:\n${taskLines.join('\n')}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function buildContextMessage(context: ProjectClarifierContext) {
  return [
    'Current project/task snapshot. Null means the optional value is supported but not set.',
    JSON.stringify(contextForPrompt(context), null, 2),
  ].join('\n\n');
}

function contextForPrompt(context: ProjectClarifierContext) {
  return {
    project: {
      id: context.project.id,
      name: context.project.name,
      summary: context.project.summary ?? null,
      status: context.project.status ?? null,
      priority: context.project.priority ?? null,
      tags: context.project.tags,
      startDate: dateOnlyForPrompt(context.project.startDate),
      endDate: dateOnlyForPrompt(context.project.endDate),
      estTime: context.project.estTime ?? null,
      assignedTo: context.project.assignedTo ?? null,
    },
    tasks: context.tasks.map((task) => ({
      id: task.id,
      name: task.name,
      status: task.status ?? null,
      priority: task.priority ?? null,
      tags: task.tags,
      dueDate: dateOnlyForPrompt(task.dueDate),
      completedOn: dateOnlyForPrompt(task.completedOn),
      estTime: task.estTime ?? null,
      assignedTo: task.assignedTo ?? null,
      description: task.description ?? null,
      acceptanceCriteria: task.acceptanceCriteria ?? [],
      testingCriteria: task.testingCriteria ?? [],
      implementationPlan: task.implementationPlan ?? [],
    })),
    supportedProjectUpdateFields: [
      'name',
      'summary',
      'status',
      'priority',
      'tags',
      'startDate',
      'endDate',
      'estTime',
    ],
    supportedTaskCreateFields: [
      'name',
      'status',
      'dueDate',
      'priority',
      'tags',
      'completedOn',
      'estTime',
      'assignedTo',
      'description',
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

function parseAssistantMessage(rawContent: string): ProjectClarifierMessage {
  const parsed = parseAssistantResponseJson(rawContent);

  if (!parsed) {
    return {
      role: 'assistant',
      content: stripSourceReferences(rawContent),
    };
  }

  if (!isRecord(parsed) || typeof parsed.content !== 'string') {
    return {
      role: 'assistant',
      content: stripSourceReferences(rawContent),
    };
  }

  const content = stripSourceReferences(parsed.content).trim() || 'I have a project update suggestion ready.';
  const suggestedActions = Array.isArray(parsed.suggestedActions)
    ? (parsed.suggestedActions as ProjectClarifierSuggestedAction[])
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

function parseAssistantResponseJson(rawContent: string): unknown | null {
  const trimmedContent = rawContent.trim();

  try {
    return JSON.parse(trimmedContent);
  } catch {
    const fencedJson = extractFencedJson(trimmedContent);

    if (fencedJson) {
      try {
        return JSON.parse(fencedJson);
      } catch {
        return extractFirstJsonObject(trimmedContent);
      }
    }

    return extractFirstJsonObject(trimmedContent);
  }
}

function extractFencedJson(content: string) {
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(content);

  return fenceMatch?.[1]?.trim() ?? null;
}

function extractFirstJsonObject(content: string): unknown | null {
  const startIndex = content.indexOf('{');

  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < content.length; index += 1) {
    const char = content[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    }

    if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        try {
          return JSON.parse(content.slice(startIndex, index + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
