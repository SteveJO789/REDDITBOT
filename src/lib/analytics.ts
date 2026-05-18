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
  const painPointCounts = countBy(posts.map((post) => post.matchedKeyword));
  const objectionCounts = countBy(
    posts
      .flatMap((post) => post.classification.red_flags_detected)
      .filter((flag) => /promotion|buying signal|low-quality|weakness|numbness|chest pain|trouble breathing/i.test(flag))
  );
  const averageRelevance =
    posts.length === 0
      ? 0
      : posts.reduce((sum, post) => sum + post.classification.relevance_score, 0) /
        posts.length;
  const highBuyingSignalCount = posts.filter(
    (post) => post.classification.buying_signal_score >= 6
  ).length;
  const resourceRequestOpportunityCount = posts.filter((post) =>
    post.resourceStatus === "user_requested_resource" ||
    /checklist|resource|setup checklist|love a checklist/i.test(post.body)
  ).length;

  return {
    postsBySubreddit,
    statusCounts: statusCounts as Record<ReviewStatus, number>,
    riskCounts: riskCounts as Record<RiskLevel, number>,
    averageRelevance,
    highBuyingSignalCount,
    resourceRequestOpportunityCount,
    topPainPoints: Object.entries(painPointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5),
    topObjections: Object.entries(objectionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  };
}
