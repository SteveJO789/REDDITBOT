export type RiskLevel = "low" | "medium" | "high";

export type ReviewStatus =
  | "new"
  | "drafted"
  | "approved"
  | "rejected"
  | "do_not_engage"
  | "needs_compliance_review"
  | "needs_marketing_review";

export type ShouldReply = "yes" | "no";

export type ResourceStatus =
  | "no_resource_offered"
  | "resource_offered"
  | "user_requested_resource"
  | "resource_sent"
  | "product_requested"
  | "converted"
  | "not_relevant";

export type IntentCategory =
  | "asking_for_help"
  | "looking_for_recommendations"
  | "expressing_frustration"
  | "comparing_solutions"
  | "complaining_about_workflow"
  | "study_fatigue"
  | "burnout"
  | "desk_discomfort"
  | "joke_or_meme"
  | "low_quality_rant"
  | "high_risk_medical_case";

export type MockPost = {
  id: string;
  subreddit: string;
  title: string;
  excerpt: string;
  body: string;
  matchedKeyword: string;
  createdAt: string;
};

export type ClassificationResult = {
  intent_category: IntentCategory;
  relevance_score: number;
  helpfulness_opportunity: number;
  buying_signal_score: number;
  medical_risk: RiskLevel;
  promotion_risk: RiskLevel;
  should_reply: ShouldReply;
  reason: string;
  recommended_response_angle: string;
  red_flags_detected: string[];
  ai_summary: string;
};

export type ComplianceResult = {
  pass: boolean;
  spam_risk: RiskLevel;
  promotion_risk: RiskLevel;
  health_claim_risk: RiskLevel;
  hidden_advertising_risk: RiskLevel;
  repetitive_wording_risk: RiskLevel;
  disclosure_needed: boolean;
  issues: string[];
  required_edits: string[];
};

export type DraftReply = {
  text: string;
  generated_at: string;
  prompt_version: string;
};

export type AuditEvent = {
  id: string;
  postId: string;
  action: string;
  actor: string;
  fromStatus?: ReviewStatus;
  toStatus?: ReviewStatus;
  createdAt: string;
  note?: string;
};

export type ReviewPost = MockPost & {
  status: ReviewStatus;
  resourceStatus: ResourceStatus;
  draftReply: string;
  classification: ClassificationResult;
  compliance: ComplianceResult;
  importBatchId?: string;
  auditEvents: AuditEvent[];
};
