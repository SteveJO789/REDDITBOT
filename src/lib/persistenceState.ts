import { checkCompliance, createInitialReviewPosts, createReviewPostFromPost } from "./aiMock";
import type { AuditEvent, MockPost, ResourceStatus, ReviewPost, ReviewStatus } from "./types";

export const DASHBOARD_STORAGE_KEY = "operation-empathy-dashboard-v1";

export type SavedPostOverride = {
  id: string;
  status: ReviewStatus;
  draftReply: string;
  resourceStatus?: ResourceStatus;
  auditEvents?: AuditEvent[];
};

export type SavedDashboardState =
  | SavedPostOverride[]
  | {
      overrides: SavedPostOverride[];
      importedPosts?: MockPost[];
    };

export function applySavedOverrides(posts: ReviewPost[], overrides: SavedPostOverride[]) {
  const savedById = new Map(overrides.map((post) => [post.id, post]));

  return posts.map((post) => {
    const savedPost = savedById.get(post.id);
    if (!savedPost) {
      return post;
    }

    return {
      ...post,
      status: savedPost.status,
      resourceStatus: savedPost.resourceStatus ?? post.resourceStatus,
      draftReply: savedPost.draftReply,
      compliance: checkCompliance(savedPost.draftReply),
      auditEvents: savedPost.auditEvents ?? post.auditEvents
    };
  });
}

export function hydrateSavedPosts(savedState: SavedDashboardState | null | undefined) {
  const initial = createInitialReviewPosts();

  if (!savedState) {
    return initial;
  }

  const importedPosts = Array.isArray(savedState)
    ? []
    : (savedState.importedPosts ?? []).map((post) =>
        createReviewPostFromPost(post, post.id.startsWith("manual-") ? post.id : "local-import")
      );
  const overrides = Array.isArray(savedState) ? savedState : savedState.overrides;

  return applySavedOverrides([...initial, ...importedPosts], overrides);
}

export function createSavedDashboardState(posts: ReviewPost[]): Exclude<SavedDashboardState, SavedPostOverride[]> {
  const initialIds = new Set(createInitialReviewPosts().map((post) => post.id));

  return {
    overrides: posts.map((post) => ({
      id: post.id,
      status: post.status,
      resourceStatus: post.resourceStatus,
      draftReply: post.draftReply,
      auditEvents: post.auditEvents
    })),
    importedPosts: posts
      .filter((post) => !initialIds.has(post.id))
      .map((post) => ({
        id: post.id,
        subreddit: post.subreddit,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        matchedKeyword: post.matchedKeyword,
        createdAt: post.createdAt
      }))
  };
}

export function parseSavedDashboardState(raw: string | null) {
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as SavedDashboardState;
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (!parsed || !Array.isArray(parsed.overrides)) {
    return null;
  }

  return parsed;
}
