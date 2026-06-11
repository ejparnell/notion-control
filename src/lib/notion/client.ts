import { Client } from "@notionhq/client";

const apiKey = process.env.NOTION_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing NOTION_API_KEY environment variable. " +
      "Add it to your .env.local file."
  );
}

/**
 * Singleton Notion client — import this wherever you need direct API access.
 * Prefer the higher-level helpers in databases.ts / pages.ts for most use cases.
 *
 * Pinned to Notion-Version 2022-06-28: the SDK default (2025-09-03+) dropped
 * support for the databases/{id}/query endpoint in favour of data-sources, but
 * that REST endpoint is not yet publicly available. 2022-06-28 is the latest
 * stable version that supports database queries.
 */
export const notion = new Client({ auth: apiKey, notionVersion: "2022-06-28" });
