export type RiskLevel = "low" | "medium" | "high";

export type ReviewStatus =
  | "new"
  | "drafted"
  | "approved"
  | "rejected"
  | "do_not_engage";

export type ShouldReply = "yes" | "no";

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
  relevance_score: number;
  helpfulness_opportunity: number;
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
  health_claim_risk: RiskLevel;
  disclosure_needed: boolean;
  issues: string[];
  required_edits: string[];
};

export type ReviewPost = MockPost & {
  status: ReviewStatus;
  draftReply: string;
  classification: ClassificationResult;
  compliance: ComplianceResult;
};
