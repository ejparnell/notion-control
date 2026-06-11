'use client';

import { useState } from 'react';
import { z } from 'zod';
import { cn } from '@/lib/helper/client';
import {
  PRIORITY_MAP,
  STATUS_MAP,
  agentAssigneeValues,
  priorityValues,
  statusValues,
  tagValues,
  type AgentAssigneeName,
  type PriorityName,
  type StatusName,
  type TagName,
} from '@/lib/constants';
import { taskSchema, type TaskValidation } from '@/lib/validations/tasks';

const taskFormSchema = taskSchema.omit({ id: true });

export type TaskFormSubmitValues = z.infer<typeof taskFormSchema>;

type ProjectOption = {
  id: string;
  name: string;
};

type TaskFormInitialValues = Partial<
  Omit<TaskValidation, 'dueDate' | 'completedOn' | 'estTime'> & {
    dueDate: Date | string;
    completedOn: Date | string;
    estTime: number | string;
  }
>;

type TaskFormProps = {
  initialTask?: TaskFormInitialValues;
  projectId?: string;
  projectOptions?: ProjectOption[];
  submitLabel?: string;
  onSubmit: (values: TaskFormSubmitValues) => void | Promise<void>;
};

type FormErrors = Partial<Record<keyof TaskFormSubmitValues, string>>;

const defaultStatus: StatusName = STATUS_MAP.BACKLOG.name;
const defaultPriority: PriorityName = PRIORITY_MAP.MEDIUM.name;
const labelClassName = 'block text-sm font-medium text-foreground';
const fieldClassName =
  'mt-2 block w-full rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-soft focus:border-primary focus:ring-2 focus:ring-primary/25';
const errorClassName = 'mt-2 text-sm font-medium text-danger';

function dateInputValue(value: Date | string | undefined) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const parsedDate = new Date(value);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return value;
}

function listTextValue(value: string[] | undefined) {
  return value?.join('\n') ?? '';
}

function textToList(value: string) {
  const items = value
    .split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0);

  return items.length > 0 ? items : undefined;
}

export default function TaskForm({
  initialTask,
  projectId,
  projectOptions,
  submitLabel = 'Save task',
  onSubmit,
}: TaskFormProps) {
  const [name, setName] = useState(initialTask?.name ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [status, setStatus] = useState<StatusName>(
    initialTask?.status ?? defaultStatus,
  );
  const [priority, setPriority] = useState<PriorityName>(
    initialTask?.priority ?? defaultPriority,
  );
  const [tags, setTags] = useState<TagName[]>(initialTask?.tags ?? []);
  const [project, setProject] = useState(
    projectId ?? initialTask?.project ?? '',
  );
  const [dueDate, setDueDate] = useState(
    dateInputValue(initialTask?.dueDate),
  );
  const [completedOn, setCompletedOn] = useState(
    dateInputValue(initialTask?.completedOn),
  );
  const [estTime, setEstTime] = useState(
    initialTask?.estTime == null ? '' : String(initialTask.estTime),
  );
  const [assignedTo, setAssignedTo] = useState<AgentAssigneeName | ''>(
    initialTask?.assignedTo ?? '',
  );
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(
    listTextValue(initialTask?.acceptanceCriteria),
  );
  const [testingCriteria, setTestingCriteria] = useState(
    listTextValue(initialTask?.testingCriteria),
  );
  const [implementationPlan, setImplementationPlan] = useState(
    listTextValue(initialTask?.implementationPlan),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showProjectSelect = Boolean(projectOptions);

  const toggleTag = (tag: TagName) => {
    setTags(currentTags =>
      currentTags.includes(tag)
        ? currentTags.filter(currentTag => currentTag !== tag)
        : [...currentTags, tag],
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const projectValue = project.trim() || undefined;

    if (showProjectSelect && !projectValue) {
      setErrors({ project: 'Project is required' });
      return;
    }

    const values = {
      name,
      description: description.trim() || undefined,
      status,
      priority,
      tags: tags.length > 0 ? tags : undefined,
      project: projectValue,
      dueDate: dueDate.trim() || undefined,
      completedOn: completedOn.trim() || undefined,
      estTime: estTime.trim() || undefined,
      assignedTo: assignedTo || undefined,
      acceptanceCriteria: textToList(acceptanceCriteria),
      testingCriteria: textToList(testingCriteria),
      implementationPlan: textToList(implementationPlan),
    };

    const result = taskFormSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors: FormErrors = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof TaskFormSubmitValues;
        fieldErrors[field] = issue.message;
      });

      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit(result.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-6 rounded-xl border border-border bg-surface p-6 text-foreground shadow-sm"
    >
      <div>
        <label htmlFor="name" className={labelClassName}>
          Task name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Enter task name"
          className={fieldClassName}
        />

        {errors.name && (
          <p className={errorClassName}>{errors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className={labelClassName}
        >
          Description
        </label>

        <textarea
          id="description"
          name="description"
          rows={4}
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder="Describe the implementation goal and context"
          className={cn(fieldClassName, 'resize-y')}
        />

        {errors.description && (
          <p className={errorClassName}>{errors.description}</p>
        )}
      </div>

      {showProjectSelect && (
        <div>
          <label
            htmlFor="project"
            className={labelClassName}
          >
            Project
          </label>

          <select
            id="project"
            name="project"
            value={project}
            onChange={event => setProject(event.target.value)}
            className={fieldClassName}
          >
            <option value="">Select a project</option>
            {projectOptions?.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          {errors.project && (
            <p className={errorClassName}>{errors.project}</p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="status"
            className={labelClassName}
          >
            Status
          </label>

          <select
            id="status"
            name="status"
            value={status}
            onChange={event => setStatus(event.target.value as StatusName)}
            className={fieldClassName}
          >
            {statusValues.map(statusValue => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>

          {errors.status && (
            <p className={errorClassName}>{errors.status}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="priority"
            className={labelClassName}
          >
            Priority
          </label>

          <select
            id="priority"
            name="priority"
            value={priority}
            onChange={event => setPriority(event.target.value as PriorityName)}
            className={fieldClassName}
          >
            {priorityValues.map(priorityValue => (
              <option key={priorityValue} value={priorityValue}>
                {priorityValue}
              </option>
            ))}
          </select>

          {errors.priority && (
            <p className={errorClassName}>{errors.priority}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="dueDate"
            className={labelClassName}
          >
            Due date
          </label>

          <input
            id="dueDate"
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={event => setDueDate(event.target.value)}
            className={fieldClassName}
          />

          {errors.dueDate && (
            <p className={errorClassName}>{errors.dueDate}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="completedOn"
            className={labelClassName}
          >
            Completed on
          </label>

          <input
            id="completedOn"
            name="completedOn"
            type="date"
            value={completedOn}
            onChange={event => setCompletedOn(event.target.value)}
            className={fieldClassName}
          />

          {errors.completedOn && (
            <p className={errorClassName}>{errors.completedOn}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="estTime"
          className={labelClassName}
        >
          Estimated time
        </label>

        <input
          id="estTime"
          name="estTime"
          type="number"
          min="0"
          step="1"
          value={estTime}
          onChange={event => setEstTime(event.target.value)}
          placeholder="Minutes"
          className={fieldClassName}
        />

        {errors.estTime && (
          <p className={errorClassName}>{errors.estTime}</p>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Tags</legend>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {tagValues.map(tag => (
            <label
              key={tag}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-muted transition hover:border-primary/60 hover:bg-primary-soft/40 hover:text-foreground"
            >
              <input
                type="checkbox"
                checked={tags.includes(tag)}
                onChange={() => toggleTag(tag)}
                className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-primary"
              />

              <span>{tag}</span>
            </label>
          ))}
        </div>

        {errors.tags && (
          <p className={errorClassName}>{errors.tags}</p>
        )}
      </fieldset>

      <div>
        <label
          htmlFor="assignedTo"
          className={labelClassName}
        >
          Assigned to
        </label>

        <select
          id="assignedTo"
          name="assignedTo"
          value={assignedTo}
          onChange={event =>
            setAssignedTo(event.target.value as AgentAssigneeName | '')
          }
          className={fieldClassName}
        >
          <option value="">Unassigned</option>
          {agentAssigneeValues.map(assignee => (
            <option key={assignee} value={assignee}>
              {assignee}
            </option>
          ))}
        </select>

        {errors.assignedTo && (
          <p className={errorClassName}>{errors.assignedTo}</p>
        )}
      </div>

      <div className="grid gap-4">
        <DevTicketTextarea
          id="acceptanceCriteria"
          label="Acceptance criteria"
          value={acceptanceCriteria}
          onChange={setAcceptanceCriteria}
          error={errors.acceptanceCriteria}
        />

        <DevTicketTextarea
          id="testingCriteria"
          label="Testing criteria"
          value={testingCriteria}
          onChange={setTestingCriteria}
          error={errors.testingCriteria}
        />

        <DevTicketTextarea
          id="implementationPlan"
          label="Implementation plan"
          value={implementationPlan}
          onChange={setImplementationPlan}
          error={errors.implementationPlan}
        />
      </div>

      <div className="flex justify-end border-t border-border pt-5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90 hover:shadow-glow-strong disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-glow"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function DevTicketTextarea({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: keyof Pick<
    TaskFormSubmitValues,
    'acceptanceCriteria' | 'testingCriteria' | 'implementationPlan'
  >;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>

      <textarea
        id={id}
        name={id}
        rows={4}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="One item per line"
        className={cn(fieldClassName, 'resize-y')}
      />

      {error && (
        <p className={errorClassName}>{error}</p>
      )}
    </div>
  );
}
