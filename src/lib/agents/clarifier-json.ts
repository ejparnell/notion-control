export function parseAssistantResponseJson(rawContent: string): unknown | null {
  const trimmedContent = rawContent.trim();

  try {
    return JSON.parse(trimmedContent);
  } catch {
    const fencedJson = extractFencedJson(trimmedContent);

    if (fencedJson) {
      try {
        return JSON.parse(fencedJson);
      } catch {
        return extractFirstJsonObject(trimmedContent);
      }
    }

    return extractFirstJsonObject(trimmedContent);
  }
}

export function isJsonLikeContent(content: string) {
  const trimmedContent = content.trim();

  return (
    trimmedContent.startsWith('{') ||
    trimmedContent.startsWith('```') ||
    parseAssistantResponseJson(trimmedContent) !== null
  );
}

function extractFencedJson(content: string) {
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(content);

  return fenceMatch?.[1]?.trim() ?? null;
}

function extractFirstJsonObject(content: string): unknown | null {
  const startIndex = content.indexOf('{');

  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < content.length; index += 1) {
    const char = content[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    }

    if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        try {
          return JSON.parse(content.slice(startIndex, index + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}
