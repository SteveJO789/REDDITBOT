const redditBaseUrl = "https://www.reddit.com";
const redditUserAgent = "OperationEmpathy/1.0.0 (Internal Read-Only Listening Tool)";

function normaliseText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getCreatedAt(value) {
  const createdUtc = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(createdUtc) || createdUtc <= 0) {
    return new Date().toISOString();
  }

  return new Date(createdUtc * 1000).toISOString();
}

function normalisePermalink(value) {
  const permalink = normaliseText(value);
  if (!permalink) {
    return "";
  }

  if (/^https?:\/\//i.test(permalink)) {
    return permalink;
  }

  return `${redditBaseUrl}${permalink.startsWith("/") ? permalink : `/${permalink}`}`;
}

function isRedditListing(value) {
  return (
    value &&
    typeof value === "object" &&
    value.kind === "Listing" &&
    value.data &&
    Array.isArray(value.data.children)
  );
}

function buildContent(child) {
  const data = child.data ?? {};
  const title = normaliseText(data.title);
  const body = normaliseText(data.body);
  const selftext = normaliseText(data.selftext);

  if (child.kind === "t1") {
    return body || selftext;
  }

  return [title, selftext || body].filter(Boolean).join("\n\n").trim();
}

function buildTitle(child, content) {
  const data = child.data ?? {};
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

function buildStableId(child, index) {
  const data = child.data ?? {};
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

export function mapRedditListingToPosts(listing, matchedKeyword = "reddit read-only import") {
  if (!isRedditListing(listing)) {
    return [];
  }

  return listing.data.children
    .filter((child) => child && typeof child === "object" && child.data)
    .map((child, index) => {
      const data = child.data;
      const content = buildContent(child);
      const title = buildTitle(child, content);
      const author = normaliseText(data.author);
      const permalink = normalisePermalink(data.permalink);
      const subreddit = normaliseText(data.subreddit) || "reddit-import";

      return {
        id: buildStableId(child, index),
        author: author || undefined,
        subreddit,
        title,
        excerpt: content ? content.slice(0, 160) : title.slice(0, 160),
        body: content,
        content,
        matchedKeyword,
        createdAt: getCreatedAt(data.created_utc),
        url: permalink || undefined
      };
    });
}

async function fetchRedditListing(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": redditUserAgent
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Reddit Listing JSON: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function fetchSubredditPosts(subreddit, limit = 25) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);
  const listing = await fetchRedditListing(
    `${redditBaseUrl}/r/${encodeURIComponent(subreddit)}/new.json?limit=${safeLimit}`
  );

  return mapRedditListingToPosts(listing, subreddit);
}

export async function searchRedditPosts(query, limit = 25) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);
  const params = new URLSearchParams({
    q: query,
    limit: String(safeLimit),
    type: "link",
    sort: "new"
  });
  const listing = await fetchRedditListing(`${redditBaseUrl}/search.json?${params.toString()}`);

  return mapRedditListingToPosts(listing, query);
}
