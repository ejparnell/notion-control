import { type NextRequest, NextResponse } from "next/server";

import { createAgentActivity } from "@/dal/agentActivities";
import { getAllProjects } from "@/dal/projects";
import { getAllTasks } from "@/dal/tasks";
import { runAgentOrchestratorChat } from "@/lib/agents/orchestrator";
import { resolveModelMode } from "@/lib/agents/orchestrator/model";
import { buildWorkCreateTaskDescription } from "@/lib/agents/orchestrator/work-description";
import { agentAssigneeValues } from "@/lib/constants";
import {
  createProjectSchema,
} from "@/lib/validations/projects";
import { createTaskSchema } from "@/lib/validations/tasks";
import type {
  AgentOrchestratorAssignment,
  AgentOrchestratorAssignmentAction,
  AgentOrchestratorAssignmentTarget,
  AgentOrchestratorAssignmentTargetType,
  AgentOrchestratorMessage,
  AgentOrchestratorModelMode,
  AgentOrchestratorSuggestedAction,
  AgentOrchestratorWorkCreateAction,
  AgentOrchestratorWorkCreateProjectDraft,
  AgentOrchestratorWorkCreateTaskDraft,
} from "@/lib/agents/orchestrator/types";
import type { AgentAssigneeName } from "@/lib/constants";
import type { ProjectInterface } from "@/lib/types/project";
import type { TaskInterface } from "@/lib/types/task";

export const runtime = "nodejs";

type ParsedMessagesResult =
  | { ok: true; messages: AgentOrchestratorMessage[] }
  | { ok: false; error: string };

export async function POST(req: NextRequest) {
  let body: {
    messages?: unknown;
    modelMode?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
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

  const modelMode = resolveModelMode(body.modelMode);

  if (!modelMode) {
    return NextResponse.json(
      { error: "modelMode must be standard, pro-planning, or coding-planning." },
      { status: 400 },
    );
  }

  try {
    const [projects, tasks] = await Promise.all([
      getAllProjects(),
      getAllTasks(),
    ]);
    const assignmentTargets = buildAssignmentTargets(projects, tasks);
    const result = await runAgentOrchestratorChat({
      messages: parsedMessages.messages,
      modelMode,
      assignmentTargets,
    });
    const message = sanitizeAssistantMessage(
      result.message,
      modelMode,
      assignmentTargets,
    );

    const activity = await createAgentActivity({
      modelMode,
      promptPreview: latestPromptPreview(parsedMessages.messages),
      pmSummary: message.content,
      specialistNotes: message.specialistNotes ?? [],
      proposedActions: message.suggestedActions ?? [],
      proposedAssignments: assignmentActionsFrom(message.suggestedActions),
    });

    return NextResponse.json({
      message,
      activity,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("DEEPSEEK_API_KEY")) {
      return NextResponse.json(
        { error: "Server configuration error: DeepSeek API key is not set." },
        { status: 500 },
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
      error: "Request must include at least one message.",
    };
  }

  const hasSystemMessage = value.some(
    (message) => isRecord(message) && message.role === "system",
  );

  if (hasSystemMessage) {
    return {
      ok: false,
      error: "Client-supplied system messages are not allowed.",
    };
  }

const messages: AgentOrchestratorMessage[] = [];

  for (const message of value) {
    if (!isRecord(message)) {
      return {
        ok: false,
        error: "Messages must be objects with role and content fields.",
      };
    }

    if (message.role !== "user" && message.role !== "assistant") {
      return {
        ok: false,
        error: "Messages may only use user or assistant roles.",
      };
    }

    if (typeof message.content !== "string") {
      return {
        ok: false,
        error: "Messages must include string content.",
      };
    }

    const content = message.content.trim();

    if (message.role === "user" && content.length === 0) {
      return {
        ok: false,
        error: "User messages must not be empty.",
      };
    }

    messages.push({
      role: message.role,
      content,
    });
  }

  if (!messages.some((message) => message.role === "user" && message.content.length > 0)) {
    return {
      ok: false,
      error: "Request must include at least one non-empty user message.",
    };
  }

  return { ok: true, messages };
}

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeAssistantMessage(
  message: AgentOrchestratorMessage,
  modelMode: AgentOrchestratorModelMode,
  assignmentTargets: AgentOrchestratorAssignmentTarget[],
): AgentOrchestratorMessage {
  const suggestedActions = sanitizeSuggestedActions(
    message.suggestedActions,
    assignmentTargets,
  );

  return {
    role: "assistant",
    content: message.content.trim() || emptyResponseMessage(modelMode),
    specialistNotes: sanitizeSpecialistNotes(message.specialistNotes),
    ...(suggestedActions.length > 0 && { suggestedActions }),
  };
}

function sanitizeSpecialistNotes(
  value: AgentOrchestratorMessage["specialistNotes"],
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((note) =>
      note.agent === "frontend" ||
      note.agent === "backend" ||
      note.agent === "coding"
    )
    .map((note) => ({
      agent: note.agent,
      title: note.title.trim() || specialistFallbackTitle(note.agent),
      content: note.content.trim(),
    }))
    .filter((note) => note.content.length > 0);
}

function emptyResponseMessage(modelMode: AgentOrchestratorModelMode) {
  return modelMode === "pro-planning"
    ? "DeepSeek Pro planning returned an empty PM summary."
    : modelMode === "coding-planning"
      ? "DeepSeek Coding planning returned an empty PM summary."
    : "The PM summary came back empty.";
}

function buildAssignmentTargets(
  projects: ProjectInterface[],
  tasks: TaskInterface[],
): AgentOrchestratorAssignmentTarget[] {
  return [
    ...projects.map(project => ({
      type: "project" as const,
      id: project.id,
      name: project.name,
      assignedTo: project.assignedTo,
    })),
    ...tasks.map(task => ({
      type: "task" as const,
      id: task.id,
      name: task.name,
      assignedTo: task.assignedTo,
    })),
  ];
}

function sanitizeSuggestedActions(
  value: AgentOrchestratorMessage["suggestedActions"],
  assignmentTargets: AgentOrchestratorAssignmentTarget[],
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const actions: AgentOrchestratorSuggestedAction[] = [];

  for (const item of value) {
    const action =
      sanitizeWorkCreateAction(item) ??
      sanitizeAssignmentAction(item, assignmentTargets);

    if (action) {
      actions.push(action);
    }
  }

  return actions;
}

function sanitizeWorkCreateAction(
  value: unknown,
): AgentOrchestratorWorkCreateAction | null {
  if (!isRecord(value) || value.type !== "work-create") {
    return null;
  }

  const project = sanitizeWorkCreateProject(value.project);

  if (!project) {
    return null;
  }

  if (!Array.isArray(value.tasks) || value.tasks.length === 0) {
    return null;
  }

  const tasks: AgentOrchestratorWorkCreateTaskDraft[] = [];

  for (const item of value.tasks) {
    const task = sanitizeWorkCreateTask(item);

    if (!task) {
      return null;
    }

    tasks.push(task);
  }

  const description = optionalNonEmptyString(value.description);

  return {
    type: "work-create",
    id: `work-create-${crypto.randomUUID()}`,
    title: optionalNonEmptyString(value.title) ?? "Create project and tasks",
    ...(description && { description }),
    project,
    tasks,
  };
}

function sanitizeWorkCreateProject(
  value: unknown,
): AgentOrchestratorWorkCreateProjectDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  const project: AgentOrchestratorWorkCreateProjectDraft = {
    name: "",
  };

  const name = optionalNonEmptyString(value.name);

  if (!name) {
    return null;
  }

  project.name = name;

  const valid =
    assignOptionalString(value, "summary", project) &&
    assignOptionalString(value, "status", project) &&
    assignOptionalString(value, "priority", project) &&
    assignOptionalStringArray(value, "tags", project) &&
    assignOptionalDate(value, "startDate", project) &&
    assignOptionalDate(value, "endDate", project) &&
    assignOptionalNumber(value, "estTime", project) &&
    assignOptionalString(value, "assignedTo", project);

  return valid && createProjectSchema.safeParse(project).success ? project : null;
}

function sanitizeWorkCreateTask(
  value: unknown,
): AgentOrchestratorWorkCreateTaskDraft | null {
  if (!isRecord(value) || hasOwn(value, "project")) {
    return null;
  }

  const name = optionalNonEmptyString(value.name);

  if (!name) {
    return null;
  }

  const task: AgentOrchestratorWorkCreateTaskDraft = { name };

  const valid =
    assignOptionalString(value, "description", task) &&
    assignOptionalString(value, "status", task) &&
    assignOptionalDate(value, "dueDate", task) &&
    assignOptionalString(value, "priority", task) &&
    assignOptionalStringArray(value, "tags", task) &&
    assignOptionalDate(value, "completedOn", task) &&
    assignOptionalNumber(value, "estTime", task) &&
    assignOptionalString(value, "assignedTo", task) &&
    assignOptionalStringArray(value, "acceptanceCriteria", task) &&
    assignOptionalStringArray(value, "testingCriteria", task) &&
    assignOptionalStringArray(value, "implementationPlan", task);

  if (!valid || !createTaskSchema.safeParse(task).success) {
    return null;
  }

  const description = buildWorkCreateTaskDescription(task);

  return {
    ...task,
    ...(description && { description }),
  };
}

function sanitizeAssignmentAction(
  value: unknown,
  assignmentTargets: AgentOrchestratorAssignmentTarget[],
): AgentOrchestratorAssignmentAction | null {
  if (!isRecord(value) || value.type !== "assignment-update") {
    return null;
  }

  if (!Array.isArray(value.assignments) || value.assignments.length === 0) {
    return null;
  }

  const assignments: AgentOrchestratorAssignment[] = [];

  for (const item of value.assignments) {
    const assignment = sanitizeAssignment(item, assignmentTargets);

    if (assignment) {
      assignments.push(assignment);
    }
  }

  if (assignments.length === 0) {
    return null;
  }

  const description = optionalNonEmptyString(value.description);

  return {
    type: "assignment-update",
    id: `assignment-update-${crypto.randomUUID()}`,
    title: optionalNonEmptyString(value.title) ?? "Assign agent work",
    ...(description && { description }),
    assignments,
  };
}

function sanitizeAssignment(
  value: unknown,
  assignmentTargets: AgentOrchestratorAssignmentTarget[],
): AgentOrchestratorAssignment | null {
  if (!isRecord(value)) {
    return null;
  }

  const targetType = parseTargetType(value.targetType);
  const targetId = optionalNonEmptyString(value.targetId);
  const assignedTo = parseAssignee(value.assignedTo);

  if (!targetType || !targetId || !assignedTo) {
    return null;
  }

  const target = assignmentTargets.find(
    item => item.type === targetType && item.id === targetId,
  );

  if (!target || target.assignedTo === assignedTo) {
    return null;
  }

  return {
    targetType,
    targetId,
    targetName: target.name,
    currentAssignedTo: target.assignedTo,
    assignedTo,
  };
}

function parseTargetType(
  value: unknown,
): AgentOrchestratorAssignmentTargetType | null {
  return value === "project" || value === "task" ? value : null;
}

function parseAssignee(value: unknown): AgentAssigneeName | null {
  if (typeof value !== "string") {
    return null;
  }

  return agentAssigneeValues.includes(value as AgentAssigneeName)
    ? value as AgentAssigneeName
    : null;
}

function assignOptionalString(
  source: Record<string, unknown>,
  key: string,
  target: Record<string, unknown>,
) {
  if (!hasOwn(source, key)) {
    return true;
  }

  const value = optionalNonEmptyString(source[key]);

  if (!value) {
    return false;
  }

  target[key] = value;
  return true;
}

function assignOptionalDate(
  source: Record<string, unknown>,
  key: string,
  target: Record<string, unknown>,
) {
  if (!hasOwn(source, key)) {
    return true;
  }

  const value = optionalNonEmptyString(source[key]);

  if (!value || !dateOnlyPattern.test(value)) {
    return false;
  }

  target[key] = value;
  return true;
}

function assignOptionalNumber(
  source: Record<string, unknown>,
  key: string,
  target: Record<string, unknown>,
) {
  if (!hasOwn(source, key)) {
    return true;
  }

  if (typeof source[key] !== "number" || !Number.isFinite(source[key])) {
    return false;
  }

  target[key] = source[key];
  return true;
}

function assignOptionalStringArray(
  source: Record<string, unknown>,
  key: string,
  target: Record<string, unknown>,
) {
  if (!hasOwn(source, key)) {
    return true;
  }

  if (!Array.isArray(source[key]) || source[key].length === 0) {
    return false;
  }

  const values: string[] = [];

  for (const item of source[key]) {
    const value = optionalNonEmptyString(item);

    if (!value) {
      return false;
    }

    values.push(value);
  }

  target[key] = values;
  return true;
}

function optionalNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function latestPromptPreview(messages: AgentOrchestratorMessage[]) {
  const latestUserMessage = [...messages]
    .reverse()
    .find(message => message.role === "user");

  return (latestUserMessage?.content ?? "No prompt").slice(0, 200);
}

function assignmentActionsFrom(
  actions: AgentOrchestratorMessage["suggestedActions"],
) {
  return (actions ?? []).filter(
    (action): action is AgentOrchestratorAssignmentAction =>
      action.type === "assignment-update",
  );
}

function specialistFallbackTitle(
  agent: "frontend" | "backend" | "coding",
) {
  if (agent === "frontend") {
    return "Frontend review";
  }

  if (agent === "backend") {
    return "Backend review";
  }

  return "Coding review";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
