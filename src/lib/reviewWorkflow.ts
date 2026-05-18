import { checkCompliance, getOverallRisk } from "./aiMock";
import type { AuditEvent, ResourceStatus, ReviewPost, ReviewStatus } from "./types";

export type ReviewAction =
  | "approve"
  | "edit_draft"
  | "reject"
  | "do_not_engage"
  | "needs_compliance_review"
  | "needs_marketing_review"
  | "set_resource_status";

const statusByAction: Partial<Record<ReviewAction, ReviewStatus>> = {
  approve: "approved",
  edit_draft: "drafted",
  reject: "rejected",
  do_not_engage: "do_not_engage",
  needs_compliance_review: "needs_compliance_review",
  needs_marketing_review: "needs_marketing_review"
};

export function getApprovalBlockers(post: ReviewPost) {
  const blockers: string[] = [];

  if (!post.compliance.pass) {
    blockers.push("Draft failed compliance checks.");
  }

  if (getOverallRisk(post) === "high") {
    blockers.push("High-risk posts cannot be approved in the prototype.");
  }

  if (post.classification.should_reply === "no") {
    blockers.push("Classification says this post should not receive a first public reply.");
  }

  return blockers;
}

export function canApprove(post: ReviewPost) {
  return getApprovalBlockers(post).length === 0;
}

export function buildAuditEvent({
  post,
  action,
  actor,
  toStatus,
  note
}: {
  post: ReviewPost;
  action: ReviewAction;
  actor: string;
  toStatus?: ReviewStatus;
  note?: string;
}): AuditEvent {
  return {
    id: `${post.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    postId: post.id,
    action,
    actor,
    fromStatus: post.status,
    toStatus,
    createdAt: new Date().toISOString(),
    note
  };
}

export function applyReviewAction({
  post,
  action,
  actor = "local-reviewer",
  draftReply,
  resourceStatus,
  note
}: {
  post: ReviewPost;
  action: ReviewAction;
  actor?: string;
  draftReply?: string;
  resourceStatus?: ResourceStatus;
  note?: string;
}): ReviewPost {
  if (action === "approve" && !canApprove(post)) {
    const blockers = getApprovalBlockers(post).join(" ");
    const toStatus: ReviewStatus = "needs_compliance_review";
    return {
      ...post,
      status: toStatus,
      auditEvents: [
        ...post.auditEvents,
        buildAuditEvent({ post, action, actor, toStatus, note: blockers })
      ]
    };
  }

  const nextDraft = draftReply ?? post.draftReply;
  const nextStatus = statusByAction[action] ?? post.status;
  const nextResourceStatus = resourceStatus ?? post.resourceStatus;
  const nextPost: ReviewPost = {
    ...post,
    status: nextStatus,
    resourceStatus: nextResourceStatus,
    draftReply: nextDraft,
    compliance: nextDraft === post.draftReply ? post.compliance : checkCompliance(nextDraft)
  };

  return {
    ...nextPost,
    auditEvents: [
      ...post.auditEvents,
      buildAuditEvent({ post, action, actor, toStatus: nextStatus, note })
    ]
  };
}
