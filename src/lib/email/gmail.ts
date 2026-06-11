/**
 * Server-only Gmail REST helpers for querying a user's mailbox.
 *
 * Callers provide a user-scoped OAuth access token. The recommended read scope
 * for message bodies and threads is https://www.googleapis.com/auth/gmail.readonly.
 */
import "server-only";

import type {
  GmailApiHeader,
  GmailApiMessage,
  GmailApiMessagePart,
  GmailApiThread,
  GmailAttachmentRef,
  GmailClientOptions,
  GmailGetMessageOptions,
  GmailHeaderMap,
  GmailInboxQueryResult,
  GmailLabelListResult,
  GmailListMessagesOptions,
  GmailMessageBody,
  GmailMessageListResult,
  GmailQueryInboxOptions,
  ParsedGmailMessage,
  ParsedGmailThread,
} from "./types";

const GMAIL_API_BASE_URL = "https://gmail.googleapis.com/gmail/v1";
const DEFAULT_USER_ID = "me";
const DEFAULT_INBOX_LABELS = ["INBOX"];
const DEFAULT_MAX_RESULTS = 10;
const MAX_RESULTS_LIMIT = 500;

type QueryValue = string | number | boolean | string[] | undefined;

interface GmailApiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export class GmailApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly details?: GmailApiErrorResponse
  ) {
    super(message);
    this.name = "GmailApiError";
  }
}

export class GmailClient {
  private readonly accessToken: string;
  private readonly userId: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GmailClientOptions) {
    if (!options.accessToken) {
      throw new Error("A Gmail OAuth access token is required.");
    }

    this.accessToken = options.accessToken;
    this.userId = options.userId ?? DEFAULT_USER_ID;
    this.baseUrl = options.baseUrl ?? GMAIL_API_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async listMessages(
    options: GmailListMessagesOptions = {}
  ): Promise<GmailMessageListResult> {
    const result = await this.request<Partial<GmailMessageListResult>>("messages", {
      maxResults: clampMaxResults(options.maxResults),
      pageToken: options.pageToken,
      q: options.q,
      labelIds: options.labelIds,
      includeSpamTrash: options.includeSpamTrash,
    });

    return {
      messages: result.messages ?? [],
      nextPageToken: result.nextPageToken,
      resultSizeEstimate: result.resultSizeEstimate,
    };
  }

  async getMessage(
    messageId: string,
    options: GmailGetMessageOptions = {}
  ): Promise<GmailApiMessage> {
    return this.request<GmailApiMessage>(`messages/${messageId}`, {
      format: options.format ?? "full",
      metadataHeaders: options.metadataHeaders,
    });
  }

  async getParsedMessage(
    messageId: string,
    options: GmailGetMessageOptions = {}
  ): Promise<ParsedGmailMessage> {
    const message = await this.getMessage(messageId, options);
    return parseGmailMessage(message);
  }

  async getThread(
    threadId: string,
    options: GmailGetMessageOptions = {}
  ): Promise<GmailApiThread> {
    return this.request<GmailApiThread>(`threads/${threadId}`, {
      format: options.format ?? "full",
      metadataHeaders: options.metadataHeaders,
    });
  }

  async getParsedThread(
    threadId: string,
    options: GmailGetMessageOptions = {}
  ): Promise<ParsedGmailThread> {
    const thread = await this.getThread(threadId, options);
    return parseGmailThread(thread);
  }

  async listLabels(): Promise<GmailLabelListResult> {
    const result = await this.request<Partial<GmailLabelListResult>>("labels");

    return {
      labels: result.labels ?? [],
    };
  }

  async queryInbox(
    options: GmailQueryInboxOptions = {}
  ): Promise<GmailInboxQueryResult> {
    const labelIds = options.labelIds ?? DEFAULT_INBOX_LABELS;
    const listResult = await this.listMessages({
      ...options,
      labelIds,
      maxResults: options.maxResults ?? DEFAULT_MAX_RESULTS,
    });

    const messages = await Promise.all(
      listResult.messages.map((message) => this.getParsedMessage(message.id))
    );

    if (!options.includeThreads) {
      return {
        messages,
        nextPageToken: listResult.nextPageToken,
        resultSizeEstimate: listResult.resultSizeEstimate,
      };
    }

    const uniqueThreadIds = Array.from(
      new Set(listResult.messages.map((message) => message.threadId))
    );
    const threads = await Promise.all(
      uniqueThreadIds.map((threadId) => this.getParsedThread(threadId))
    );

    return {
      messages,
      threads,
      nextPageToken: listResult.nextPageToken,
      resultSizeEstimate: listResult.resultSizeEstimate,
    };
  }

  private async request<T>(
    path: string,
    query: Record<string, QueryValue> = {}
  ): Promise<T> {
    const url = new URL(
      `${this.baseUrl}/users/${encodeURIComponent(this.userId)}/${path}`
    );
    appendQueryParams(url.searchParams, query);

    const response = await this.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const details = await readErrorResponse(response);
      const apiMessage = details?.error?.message;
      throw new GmailApiError(
        `Gmail API error ${response.status}: ${apiMessage ?? response.statusText}`,
        response.status,
        response.statusText,
        details
      );
    }

    return (await response.json()) as T;
  }
}

export function createGmailClient(options: GmailClientOptions): GmailClient {
  return new GmailClient(options);
}

export async function queryGmailInbox(
  options: GmailClientOptions & GmailQueryInboxOptions
): Promise<GmailInboxQueryResult> {
  const { accessToken, userId, baseUrl, fetchImpl, ...queryOptions } = options;
  return createGmailClient({ accessToken, userId, baseUrl, fetchImpl }).queryInbox(
    queryOptions
  );
}

export function parseGmailThread(thread: GmailApiThread): ParsedGmailThread {
  const messages = (thread.messages ?? []).map(parseGmailMessage);
  const labelIds = Array.from(
    new Set(messages.flatMap((message) => message.labelIds))
  );

  return {
    id: thread.id,
    snippet: thread.snippet,
    historyId: thread.historyId,
    labelIds,
    messages,
  };
}

export function parseGmailMessage(message: GmailApiMessage): ParsedGmailMessage {
  const headerList = message.payload?.headers ?? [];
  const headers = buildHeaderMap(headerList);
  const body = extractMessageBody(message.payload);

  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds ?? [],
    snippet: message.snippet,
    historyId: message.historyId,
    internalDate: message.internalDate,
    internalDateIso: toIsoDate(message.internalDate),
    sizeEstimate: message.sizeEstimate,
    headers,
    headerList,
    subject: getHeader(headers, "subject"),
    from: getHeader(headers, "from"),
    to: getHeader(headers, "to"),
    cc: getHeader(headers, "cc"),
    bcc: getHeader(headers, "bcc"),
    replyTo: getHeader(headers, "reply-to"),
    date: getHeader(headers, "date"),
    messageId: getHeader(headers, "message-id"),
    inReplyTo: getHeader(headers, "in-reply-to"),
    references: getHeader(headers, "references"),
    body,
    attachments: extractAttachments(message.payload),
    raw: message.raw ? decodeBase64Url(message.raw) : undefined,
  };
}

export function getHeader(
  headers: GmailHeaderMap,
  name: string
): string | undefined {
  return headers[name.toLowerCase()]?.[0];
}

export function buildHeaderMap(headers: GmailApiHeader[]): GmailHeaderMap {
  return headers.reduce<GmailHeaderMap>((acc, header) => {
    const key = header.name.toLowerCase();
    acc[key] = [...(acc[key] ?? []), header.value];
    return acc;
  }, {});
}

export function extractMessageBody(
  payload: GmailApiMessagePart | undefined
): GmailMessageBody {
  const textParts: string[] = [];
  const htmlParts: string[] = [];

  walkMessageParts(payload, (part) => {
    if (!part.body?.data || isAttachmentPart(part)) {
      return;
    }

    const mimeType = normalizeMimeType(part.mimeType);
    const decoded = decodeBase64Url(part.body.data);

    if (mimeType === "text/plain") {
      textParts.push(decoded);
    }

    if (mimeType === "text/html") {
      htmlParts.push(decoded);
    }
  });

  return {
    text: joinBodyParts(textParts),
    html: joinBodyParts(htmlParts),
  };
}

export function extractAttachments(
  payload: GmailApiMessagePart | undefined
): GmailAttachmentRef[] {
  const attachments: GmailAttachmentRef[] = [];

  walkMessageParts(payload, (part) => {
    if (!isAttachmentPart(part)) {
      return;
    }

    const headers = buildHeaderMap(part.headers ?? []);
    attachments.push({
      partId: part.partId,
      attachmentId: part.body?.attachmentId,
      filename: part.filename ?? "",
      mimeType: part.mimeType,
      size: part.body?.size,
      contentId: getHeader(headers, "content-id"),
      disposition: getHeader(headers, "content-disposition"),
    });
  });

  return attachments;
}

function walkMessageParts(
  part: GmailApiMessagePart | undefined,
  visit: (part: GmailApiMessagePart) => void
): void {
  if (!part) {
    return;
  }

  visit(part);

  for (const child of part.parts ?? []) {
    walkMessageParts(child, visit);
  }
}

function isAttachmentPart(part: GmailApiMessagePart): boolean {
  return Boolean(part.filename || part.body?.attachmentId);
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  return Buffer.from(padded, "base64").toString("utf8");
}

function normalizeMimeType(mimeType: string | undefined): string {
  return mimeType?.toLowerCase().split(";")[0].trim() ?? "";
}

function joinBodyParts(parts: string[]): string | undefined {
  if (parts.length === 0) {
    return undefined;
  }

  return parts.join("\n\n").trim();
}

function toIsoDate(epochMs: string | undefined): string | undefined {
  if (!epochMs) {
    return undefined;
  }

  const value = Number(epochMs);
  if (!Number.isFinite(value)) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function clampMaxResults(maxResults: number | undefined): number | undefined {
  if (maxResults === undefined) {
    return undefined;
  }

  return Math.max(1, Math.min(Math.trunc(maxResults), MAX_RESULTS_LIMIT));
}

function appendQueryParams(
  searchParams: URLSearchParams,
  query: Record<string, QueryValue>
): void {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
      continue;
    }

    searchParams.set(key, String(value));
  }
}

async function readErrorResponse(
  response: Response
): Promise<GmailApiErrorResponse | undefined> {
  try {
    return (await response.json()) as GmailApiErrorResponse;
  } catch {
    return undefined;
  }
}
