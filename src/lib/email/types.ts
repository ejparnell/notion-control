export type GmailMessageFormat = "full" | "metadata" | "minimal" | "raw";

export interface GmailAuthOptions {
  accessToken: string;
  userId?: string;
}

export interface GmailClientOptions extends GmailAuthOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface GmailListMessagesOptions {
  q?: string;
  labelIds?: string[];
  maxResults?: number;
  pageToken?: string;
  includeSpamTrash?: boolean;
}

export interface GmailGetMessageOptions {
  format?: GmailMessageFormat;
  metadataHeaders?: string[];
}

export interface GmailQueryInboxOptions extends GmailListMessagesOptions {
  includeThreads?: boolean;
}

export interface GmailApiHeader {
  name: string;
  value: string;
}

export interface GmailApiMessagePartBody {
  attachmentId?: string;
  size?: number;
  data?: string;
}

export interface GmailApiMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailApiHeader[];
  body?: GmailApiMessagePartBody;
  parts?: GmailApiMessagePart[];
}

export interface GmailApiMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailApiMessagePart;
  sizeEstimate?: number;
  raw?: string;
}

export interface GmailApiThread {
  id: string;
  snippet?: string;
  historyId?: string;
  messages?: GmailApiMessage[];
}

export interface GmailApiLabel {
  id: string;
  name: string;
  type?: "system" | "user";
  messageListVisibility?: "show" | "hide";
  labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
  color?: {
    textColor?: string;
    backgroundColor?: string;
  };
}

export interface GmailMessageListItem {
  id: string;
  threadId: string;
}

export interface GmailMessageListResult {
  messages: GmailMessageListItem[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface GmailLabelListResult {
  labels: GmailApiLabel[];
}

export interface GmailHeaderMap {
  [lowercaseName: string]: string[];
}

export interface GmailAttachmentRef {
  partId?: string;
  attachmentId?: string;
  filename: string;
  mimeType?: string;
  size?: number;
  contentId?: string;
  disposition?: string;
}

export interface GmailMessageBody {
  text?: string;
  html?: string;
}

export interface ParsedGmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  internalDateIso?: string;
  sizeEstimate?: number;
  headers: GmailHeaderMap;
  headerList: GmailApiHeader[];
  subject?: string;
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  date?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  body: GmailMessageBody;
  attachments: GmailAttachmentRef[];
  raw?: string;
}

export interface ParsedGmailThread {
  id: string;
  snippet?: string;
  historyId?: string;
  labelIds: string[];
  messages: ParsedGmailMessage[];
}

export interface GmailInboxQueryResult {
  messages: ParsedGmailMessage[];
  threads?: ParsedGmailThread[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}
