/**
 * src/lib/notion/index.ts
 *
 * Barrel export — import everything from "@/lib/notion".
 *
 * Usage:
 *   import { queryDataSource, getPage, getPageBlocks, extractTitle } from "@/lib/notion";
 *
 * To add a new database:
 *   1. Add NOTION_DATABASE_ID_<NAME>= to .env.local
 *   2. Create src/lib/notion/db/<name>.ts
 *   3. Call queryDataSource with your transform function
 *   4. Export typed helpers from that file
 */

// Low-level singleton client (use sparingly; prefer the helpers below)
export { notion } from "./client";

// Database querying
export { queryDataSource } from "./databases";
export type { DataSourceQueryOptions } from "./databases";

// Page & block fetching
export { getPage, getPageBlocks } from "./pages";

// Type helpers & extractors
export type { PageObjectResponse } from "./types";
export {
  extractTitle,
  extractRichText,
  extractNumber,
  extractSelect,
  extractMultiSelect,
  extractStatus,
  extractDate,
  extractCheckbox,
  extractUrl,
  extractEmail,
  extractPhone,
} from "./types";
