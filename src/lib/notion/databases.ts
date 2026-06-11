/**
 * databases.ts
 *
 * Generic helper for querying any Notion database.
 *
 * Note: The installed @notionhq/client SDK renames `databases.query` to
 * `dataSources.query` in its TypeScript types, but the underlying Notion REST
 * API still uses the `/v1/databases/{id}/query` endpoint. We call it directly
 * via `notion.request()` to avoid the broken SDK wrapper.
 */

import { notion } from "./client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints/common";

type SortOption =
  | { property: string; direction: "ascending" | "descending" }
  | { timestamp: "created_time" | "last_edited_time"; direction: "ascending" | "descending" };

export type DataSourceQueryOptions = {
  filter?: object;
  sorts?: SortOption[];
  page_size?: number;
};

type QueryResponse = {
  object: "list";
  results: Array<{ object: string; [key: string]: unknown }>;
  has_more: boolean;
  next_cursor: string | null;
};

/**
 * Query a Notion database and return all matching pages as typed objects.
 * Automatically handles pagination — fetches every page of results.
 *
 * @param databaseId  The Notion database ID (UUID).
 * @param transform   Maps a raw Notion PageObjectResponse to your model `T`.
 * @param options     Optional filter, sorts, and page_size (max 100 per request).
 *
 * @example
 * const posts = await queryDataSource(
 *   process.env.NOTION_DATABASE_ID_POSTS!,
 *   transformPost,
 *   { sorts: [{ property: "Date", direction: "descending" }] }
 * );
 */
export async function queryDataSource<T>(
  databaseId: string,
  transform: (page: PageObjectResponse) => T,
  options: DataSourceQueryOptions = {}
): Promise<T[]> {
  const results: T[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response: QueryResponse = await notion.request<QueryResponse>({
      path: `databases/${databaseId}/query`,
      method: "post",
      body: {
        start_cursor: cursor,
        page_size: options.page_size ?? 100,
        ...(options.filter && { filter: options.filter }),
        ...(options.sorts && { sorts: options.sorts }),
      },
    });

    for (const item of response.results) {
      if (item.object === "page" && "properties" in item) {
        results.push(transform(item as PageObjectResponse));
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return results;
}
