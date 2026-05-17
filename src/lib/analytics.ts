import type { ReviewPost, ReviewStatus, RiskLevel } from "./types";
import { getOverallRisk } from "./aiMock";

export function countBy<T extends string>(items: T[]) {
  return items.reduce(
    (counts, item) => {
      counts[item] = (counts[item] ?? 0) + 1;
      return counts;
    },
    {} as Record<T, number>
  );
}

export function getAnalytics(posts: ReviewPost[]) {
  const postsBySubreddit = countBy(posts.map((post) => post.subreddit));
  const statusCounts = countBy(posts.map((post) => post.status));
  const riskCounts = countBy(posts.map((post) => getOverallRisk(post)));
  const averageRelevance =
    posts.length === 0
      ? 0
      : posts.reduce((sum, post) => sum + post.classification.relevance_score, 0) /
        posts.length;
  const resourceRequestOpportunityCount = posts.filter((post) =>
    /checklist|resource|setup checklist|love a checklist/i.test(post.body)
  ).length;

  return {
    postsBySubreddit,
    statusCounts: statusCounts as Record<ReviewStatus, number>,
    riskCounts: riskCounts as Record<RiskLevel, number>,
    averageRelevance,
    resourceRequestOpportunityCount
  };
}
