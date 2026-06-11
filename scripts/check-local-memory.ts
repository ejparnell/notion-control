import fs from "node:fs/promises";
import path from "node:path";
import { collectDocumentFiles } from "../src/lib/agents/rag/vector/collect";
import { createIngestionConfig } from "../src/lib/agents/rag/vector/config";
import { SUPPORTED_DOCUMENT_EXTENSIONS } from "../src/lib/agents/rag/vector/types";

type Frontmatter = Record<string, string | string[]>;

type BriefRule = {
  type: "project" | "contract";
  pathPattern: RegExp;
  requiredSections: string[];
  requiredFrontmatter: string[];
};

const cwd = process.cwd();
const memoryRoot = path.join(cwd, "local-memory");
const supportedExtensions = new Set<string>(SUPPORTED_DOCUMENT_EXTENSIONS);
const allowedTopLevelEntries = new Set([
  "README.md",
  "_meta",
  "contracts",
  "personal-notes",
  "projects",
  "technologies",
]);
const maxFileBytes = 1_048_576;

const briefRules: BriefRule[] = [
  {
    type: "project",
    pathPattern: /^local-memory\/projects\/[^/]+\/brief\.md$/,
    requiredFrontmatter: ["type", "name", "aliases", "updated"],
    requiredSections: [
      "Retrieval Keys",
      "Summary",
      "Core Workflows",
      "Current State",
      "Important Boundaries",
      "Related Sources",
    ],
  },
  {
    type: "contract",
    pathPattern: /^local-memory\/contracts\/[^/]+\/brief\.md$/,
    requiredFrontmatter: ["type", "name", "aliases", "effective_date", "updated"],
    requiredSections: [
      "Retrieval Keys",
      "Summary",
      "Scope",
      "Estimate and Billing",
      "Important Boundaries",
      "Acceptance Criteria",
      "Related Sources",
    ],
  },
];

async function main() {
  const failures: string[] = [];

  if (!(await directoryExists(memoryRoot))) {
    failures.push("local-memory/ does not exist.");
    report(failures);
    return;
  }

  const allFiles = await walk(memoryRoot);
  failures.push(...validateTopLevelEntries(allFiles));
  failures.push(...(await validateFileBasics(allFiles)));
  failures.push(...(await validateBriefs(allFiles)));
  failures.push(...(await validateIndexedFiles()));

  report(failures);
}

async function walk(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function validateTopLevelEntries(allFiles: string[]): string[] {
  const failures: string[] = [];
  const topLevelEntries = new Set<string>();

  for (const absolutePath of allFiles) {
    const relativePath = toPosix(path.relative(memoryRoot, absolutePath));
    const [topLevel] = relativePath.split("/");

    if (topLevel) {
      topLevelEntries.add(topLevel);
    }
  }

  for (const entry of topLevelEntries) {
    if (!allowedTopLevelEntries.has(entry)) {
      failures.push(`Unexpected local-memory top-level entry: ${entry}`);
    }
  }

  return failures;
}

async function validateFileBasics(allFiles: string[]): Promise<string[]> {
  const failures: string[] = [];

  for (const absolutePath of allFiles) {
    const relativePath = toRepoPath(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();

    if (!supportedExtensions.has(extension)) {
      failures.push(`${relativePath} uses unsupported extension ${extension || "(none)"}.`);
      continue;
    }

    const stat = await fs.stat(absolutePath);
    if (stat.size > maxFileBytes) {
      failures.push(`${relativePath} is larger than 1 MB and will be skipped by source viewing.`);
    }
  }

  return failures;
}

async function validateBriefs(allFiles: string[]): Promise<string[]> {
  const failures: string[] = [];
  const briefPaths = allFiles
    .map(toRepoPath)
    .filter((relativePath) => relativePath.endsWith("/brief.md"));

  for (const rule of briefRules) {
    const matches = briefPaths.filter((relativePath) => rule.pathPattern.test(relativePath));

    if (matches.length === 0) {
      failures.push(`No ${rule.type} brief matched ${rule.pathPattern.source}.`);
    }
  }

  for (const relativePath of briefPaths) {
    const rule = briefRules.find((candidate) => candidate.pathPattern.test(relativePath));
    if (!rule) {
      failures.push(`${relativePath} is named brief.md but does not match a known brief location.`);
      continue;
    }

    const content = await fs.readFile(path.join(cwd, relativePath), "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    const sections = new Set([...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => match[1]?.trim()));

    for (const key of rule.requiredFrontmatter) {
      if (!hasFrontmatterValue(frontmatter, key)) {
        failures.push(`${relativePath} is missing frontmatter key: ${key}`);
      }
    }

    if (frontmatter.type !== rule.type) {
      failures.push(`${relativePath} frontmatter type should be ${rule.type}.`);
    }

    for (const section of rule.requiredSections) {
      if (!sections.has(section)) {
        failures.push(`${relativePath} is missing section: ## ${section}`);
      }
    }

    const aliases = getAliases(frontmatter);
    if (aliases.length === 0) {
      failures.push(`${relativePath} must define at least one alias.`);
    }

    const bodyLower = body.toLowerCase();
    for (const alias of aliases) {
      if (!bodyLower.includes(alias.toLowerCase())) {
        failures.push(`${relativePath} alias "${alias}" must appear in indexed body text.`);
      }
    }
  }

  return failures;
}

async function validateIndexedFiles(): Promise<string[]> {
  const failures: string[] = [];
  const config = createIngestionConfig();
  const indexedDocuments = await collectDocumentFiles(config);

  for (const document of indexedDocuments) {
    const segments = document.relativePath.split("/");

    if (segments.includes("_meta") || segments.includes("_sources")) {
      failures.push(`${document.relativePath} should not be returned by the indexed document collector.`);
    }
  }

  return failures;
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  if (!content.startsWith("---\n")) {
    return { frontmatter: {}, body: content };
  }

  const end = content.indexOf("\n---", 4);
  if (end === -1) {
    return { frontmatter: {}, body: content };
  }

  const rawFrontmatter = content.slice(4, end).trim();
  const body = content.slice(end + "\n---".length).trimStart();

  return {
    frontmatter: parseYamlSubset(rawFrontmatter),
    body,
  };
}

function parseYamlSubset(rawFrontmatter: string): Frontmatter {
  const result: Frontmatter = {};
  const lines = rawFrontmatter.split("\n");
  let currentListKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      continue;
    }

    const listItem = /^\s*-\s+(.+)$/.exec(line);
    if (listItem?.[1] && currentListKey) {
      const existing = result[currentListKey];
      const list = Array.isArray(existing) ? existing : [];
      list.push(unquote(listItem[1].trim()));
      result[currentListKey] = list;
      continue;
    }

    const keyValue = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!keyValue?.[1]) {
      currentListKey = null;
      continue;
    }

    const key = keyValue[1];
    const value = keyValue[2]?.trim() ?? "";
    currentListKey = value ? null : key;
    result[key] = value ? unquote(value) : [];
  }

  return result;
}

function hasFrontmatterValue(frontmatter: Frontmatter, key: string): boolean {
  const value = frontmatter[key];

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value?.trim());
}

function getAliases(frontmatter: Frontmatter): string[] {
  const aliases = frontmatter.aliases;

  if (Array.isArray(aliases)) {
    return aliases.filter((alias) => alias.trim());
  }

  if (typeof aliases === "string" && aliases.trim()) {
    return aliases.split(",").map((alias) => alias.trim()).filter(Boolean);
  }

  return [];
}

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

async function directoryExists(directory: string): Promise<boolean> {
  try {
    const stat = await fs.stat(directory);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

function toRepoPath(absolutePath: string): string {
  return toPosix(path.relative(cwd, absolutePath));
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function report(failures: string[]): void {
  if (failures.length === 0) {
    console.log("Local-memory check passed.");
    return;
  }

  console.error("Local-memory check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Local-memory check failed.";
  console.error(message);
  process.exitCode = 1;
});
