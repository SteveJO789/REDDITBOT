import type { MockPost } from "./types";

export type SourceConnectorKind =
  | "manual_url"
  | "rss_feed"
  | "open_web_result"
  | "reputation_result"
  | "deep_web_public"
  | "onion_allowlist";

export type SourceConnectorRecord = {
  id: string;
  connector: SourceConnectorKind;
  sourcePlatform: string;
  sourceName: string;
  title: string;
  excerpt: string;
  body: string;
  keyword: string;
  url?: string;
  authorAlias?: string;
  createdAt: string;
  riskLabel?: string;
  trustScoreText?: string;
  notes?: string;
  safetyFlags: string[];
};

export type SourceConnectorValidationResult =
  | { ok: true; records: SourceConnectorRecord[]; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

export const SOURCE_CONNECTOR_LABELS: Record<SourceConnectorKind, string> = {
  manual_url: "Manual URL Evidence",
  rss_feed: "RSS / Atom Feed Item",
  open_web_result: "Open Web Result",
  reputation_result: "Reputation Scanner Result",
  deep_web_public: "Deep Web Public Page",
  onion_allowlist: "Onion Allowlist Page"
};

const SOURCE_PLATFORM_BY_CONNECTOR: Record<SourceConnectorKind, string> = {
  manual_url: "manual-url",
  rss_feed: "rss-feed",
  open_web_result: "open-web",
  reputation_result: "reputation-source",
  deep_web_public: "deep-web-public",
  onion_allowlist: "onion-allowlist"
};

const DEFAULT_KEYWORD_BY_CONNECTOR: Record<SourceConnectorKind, string> = {
  manual_url: "manual url",
  rss_feed: "rss feed",
  open_web_result: "open web",
  reputation_result: "reputation result",
  deep_web_public: "deep web public",
  onion_allowlist: "onion allowlist"
};

const privateDataPatterns = [
  { label: "email address", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: "payment or card number", pattern: /\b(?:\d[ -]*?){13,19}\b/ },
  { label: "shipping address marker", pattern: /\b(?:shipping address|home address|street address)\b/i },
  { label: "phone number", pattern: /(?:\+?\d[\s().-]?){8,}\d/ }
];

const transactionOrOutreachPatterns = [
  /\bcheckout\b/i,
  /\badd to cart\b/i,
  /\bpay(?:ment)?\b/i,
  /\bbitcoin\b/i,
  /\bcrypto\b/i,
  /\border\b/i,
  /\bshipping\b/i,
  /\bcontact (?:vendor|seller|operator)\b/i,
  /\bdm\b/i,
  /\btelegram\b/i,
  /\bwhatsapp\b/i
];

function normaliseText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseConnector(value: unknown): SourceConnectorKind | "" {
  const connector = normaliseText(value);
  return Object.prototype.hasOwnProperty.call(SOURCE_CONNECTOR_LABELS, connector)
    ? (connector as SourceConnectorKind)
    : "";
}

function safeHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function getUrlHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isSupportedUrl(url: string) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildSafetyFlags(connector: SourceConnectorKind) {
  const flags = ["read_only", "no_outreach", "no_account_automation"];
  if (connector === "onion_allowlist") {
    flags.push("no_login_no_forms_no_transactions");
  }
  if (connector === "reputation_result") {
    flags.push("third_party_reputation_signal");
  }
  return flags;
}

function findPrivateDataLabels(text: string) {
  return privateDataPatterns.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

function hasTransactionOrOutreachText(text: string) {
  return transactionOrOutreachPatterns.some((pattern) => pattern.test(text));
}

function parseRowsAndOptions(text: string, options: { existingIds?: string[]; onionAllowlist?: string[] }) {
  const parsed = JSON.parse(text) as unknown;
  let rows: unknown[] = [];
  let onionAllowlist = options.onionAllowlist ?? [];

  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.onionAllowlist)) {
      onionAllowlist = record.onionAllowlist.filter((host): host is string => typeof host === "string");
    }
    if (Array.isArray(record.sources)) rows = record.sources;
    else if (Array.isArray(record.records)) rows = record.records;
    else if (Array.isArray(record.items)) rows = record.items;
    else rows = [record];
  }

  return { rows, onionAllowlist };
}

export function validateSourceConnectorRows(
  rows: unknown[],
  options: { existingIds?: string[]; onionAllowlist?: string[] } = {}
): SourceConnectorValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const records: SourceConnectorRecord[] = [];
  const seenIds = new Set(options.existingIds ?? []);
  const onionAllowlist = new Set((options.onionAllowlist ?? []).map((host) => host.toLowerCase()));

  rows.forEach((row, rowIndex) => {
    if (!row || typeof row !== "object") {
      errors.push(`Row ${rowIndex + 1} is not an object.`);
      return;
    }

    const input = row as Record<string, unknown>;
    const connector = parseConnector(input.connector ?? input.sourceType ?? input.type);
    if (!connector) {
      errors.push(`Row ${rowIndex + 1} has unsupported connector.`);
      return;
    }

    const title = normaliseText(input.title);
    const providedExcerpt = normaliseText(input.excerpt);
    const body = normaliseText(input.body) || normaliseText(input.description) || normaliseText(input.summary) || providedExcerpt;
    const excerpt = providedExcerpt || body.slice(0, 160) || title.slice(0, 160);
    const url = normaliseText(input.url) || normaliseText(input.evidenceUrl) || normaliseText(input.link);
    const sourceName = normaliseText(input.sourceName) || normaliseText(input.feedTitle) || SOURCE_CONNECTOR_LABELS[connector];
    const keyword = normaliseText(input.keyword) || normaliseText(input.matchedKeyword) || DEFAULT_KEYWORD_BY_CONNECTOR[connector];
    const riskLabel = normaliseText(input.riskLabel) || normaliseText(input.risk_label) || undefined;
    const trustScoreText = normaliseText(input.trustScoreText) || normaliseText(input.trust_score_text) || undefined;
    const notes = normaliseText(input.notes) || undefined;
    const authorAlias = normaliseText(input.authorAlias) || normaliseText(input.author) || normaliseText(input.username) || undefined;

    if (!title || !body) {
      errors.push(`Row ${rowIndex + 1} is missing required fields: title, body.`);
      return;
    }

    if (!isSupportedUrl(url)) {
      errors.push(`Row ${rowIndex + 1} URL must be an http, https, or allowlisted onion URL.`);
      return;
    }

    if (url.includes(".onion")) {
      if (connector !== "onion_allowlist") {
        errors.push(`Row ${rowIndex + 1} onion URL must use the onion_allowlist connector.`);
        return;
      }
      const host = getUrlHost(url);
      if (!onionAllowlist.has(host)) {
        errors.push(`Row ${rowIndex + 1} onion host ${host || "unknown"} is not on the onion allowlist.`);
        return;
      }
    }

    const searchableText = [title, excerpt, body, sourceName, keyword, riskLabel, trustScoreText, notes].filter(Boolean).join(" ");
    const privateDataLabels = findPrivateDataLabels(searchableText);
    if (privateDataLabels.length > 0) {
      errors.push(`Row ${rowIndex + 1} appears to contain private data: ${privateDataLabels.join(", ")}.`);
      return;
    }

    if (hasTransactionOrOutreachText(searchableText)) {
      errors.push(`Row ${rowIndex + 1} appears to describe a transaction or outreach workflow. Keep source connectors read-only.`);
      return;
    }

    const id = normaliseText(input.id) || `source-${connector}-${safeHash(`${connector}|${url}|${title}`)}`;
    if (seenIds.has(id)) {
      errors.push(`Row ${rowIndex + 1} has duplicate id: ${id}.`);
      return;
    }

    seenIds.add(id);
    records.push({
      id,
      connector,
      sourcePlatform: SOURCE_PLATFORM_BY_CONNECTOR[connector],
      sourceName,
      title,
      excerpt,
      body,
      keyword,
      url: url || undefined,
      authorAlias,
      createdAt: normaliseText(input.createdAt) || new Date().toISOString(),
      riskLabel,
      trustScoreText,
      notes,
      safetyFlags: buildSafetyFlags(connector)
    });
  });

  if (records.length > 0) {
    warnings.push("Source connector import is read-only evidence intake; do not use it for outreach, login, forms, or transactions.");
  }

  return errors.length > 0 ? { ok: false, errors, warnings } : { ok: true, records, warnings };
}

export function parseSourceConnectorImportText(
  text: string,
  options: { existingIds?: string[]; onionAllowlist?: string[] } = {}
): SourceConnectorValidationResult {
  try {
    const { rows, onionAllowlist } = parseRowsAndOptions(text, options);
    if (rows.length === 0) {
      return { ok: false, errors: ["Source connector import did not contain any rows."], warnings: [] };
    }
    return validateSourceConnectorRows(rows, { ...options, onionAllowlist });
  } catch (error) {
    return { ok: false, errors: [`Could not parse source connector JSON: ${(error as Error).message}`], warnings: [] };
  }
}

export function mapSourceRecordsToMockPosts(records: SourceConnectorRecord[], importBatchId?: string): MockPost[] {
  void importBatchId;
  return records.map((record) => {
    const metadataLines = [
      `Source type: ${SOURCE_CONNECTOR_LABELS[record.connector]}`,
      `Source name: ${record.sourceName}`,
      `Safety flags: ${record.safetyFlags.join(", ")}`,
      record.riskLabel ? `Risk label: ${record.riskLabel}` : "",
      record.trustScoreText ? `Trust score: ${record.trustScoreText}` : "",
      record.notes ? `Notes: ${record.notes}` : ""
    ].filter(Boolean);

    return {
      id: record.id,
      author: record.authorAlias,
      subreddit: record.sourcePlatform,
      title: record.title,
      excerpt: record.excerpt,
      body: [record.body, "", ...metadataLines].join("\n").trim(),
      content: record.body,
      matchedKeyword: record.keyword,
      createdAt: record.createdAt,
      url: record.url
    };
  });
}
