import { describe, expect, it } from "vitest";
import {
  SOURCE_CONNECTOR_LABELS,
  mapSourceRecordsToMockPosts,
  parseSourceConnectorImportText,
  validateSourceConnectorRows
} from "../src/lib/sourceConnectors";

describe("source connectors", () => {
  it("normalizes supported public-source records into review-queue posts", () => {
    const result = validateSourceConnectorRows([
      {
        connector: "manual_url",
        title: "Manual evidence page",
        body: "Public article about workflow risk signals.",
        url: "https://example.com/article",
        keyword: "workflow risk",
        sourceName: "Example News",
        authorAlias: "Reporter"
      },
      {
        connector: "rss_feed",
        title: "RSS advisory item",
        body: "Public feed item with safety context.",
        url: "https://example.org/feed/item-1",
        sourceName: "Safety Feed"
      },
      {
        connector: "open_web_result",
        title: "Open web search result",
        excerpt: "Public search result summary.",
        url: "https://forum.example.net/thread/1"
      },
      {
        connector: "reputation_result",
        title: "Domain reputation warning",
        body: "Low trust score reported by a third-party reputation source.",
        url: "https://reputation.example/check/domain",
        riskLabel: "possible_scam",
        trustScoreText: "low trust"
      },
      {
        connector: "deep_web_public",
        title: "Indexed public database page",
        body: "Publicly accessible deep web page discovered by an analyst.",
        url: "https://records.example.gov/item/abc"
      }
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const posts = mapSourceRecordsToMockPosts(result.records, "source-connectors-test");
    expect(posts).toHaveLength(5);
    expect(posts[0]).toMatchObject({
      subreddit: "manual-url",
      author: "Reporter",
      matchedKeyword: "workflow risk"
    });
    expect(posts[3].body).toContain("Risk label: possible_scam");
    expect(posts[3].body).toContain("Trust score: low trust");
    expect(posts[4].matchedKeyword).toBe("deep web public");
  });

  it("parses JSON arrays and wrapper objects from source connector imports", () => {
    const result = parseSourceConnectorImportText(
      JSON.stringify({
        sources: [
          {
            connector: "open_web_result",
            title: "Public forum result",
            body: "A public forum page.",
            url: "https://forum.example.com/public"
          }
        ]
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records[0].connector).toBe("open_web_result");
    expect(result.records[0].sourcePlatform).toBe("open-web");
  });

  it("rejects private data, payment/transaction language, and unsupported source URLs", () => {
    const result = validateSourceConnectorRows([
      {
        connector: "manual_url",
        title: "Bad private record",
        body: "Email analyst@example.com and use card 4111 1111 1111 1111.",
        url: "https://example.com/private"
      },
      {
        connector: "manual_url",
        title: "Bad transaction record",
        body: "Click checkout and pay bitcoin to complete the order.",
        url: "https://example.com/checkout"
      },
      {
        connector: "manual_url",
        title: "Bad protocol",
        body: "Unsupported URL protocol.",
        url: "ftp://example.com/file"
      }
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toContain("private data");
    expect(result.errors.join(" ")).toContain("transaction or outreach workflow");
    expect(result.errors.join(" ")).toContain("http, https, or allowlisted onion URL");
  });

  it("requires explicit onion allowlist entries and keeps onion records read-only", () => {
    const blocked = validateSourceConnectorRows([
      {
        connector: "onion_allowlist",
        title: "Unapproved onion source",
        body: "Public page text only.",
        url: "http://notallowedexample.onion/page"
      }
    ]);

    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.errors[0]).toContain("not on the onion allowlist");

    const allowed = validateSourceConnectorRows(
      [
        {
          connector: "onion_allowlist",
          title: "Approved onion source",
          body: "Public page text only; no login or forms.",
          url: "http://allowedexample.onion/page"
        }
      ],
      { onionAllowlist: ["allowedexample.onion"] }
    );

    expect(allowed.ok).toBe(true);
    if (!allowed.ok) return;
    expect(allowed.records[0].safetyFlags).toContain("read_only");
    expect(allowed.records[0].safetyFlags).toContain("no_login_no_forms_no_transactions");
  });

  it("exposes labels for all planned connector tools", () => {
    expect(Object.keys(SOURCE_CONNECTOR_LABELS)).toEqual([
      "manual_url",
      "rss_feed",
      "open_web_result",
      "reputation_result",
      "deep_web_public",
      "onion_allowlist"
    ]);
  });
});
