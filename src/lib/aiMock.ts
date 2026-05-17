import type {
  ClassificationResult,
  ComplianceResult,
  MockPost,
  ReviewPost,
  RiskLevel
} from "./types";
import { mockPosts } from "./mockPosts";

const opportunityKeywords = [
  "burnout",
  "exhausted",
  "mentally drained",
  "can't focus",
  "cannot focus",
  "brain fog",
  "no energy",
  "tired all the time",
  "work from home burnout",
  "fingers numb",
  "tingling fingers",
  "wrist pain",
  "carpal tunnel",
  "neck pain",
  "back pain from sitting",
  "desk job pain",
  "mouse hand pain",
  "can't study",
  "cannot study",
  "lost motivation",
  "study burnout",
  "screen fatigue"
];

const medicalRedFlags = [
  "weakness",
  "worsening numbness",
  "chest pain",
  "trouble breathing",
  "one-sided numbness",
  "severe pain",
  "self-harm"
];

const firstReplyBlockedPatterns = [
  "product rec",
  "links",
  "discount",
  "what should i buy",
  "best chair",
  "fixes carpal tunnel"
];

const riskyDraftPatterns = [
  "cure",
  "treat",
  "heal",
  "fix",
  "guaranteed",
  "clinically proven",
  "dm me for the product",
  "use my link",
  "this solved my numbness",
  "affiliate link",
  "discount code"
];

function countMatches(text: string, keywords: string[]) {
  const lowerText = text.toLowerCase();
  return keywords.filter((keyword) => lowerText.includes(keyword)).length;
}

function findMatches(text: string, keywords: string[]) {
  const lowerText = text.toLowerCase();
  return keywords.filter((keyword) => lowerText.includes(keyword));
}

function clampScore(score: number) {
  return Math.max(0, Math.min(10, score));
}

function summarizePost(post: MockPost) {
  const text = post.body.length > 190 ? `${post.body.slice(0, 187)}...` : post.body;
  return `${post.subreddit} post about "${post.matchedKeyword}" where the author says: ${text}`;
}

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const weights: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };
  return weights[a] >= weights[b] ? a : b;
}

export function classifyPost(post: MockPost): ClassificationResult {
  const text = `${post.title} ${post.excerpt} ${post.body}`;
  const opportunityMatches = findMatches(text, opportunityKeywords);
  const redFlags = findMatches(text, medicalRedFlags);
  const productSeekingMatches = findMatches(text, firstReplyBlockedPatterns);
  const isLowQuality =
    /meme|rant|lol|not looking for help|drop your worst/i.test(text);

  const subredditBonus = ["r/WFH", "r/productivity", "r/college", "r/GetStudying", "r/Ergonomics"].includes(
    post.subreddit
  )
    ? 1
    : 0;

  let medicalRisk: RiskLevel = "low";
  if (redFlags.length > 0) {
    medicalRisk = "high";
  } else if (
    /numb|tingling|wrist pain|carpal tunnel|neck pain|back pain|pain/i.test(text)
  ) {
    medicalRisk = "medium";
  }

  let promotionRisk: RiskLevel = "low";
  if (productSeekingMatches.length > 1) {
    promotionRisk = "high";
  } else if (productSeekingMatches.length === 1 || /buy|gear|app/i.test(text)) {
    promotionRisk = "medium";
  }

  const relevance = isLowQuality
    ? 2
    : clampScore(opportunityMatches.length * 2 + subredditBonus + (post.matchedKeyword ? 1 : 0));
  const helpfulness = isLowQuality
    ? 1
    : clampScore(relevance + (medicalRisk === "high" ? -4 : 1) + (promotionRisk === "high" ? -2 : 0));

  const shouldReply =
    relevance >= 5 && medicalRisk !== "high" && promotionRisk !== "high" && !isLowQuality
      ? "yes"
      : "no";

  let reason = "Relevant post with a clear chance to offer practical, non-promotional help.";
  if (medicalRisk === "high") {
    reason =
      "High medical risk terms were detected, so this should be handled safety-first and not as a sales opportunity.";
  } else if (promotionRisk === "high") {
    reason =
      "The post asks for product links or quick fixes, which creates high promotion risk for a first public reply.";
  } else if (isLowQuality) {
    reason =
      "The post is a low-quality meme or rant and does not show a genuine request for help.";
  } else if (relevance < 5) {
    reason = "The post has limited fit with the opportunity keywords.";
  }

  const recommendedAngle =
    medicalRisk === "high"
      ? "Do not engage as a brand. If reviewed, only consider a brief safety-first note encouraging professional support."
      : medicalRisk === "medium"
        ? "Acknowledge discomfort, suggest low-risk setup and break checks, and encourage professional guidance if symptoms persist or worsen."
        : "Acknowledge the situation, offer a few free practical steps, and only offer a checklist if the poster asks for it.";

  return {
    relevance_score: relevance,
    helpfulness_opportunity: helpfulness,
    medical_risk: medicalRisk,
    promotion_risk: promotionRisk,
    should_reply: shouldReply,
    reason,
    recommended_response_angle: recommendedAngle,
    red_flags_detected: [
      ...redFlags,
      ...(isLowQuality ? ["low-quality meme or rant"] : []),
      ...productSeekingMatches.map((match) => `promotion trigger: ${match}`)
    ],
    ai_summary: summarizePost(post)
  };
}

export function generateDraftReply(post: MockPost, classification = classifyPost(post)) {
  if (classification.medical_risk === "high") {
    return [
      "Sorry you are dealing with that. Because you mentioned symptoms that may be serious, it would be best to contact a qualified health professional or local urgent support rather than rely on a thread.",
      "",
      "For now, consider pausing the activity that seems to make it worse, avoid pushing through severe symptoms, and keep notes on when it started and what changes it. A human reviewer should decide whether this safety-first reply is appropriate."
    ].join("\n");
  }

  if (classification.promotion_risk === "high") {
    return [
      "I would be careful with anything that promises a quick fix here. Before buying something, it may help to check the basics: adjust the setup you already have, take short breaks before discomfort builds, and track which activity makes symptoms worse.",
      "",
      "If symptoms are severe, persistent, or getting worse, it is worth asking a qualified professional. I can share a checklist/resource if useful."
    ].join("\n");
  }

  if (classification.medical_risk === "medium") {
    return [
      "That sounds frustrating, especially when the discomfort starts affecting normal work or study time.",
      "",
      "A few low-risk steps that may help: take short scheduled breaks before symptoms build, check that your wrists and shoulders are relaxed rather than reaching, and try changing one setup variable at a time so you can see what actually helps.",
      "",
      "If symptoms are severe, persistent, or getting worse, it is worth checking with a qualified professional. I can share a checklist/resource if useful."
    ].join("\n");
  }

  return [
    "That sounds draining, and it makes sense that forcing more effort is not helping.",
    "",
    "A few free things to try: pick one small next action instead of the whole task, add a real reset break away from the screen, and set a clear stop point so work or study does not expand into the whole day.",
    "",
    "If this has been severe or persistent, consider talking with a qualified professional or someone you trust offline. I can share a checklist/resource if useful."
  ].join("\n");
}

export function checkCompliance(draft: string): ComplianceResult {
  const lowerDraft = draft.toLowerCase();
  const matchedRiskyPatterns = riskyDraftPatterns.filter((pattern) =>
    lowerDraft.includes(pattern)
  );
  const hasLinks = /https?:\/\/|www\./i.test(draft);
  const asksForDm = /dm me|message me|send me a dm/i.test(draft);
  const productLanguage = /buy|product|order|checkout|shipping|affiliate/i.test(draft);
  const issues: string[] = [];
  const requiredEdits: string[] = [];

  if (matchedRiskyPatterns.length > 0) {
    issues.push(`Risky wording found: ${matchedRiskyPatterns.join(", ")}`);
    requiredEdits.push("Remove claims, guarantees, affiliate language, or aggressive promotion.");
  }

  if (hasLinks) {
    issues.push("Public reply contains a link.");
    requiredEdits.push("Remove links from the first public reply.");
  }

  if (asksForDm) {
    issues.push("Draft asks for a direct message.");
    requiredEdits.push("Do not ask the poster to DM in the first public reply.");
  }

  if (productLanguage) {
    issues.push("Draft may mention a product or buying path.");
    requiredEdits.push("Keep first reply educational and non-promotional.");
  }

  const healthClaimRisk: RiskLevel = matchedRiskyPatterns.some((pattern) =>
    ["cure", "treat", "heal", "fix", "clinically proven", "this solved my numbness"].includes(pattern)
  )
    ? "high"
    : lowerDraft.includes("symptoms")
      ? "medium"
      : "low";

  const spamRisk = hasLinks || asksForDm ? "high" : productLanguage ? "medium" : "low";
  const pass = issues.length === 0 && spamRisk !== "high" && healthClaimRisk !== "high";

  return {
    pass,
    spam_risk: spamRisk,
    health_claim_risk: healthClaimRisk,
    disclosure_needed: productLanguage || lowerDraft.includes("resource"),
    issues,
    required_edits: requiredEdits
  };
}

export function createInitialReviewPosts(): ReviewPost[] {
  return mockPosts.map((post) => {
    const classification = classifyPost(post);
    const draftReply = generateDraftReply(post, classification);

    return {
      ...post,
      status: classification.should_reply === "yes" ? "drafted" : "new",
      draftReply,
      classification,
      compliance: checkCompliance(draftReply)
    };
  });
}

export function getOverallRisk(post: ReviewPost): RiskLevel {
  return maxRisk(post.classification.medical_risk, post.classification.promotion_risk);
}

export function countKeywordMatches(text: string) {
  return countMatches(text, opportunityKeywords);
}
