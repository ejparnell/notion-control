/**
 * types.ts
 *
 * Shared helpers for extracting typed values from raw Notion property objects.
 * Import the helpers you need in each per-database file (src/lib/notion/db/*.ts)
 * to transform raw API responses into clean, typed app models.
 *
 * Extend this file as you encounter new property types.
 */

import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints/common";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints/common";

// ─── Narrow property union helpers ───────────────────────────────────────────
// The SDK exposes a wide union for property values; these narrow aliases make
// the extractor functions below easier to read.
type SelectProperty = Extract<PropertyValue, { type: "select" }>;
type MultiSelectProperty = Extract<PropertyValue, { type: "multi_select" }>;

// ─── Re-export useful Notion SDK types ───────────────────────────────────────

export type { PageObjectResponse };

// ─── Property value extractors ───────────────────────────────────────────────

type Properties = PageObjectResponse["properties"];
type PropertyValue = Properties[string];

/** Extract plain text from a title property. */
export function extractTitle(prop: PropertyValue | undefined): string {
  if (!prop || prop.type !== "title") return "";
  return prop.title.map((t: RichTextItemResponse) => t.plain_text).join("");
}

/** Extract plain text from a rich_text property. */
export function extractRichText(prop: PropertyValue | undefined): string {
  if (!prop || prop.type !== "rich_text") return "";
  return prop.rich_text
    .map((t: RichTextItemResponse) => t.plain_text)
    .join("");
}

/** Extract a number property value (or null if empty). */
export function extractNumber(prop: PropertyValue | undefined): number | null {
  if (!prop || prop.type !== "number") return null;
  return prop.number;
}

/** Extract a single select option name (or null if empty). */
export function extractSelect(prop: PropertyValue | undefined): string | null {
  if (!prop || prop.type !== "select") return null;
  return (prop as SelectProperty).select?.name ?? null;
}

/** Extract multi-select option names as a string array. */
export function extractMultiSelect(prop: PropertyValue | undefined): string[] {
  if (!prop || prop.type !== "multi_select") return [];
  return (prop as MultiSelectProperty).multi_select.map((o) => o.name);
}

/** Extract an ISO 8601 date string from a date property (or null if empty). */
export function extractDate(prop: PropertyValue | undefined): string | null {
  if (!prop || prop.type !== "date") return null;
  return prop.date?.start ?? null;
}

/** Extract a checkbox boolean value. */
export function extractCheckbox(prop: PropertyValue | undefined): boolean {
  if (!prop || prop.type !== "checkbox") return false;
  return prop.checkbox;
}

/** Extract a status option name (or null if empty). */
export function extractStatus(prop: PropertyValue | undefined): string | null {
  if (!prop || prop.type !== "status") return null;
  return prop.status?.name ?? null;
}

/** Extract a URL string (or null if empty). */
export function extractUrl(prop: PropertyValue | undefined): string | null {
  if (!prop || prop.type !== "url") return null;
  return prop.url;
}

/** Extract an email string (or null if empty). */
export function extractEmail(prop: PropertyValue | undefined): string | null {
  if (!prop || prop.type !== "email") return null;
  return prop.email;
}

/** Extract a phone number string (or null if empty). */
export function extractPhone(prop: PropertyValue | undefined): string | null {
  if (!prop || prop.type !== "phone_number") return null;
  return prop.phone_number;
}
