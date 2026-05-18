import type { MockPost } from "./types";

export type ImportFormat = "json" | "csv";

export type ImportValidationResult =
  | {
      ok: true;
      batchId: string;
      posts: MockPost[];
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };

const requiredFields = ["id", "title", "body"] as const;
const privateDataPatterns = [
  { label: "email address", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: "phone number", pattern: /(?:\+?\d[\s().-]?){8,}\d/ },
  { label: "payment or card number", pattern: /\b(?:\d[ -]*?){13,19}\b/ },
  { label: "shipping address marker", pattern: /\b(?:shipping address|home address|street address)\b/i }
];

function normaliseText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"' && inQuotes) {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = cells[index] ?? "";
      return row;
    }, {});
  });
}

function parseImportText(text: string, format: ImportFormat) {
  if (format === "csv") {
    return parseCsv(text);
  }

  const parsed = JSON.parse(text) as unknown;
  return Array.isArray(parsed) ? parsed : [parsed];
}

function hasPrivateData(post: MockPost) {
  const text = `${post.title} ${post.excerpt} ${post.body}`;
  return privateDataPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);
}

export function validateManualImportRows(
  rows: unknown[],
  options: {
    existingIds?: string[];
    batchId?: string;
  } = {}
): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const existingIds = new Set(options.existingIds ?? []);
  const seenIds = new Set<string>();
  const posts: MockPost[] = [];

  rows.forEach((row, rowIndex) => {
    if (!row || typeof row !== "object") {
      errors.push(`Row ${rowIndex + 1} is not an object.`);
      return;
    }

    const record = row as Record<string, unknown>;
    const missing = requiredFields.filter((field) => !normaliseText(record[field]));

    if (missing.length > 0) {
      errors.push(`Row ${rowIndex + 1} is missing required fields: ${missing.join(", ")}.`);
      return;
    }

    const id = normaliseText(record.id);
    if (existingIds.has(id) || seenIds.has(id)) {
      errors.push(`Row ${rowIndex + 1} has duplicate id: ${id}.`);
      return;
    }

    const post: MockPost = {
      id,
      subreddit: normaliseText(record.subreddit) || normaliseText(record.channel) || "manual-import",
      title: normaliseText(record.title),
      excerpt: normaliseText(record.excerpt) || normaliseText(record.body).slice(0, 160),
      body: normaliseText(record.body),
      matchedKeyword: normaliseText(record.matchedKeyword) || normaliseText(record.keyword) || "manual import",
      createdAt: normaliseText(record.createdAt) || new Date().toISOString().slice(0, 10)
    };

    const privateDataMatches = hasPrivateData(post);
    if (privateDataMatches.length > 0) {
      errors.push(
        `Row ${rowIndex + 1} appears to contain private data: ${privateDataMatches.join(", ")}.`
      );
      return;
    }

    seenIds.add(id);
    posts.push(post);
  });

  if (posts.length === 0 && errors.length === 0) {
    errors.push("Import did not contain any rows.");
  }

  if (posts.length > 0) {
    warnings.push("Manual import accepted mock/public examples only; do not import private customer data.");
  }

  return errors.length > 0
    ? { ok: false, errors, warnings }
    : {
        ok: true,
        batchId: options.batchId ?? `manual-${new Date().toISOString()}`,
        posts,
        warnings
      };
}

export function validateManualImportText(
  text: string,
  options: {
    format: ImportFormat;
    existingIds?: string[];
    maxBytes?: number;
    batchId?: string;
  }
): ImportValidationResult {
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
  const bytes = new TextEncoder().encode(text).length;

  if (bytes > maxBytes) {
    return {
      ok: false,
      errors: [`Import file is too large. Maximum size is ${Math.floor(maxBytes / (1024 * 1024))} MB.`],
      warnings: []
    };
  }

  try {
    return validateManualImportRows(parseImportText(text, options.format), {
      existingIds: options.existingIds,
      batchId: options.batchId
    });
  } catch (error) {
    return {
      ok: false,
      errors: [`Could not parse ${options.format.toUpperCase()} import: ${(error as Error).message}`],
      warnings: []
    };
  }
}
