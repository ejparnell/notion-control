/**
 * src/lib/notion/db/projects.ts
 *
 * Read helpers for the Projects database.
 * Database ID env var: NOTION_DATABASE_ID_PROJECTS
 */
import { queryDataSource } from "../databases";
import { APIErrorCode, APIResponseError } from "@notionhq/client";
import {
  extractTitle,
  extractRichText,
  extractSelect,
  extractStatus,
  extractDate,
  extractNumber,
  type PageObjectResponse,
} from "../types";
import { notion } from "../client";
import { getTasks } from "./tasks";
import type { Task } from "./tasks";

export type Project = {
  id: string;
  name: string;
  summary: string;
  status: string | null;
  priority: string | null;
  tags: string | null;
  startDate: string | null;
  estTime: number | null;
};

function transformProject(page: PageObjectResponse): Project {
  const props = page.properties;
  return {
    id: page.id,
    name: extractTitle(props["Project name"]),
    summary: extractRichText(props["Summary"]),
    status: extractStatus(props["Status"]),
    priority: extractSelect(props["Priority"]),
    tags: extractSelect(props["Tags"]),
    startDate: extractDate(props["Dates"]),
    estTime: extractNumber(props["Est time"]),
  };
}

const DATABASE_ID = process.env.NOTION_DATABASE_ID_PROJECTS;

/** Fetch all projects, sorted by name ascending. */
export async function getProjects(): Promise<Project[]> {
  if (!DATABASE_ID) {
    throw new Error("Missing NOTION_DATABASE_ID_PROJECTS in .env.local");
  }
  return queryDataSource(DATABASE_ID, transformProject, {
    sorts: [{ property: "Project name", direction: "ascending" }],
  });
}

/** Fetch a single project by its ID. */
export async function getProject(id: string | null | undefined): Promise<Project | null> {
  if (!DATABASE_ID) {
    throw new Error("Missing NOTION_DATABASE_ID_PROJECTS in .env.local");
  }

  const pageId = id?.trim();
  if (!pageId) return null;

  try {
    const page = await notion.pages.retrieve({ page_id: pageId });

    if (!("properties" in page)) {
      return null;
    }

    return transformProject(page as PageObjectResponse);
  } catch (error) {
    if (
      APIResponseError.isAPIResponseError(error) &&
      error.code === APIErrorCode.ObjectNotFound
    ) {
      return null;
    }

    throw error;
  }
}

/** Fetch all projects along with their associated tasks. */
export async function getProjectsWithTasks(): Promise<(Project & { tasks: Task[] })[]> {
  const projects = await getProjects();
  const projectsWithTasks = await Promise.all(
    projects.map(async (project) => {
      const tasks = await getTasks();
      return { ...project, tasks };
    })
  );
  return projectsWithTasks;
}

export type CreateProjectInput = {
  name: string;
  summary?: string;
  status?: string | null;
  priority?: string | null;
  tags?: string | null;
  startDate?: string | null;
  estTime?: number | null;
};

function buildProjectProperties(input: CreateProjectInput) {
  const properties: Record<string, unknown> = {
    "Project name": {
      title: [
        {
          text: {
            content: input.name,
          },
        },
      ],
    },
  };

  if (input.summary) {
    properties["Summary"] = {
      rich_text: [
        {
          text: {
            content: input.summary,
          },
        },
      ],
    };
  }

  if (input.status) {
    properties["Status"] = {
      status: {
        name: input.status,
      },
    };
  }

  if (input.priority) {
    properties["Priority"] = {
      select: {
        name: input.priority,
      },
    };
  }

  if (input.tags) {
    properties["Tags"] = {
      select: {
        name: input.tags,
      },
    };
  }

  if (input.startDate) {
    properties["Dates"] = {
      date: {
        start: input.startDate,
      },
    };
  }

  if (typeof input.estTime === "number") {
    properties["Est time"] = {
      number: input.estTime,
    };
  }

  return properties;
}

/** Create a new project in Notion. */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  if (!DATABASE_ID) {
    throw new Error("Missing NOTION_DATABASE_ID_PROJECTS in .env.local");
  }

  const name = input.name.trim();

  if (!name) {
    throw new Error("Project name is required");
  }

  const page = await notion.request<PageObjectResponse>({
    path: "pages",
    method: "post",
    body: {
      parent: {
        type: "database_id",
        database_id: DATABASE_ID,
      },
      properties: buildProjectProperties({
        ...input,
        name,
      }),
    },
  });

  return transformProject(page);
}
