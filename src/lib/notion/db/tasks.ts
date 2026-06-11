/**
 * src/lib/notion/db/tasks.ts
 *
 * Read helpers for the Tasks database.
 * Database ID env var: NOTION_DATABASE_ID_TASKS
 */
import { queryDataSource } from "../databases";
import {
  extractTitle,
  extractSelect,
  extractStatus,
  extractDate,
  extractNumber,
  type PageObjectResponse,
} from "../types";

export type Task = {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  dueDate: string | null;
  completedOn: string | null;
  project: string | null;
  estTime: number | null;
};

function transformTask(page: PageObjectResponse): Task {
  const props = page.properties;
  return {
    id: page.id,
    name: props["Task name"] ? extractTitle(props["Task name"]) : "",
    status: props["Status"] ? extractStatus(props["Status"]) : null,
    priority: props["Priority"] ? extractSelect(props["Priority"]) : null,
    dueDate: props["Due"] ? extractDate(props["Due"]) : null,
    completedOn: props["Completed on"] ? extractDate(props["Completed on"]) : null,
    project: props["Project"] ? extractSelect(props["Project"]) : null,
    estTime: props["Est time"] ? extractNumber(props["Est time"]) : null,
  };
}

const DATABASE_ID = process.env.NOTION_DATABASE_ID_TASKS;

/** Fetch all tasks, sorted by due date ascending. */
export async function getTasks(): Promise<Task[]> {
  if (!DATABASE_ID) {
    throw new Error("Missing NOTION_DATABASE_ID_TASKS in .env.local");
  }
  return queryDataSource(DATABASE_ID, transformTask, {
    sorts: [{ property: "Due", direction: "ascending" }],
  });
}
