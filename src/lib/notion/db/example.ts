/**
 * src/lib/notion/db/example.ts
 *
 * EXAMPLE — copy this file and rename it for each new database you add.
 *
 * Steps to add a new database:
 *   1. Duplicate this file as src/lib/notion/db/<your-name>.ts
 *   2. Add NOTION_DATABASE_ID_<YOUR_NAME>= to .env.local (fill in the UUID)
 *   3. Define your model type (MyItem below)
 *   4. Write a transform function that maps a PageObjectResponse to your model
 *   5. Export a typed query function that calls queryDataSource
 */

import { queryDataSource } from "../databases";
import {
  extractTitle,
  extractRichText,
  extractSelect,
  extractDate,
  extractCheckbox,
  type PageObjectResponse,
} from "../types";

// ─── 1. Define your model ─────────────────────────────────────────────────────

export type ExampleItem = {
  id: string;
  title: string;
  description: string;
  status: string | null;
  date: string | null;
  published: boolean;
};

// ─── 2. Write a transform function ───────────────────────────────────────────

function transformExampleItem(page: PageObjectResponse): ExampleItem {
  const props = page.properties;

  return {
    id: page.id,
    // Map each property by its exact name in your Notion database
    title: extractTitle(props["Name"]),
    description: extractRichText(props["Description"]),
    status: extractSelect(props["Status"]),
    date: extractDate(props["Date"]),
    published: extractCheckbox(props["Published"]),
  };
}

// ─── 3. Export typed query functions ─────────────────────────────────────────

const DATABASE_ID = process.env.NOTION_DATABASE_ID_EXAMPLE;

/**
 * Fetch all published example items, sorted by date descending.
 * Remove the filter to fetch all items regardless of Published status.
 */
export async function getExampleItems(): Promise<ExampleItem[]> {
  if (!DATABASE_ID) {
    throw new Error("Missing NOTION_DATABASE_ID_EXAMPLE in .env.local");
  }

  return queryDataSource(DATABASE_ID, transformExampleItem, {
    filter: {
      property: "Published",
      checkbox: { equals: true },
    },
    sorts: [{ property: "Date", direction: "descending" }],
  });
}
