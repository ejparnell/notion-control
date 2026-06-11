"use client";

import { useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/helper/client";
import {
  STATUS_MAP,
  PRIORITY_MAP,
  agentAssigneeValues,
  statusValues,
  priorityValues,
  tagValues,
  type AgentAssigneeName,
  type StatusName,
  type PriorityName,
  type TagName,
} from "@/lib/constants";
import { projectSchema, type ProjectValidation } from "@/lib/validations/projects";

const projectFormSchema = projectSchema.omit({ id: true });

export type ProjectFormSubmitValues = z.infer<typeof projectFormSchema>;

type ProjectFormInitialValues = Partial<
  Omit<ProjectValidation, "startDate" | "endDate" | "estTime"> & {
    startDate: Date | string;
    endDate: Date | string;
    estTime: number | string;
  }
>;

type ProjectFormProps = {
  initialProject?: ProjectFormInitialValues;
  submitLabel?: string;
  onSubmit: (values: ProjectFormSubmitValues) => void | Promise<void>;
};
type FormErrors = Partial<Record<keyof ProjectFormSubmitValues, string>>;

const defaultStatus: StatusName = STATUS_MAP.BACKLOG.name;
const defaultPriority: PriorityName = PRIORITY_MAP.MEDIUM.name;
const labelClassName = "block text-sm font-medium text-foreground";
const fieldClassName =
  "mt-2 block w-full rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-soft focus:border-primary focus:ring-2 focus:ring-primary/25";
const errorClassName = "mt-2 text-sm font-medium text-danger";

function dateInputValue(value: Date | string | undefined) {
  if (!value) {
    return "";
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

export default function ProjectForm({
  initialProject,
  submitLabel = "Save project",
  onSubmit,
}: ProjectFormProps) {
  const [name, setName] = useState(initialProject?.name ?? "");
  const [summary, setSummary] = useState(initialProject?.summary ?? "");

  const [status, setStatus] = useState<StatusName>(
    initialProject?.status ?? defaultStatus
  );

  const [priority, setPriority] = useState<PriorityName>(
    initialProject?.priority ?? defaultPriority
  );

  const [tags, setTags] = useState<TagName[]>(initialProject?.tags ?? []);
  const [startDate, setStartDate] = useState(
    dateInputValue(initialProject?.startDate)
  );
  const [endDate, setEndDate] = useState(
    dateInputValue(initialProject?.endDate)
  );
  const [estTime, setEstTime] = useState(
    initialProject?.estTime == null ? "" : String(initialProject.estTime)
  );
  const [assignedTo, setAssignedTo] = useState<AgentAssigneeName | "">(
    initialProject?.assignedTo ?? ""
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTag = (tag: TagName) => {
    setTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const values = {
      name,
      summary: summary.trim() || undefined,
      status,
      priority,
      tags: tags.length > 0 ? tags : undefined,
      startDate: startDate.trim() || undefined,
      endDate: endDate.trim() || undefined,
      estTime: estTime.trim() || undefined,
      assignedTo: assignedTo || undefined,
    };

    const result = projectFormSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors: FormErrors = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ProjectFormSubmitValues;
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
        <label
          htmlFor="name"
          className={labelClassName}
        >
          Project name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter project name"
          className={fieldClassName}
        />

        {errors.name && (
          <p className={errorClassName}>{errors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="summary"
          className={labelClassName}
        >
          Summary
        </label>

        <textarea
          id="summary"
          name="summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={4}
          placeholder="Add a short project summary"
          className={cn(fieldClassName, "resize-none")}
        />

        {errors.summary && (
          <p className={errorClassName}>{errors.summary}</p>
        )}
      </div>

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
            onChange={(event) => setStatus(event.target.value as StatusName)}
            className={fieldClassName}
          >
            {statusValues.map((statusValue) => (
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
            onChange={(event) =>
              setPriority(event.target.value as PriorityName)
            }
            className={fieldClassName}
          >
            {priorityValues.map((priorityValue) => (
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

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Tags</legend>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {tagValues.map((tag) => (
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="startDate"
            className={labelClassName}
          >
            Start date
          </label>

          <input
            id="startDate"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={fieldClassName}
          />

          {errors.startDate && (
            <p className={errorClassName}>{errors.startDate}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="endDate"
            className={labelClassName}
          >
            End date
          </label>

          <input
            id="endDate"
            name="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={fieldClassName}
          />

          {errors.endDate && (
            <p className={errorClassName}>{errors.endDate}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="estTime"
            className={labelClassName}
          >
            Est. time
          </label>

          <input
            id="estTime"
            name="estTime"
            type="number"
            min="0"
            step="0.25"
            value={estTime}
            onChange={(event) => setEstTime(event.target.value)}
            placeholder="Minutes"
            className={fieldClassName}
          />

          {errors.estTime && (
            <p className={errorClassName}>{errors.estTime}</p>
          )}
        </div>
      </div>

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
          onChange={(event) =>
            setAssignedTo(event.target.value as AgentAssigneeName | "")
          }
          className={fieldClassName}
        >
          <option value="">Unassigned</option>
          {agentAssigneeValues.map((assignee) => (
            <option key={assignee} value={assignee}>
              {assignee}
            </option>
          ))}
        </select>

        {errors.assignedTo && (
          <p className={errorClassName}>{errors.assignedTo}</p>
        )}
      </div>

      <div className="flex justify-end border-t border-border pt-5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90 hover:shadow-glow-strong disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-glow"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
