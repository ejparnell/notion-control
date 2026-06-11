/**
 * pages.ts
 *
 * Helpers for retrieving individual Notion pages and their block content.
 * These are database-agnostic utilities usable from any per-database file.
 */

import { notion } from "./client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints/common";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints/blocks";

/**
 * Retrieve a single Notion page by its ID.
 * Returns null if the page is not found or is inaccessible.
 */
export async function getPage(pageId: string): Promise<PageObjectResponse | null> {
  try {
    const response = await notion.pages.retrieve({ page_id: pageId });
    if ("properties" in response) {
      return response as PageObjectResponse;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieve all child blocks for a page (or any block), with auto-pagination.
 * Only returns full BlockObjectResponse items (skips partial responses).
 */
export async function getPageBlocks(blockId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if ("type" in block) {
        blocks.push(block as BlockObjectResponse);
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return blocks;
}
