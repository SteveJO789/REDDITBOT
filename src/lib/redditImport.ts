import type {
  MockPost,
  RedditCommentData,
  RedditListing,
  RedditListingChild,
  RedditPostData
} from "./types";

function normaliseText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getCreatedAt(value: unknown) {
  const createdUtc = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(createdUtc) || createdUtc <= 0) {
    return new Date().toISOString();
  }

  return new Date(createdUtc * 1000).toISOString();
}

function normalisePermalink(value: unknown) {
  const permalink = normaliseText(value);
  if (!permalink) {
    return "";
  }

  if (/^https?:\/\//i.test(permalink)) {
    return permalink;
  }

  return `https://www.reddit.com${permalink.startsWith("/") ? permalink : `/${permalink}`}`;
}

function buildContent(child: RedditListingChild) {
  const data = child.data;
  const title = normaliseText(data.title);
  const body = normaliseText("body" in data ? data.body : undefined);
  const selftext = normaliseText("selftext" in data ? data.selftext : undefined);

  if (child.kind === "t1") {
    return body || selftext;
  }

  return [title, selftext || body].filter(Boolean).join("\n\n").trim();
}

function buildTitle(child: RedditListingChild, content: string) {
  const data = child.data;
  const title = normaliseText(data.title);
  if (title) {
    return title;
  }

  if (child.kind === "t1") {
    const author = normaliseText(data.author);
    return author ? `Comment by u/${author}` : "Reddit comment";
  }

  return content ? content.slice(0, 120) : "Reddit post";
}

function buildStableId(child: RedditListingChild, index: number) {
  const data = child.data;
  const id = normaliseText(data.id);
  if (id) {
    return id;
  }

  const permalink = normaliseText(data.permalink);
  if (permalink) {
    return permalink.split("/").filter(Boolean).at(-1) ?? `reddit-${child.kind}-${index + 1}`;
  }

  return `reddit-${child.kind}-${index + 1}`;
}

export function isRedditListing(value: unknown): value is RedditListing {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.kind === "Listing" && !!record.data && Array.isArray((record.data as Record<string, unknown>).children);
}

export function mapRedditListingToMockPosts(listing: RedditListing): MockPost[] {
  return listing.data.children
    .filter((child): child is RedditListingChild => !!child && typeof child === "object" && !!child.data)
    .map((child, index) => {
      const data = child.data as RedditPostData | RedditCommentData;
      const content = buildContent(child);
      const title = buildTitle(child, content);
      const createdAt = getCreatedAt(data.created_utc);
      const permalink = normalisePermalink(data.permalink);
      const author = normaliseText(data.author);
      const subreddit = normaliseText(data.subreddit) || "reddit-import";

      return {
        id: buildStableId(child, index),
        author: author || undefined,
        subreddit,
        title,
        excerpt: content ? content.slice(0, 160) : title.slice(0, 160),
        body: content,
        content,
        matchedKeyword: "reddit listing import",
        createdAt,
        url: permalink || undefined
      };
    });
}
