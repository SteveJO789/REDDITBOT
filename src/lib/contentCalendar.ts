export type ContentCalendarStatus =
  | "queued"
  | "scripting"
  | "policy_review"
  | "needs_edits"
  | "approved"
  | "packaged";

export type ShortFormScriptPlatform = "TikTok" | "Instagram Reels" | "YouTube Shorts";

export type ScriptContentIntent =
  | "education"
  | "harm_reduction"
  | "myth_correction"
  | "reflection"
  | "resource_awareness";

export type ScriptRiskLevel = "low" | "medium" | "high";

export type ScriptDraftReviewStatus = "draft" | "needs_compliance_review" | "approved" | "rejected";

export type ScriptDraftCtaType =
  | "save"
  | "share"
  | "comment"
  | "seek_support"
  | "read_resource"
  | "none";

export type ScriptVoiceoverPurpose =
  | "acknowledge"
  | "educate"
  | "clarify"
  | "reduce_harm"
  | "encourage_support"
  | "transition"
  | "CTA";

export type ScriptDraftHook = {
  text: string;
  durationSeconds: number;
  safetyNote: string;
};

export type ScriptVoiceoverBeat = {
  beat: number;
  timestampRange: string;
  line: string;
  purpose: ScriptVoiceoverPurpose;
};

export type ScriptSceneBeat = {
  beat: number;
  timestampRange: string;
  visualDirection: string;
  bRollOrGraphic: string;
  onScreenText: string;
  accessibilityNote: string;
};

export type ScriptDraftCaptions = {
  style: "clear, calm, non-sensational";
  fullCaptionText: string;
  hashtags: string[];
  disclaimer: string;
};

export type ScriptDraftCta = {
  type: ScriptDraftCtaType;
  text: string;
  safetyCheck: string;
};

export type ScriptPlatformNotes = {
  editingNotes: string;
  captionNotes: string;
  riskNotes: string;
};

export type ScriptSafetyBoundaries = {
  mustInclude: string[];
  mustNotInclude: string[];
  escalationTriggers: string[];
  requiredDisclaimer: string;
};

export type ContentScriptDraft = {
  scriptId: string;
  sourceQueueItemId: string;
  topic: string;
  targetPlatforms: ShortFormScriptPlatform[];
  estimatedDurationSeconds: number;
  audience: string;
  contentIntent: ScriptContentIntent;
  riskLevel: ScriptRiskLevel;
  hook: ScriptDraftHook;
  voiceover: ScriptVoiceoverBeat[];
  sceneBeats: ScriptSceneBeat[];
  captions: ScriptDraftCaptions;
  cta: ScriptDraftCta;
  platformNotes: {
    TikTok: ScriptPlatformNotes;
    Instagram_Reels: ScriptPlatformNotes;
    YouTube_Shorts: ScriptPlatformNotes;
  };
  safetyBoundaries: ScriptSafetyBoundaries;
  reviewStatus: ScriptDraftReviewStatus;
};

export type PolicyReviewDecision = "pass" | "revise" | "block";

export type PolicyBlockCategoryId =
  | "sourcing"
  | "dosage_guidance"
  | "medical_advice"
  | "legal_advice"
  | "diagnosis"
  | "treatment_claims"
  | "guaranteed_outcomes"
  | "encouragement_to_use"
  | "crisis_risk_mishandling";

export type PolicyReviewBlockCategory = {
  id: PolicyBlockCategoryId;
  label: string;
  severity: "critical";
};

export type ScriptPolicyReview = {
  scriptId: string;
  reviewerRole: "Fact/Policy Agent";
  decision: PolicyReviewDecision;
  blockedCategories: PolicyBlockCategoryId[];
  revisionRequired: boolean;
  notes: string[];
  requiredEdits: string[];
  crisisRiskDetected: boolean;
  finalHumanReviewRequired: true;
  reviewedAt: string;
};

export type PlatformPackageName =
  | "instagram"
  | "linkedin"
  | "facebook"
  | "threads"
  | "newsletter"
  | "tiktok_draft";

export type PlatformPackageDraft = {
  platform: PlatformPackageName;
  title: string;
  body: string;
  hashtags: string[];
  safetyDisclaimer: string;
  automationStatus: "draft_only";
};

export type ContentAssetBriefDeliverable = {
  name: string;
  format: "9:16 short video" | "carousel" | "text post" | "newsletter";
  aspectRatio: string;
  platforms: string[];
  productionNotes: string;
};

export type ContentAssetBriefScene = {
  beat: number;
  timestampRange: string;
  onScreenText: string;
  visualDirection: string;
  bRollOrGraphic: string;
  assetNeed: string;
  accessibilityNote: string;
};

export type ContentAssetBriefVisualPrompt = {
  promptId: string;
  prompt: string;
  negativePrompt: string;
  licenseRequirement: "generated_or_licensed_only";
};

export type ContentAssetBrief = {
  briefId: string;
  sourceQueueItemId: string;
  sourceScriptId: string;
  generatedAt: string;
  status: "brief_only";
  humanApprovalRequired: true;
  creativeDirection: string;
  visualStyle: string;
  deliverables: ContentAssetBriefDeliverable[];
  scenes: ContentAssetBriefScene[];
  visualPrompts: ContentAssetBriefVisualPrompt[];
  voiceoverPlan: {
    tone: string;
    pacing: string;
    recordingNotes: string;
    lines: string[];
  };
  audioPlan: string;
  captionPlan: string;
  licenseNotes: string[];
  safetyConstraints: string[];
  prohibitedVisuals: string[];
};

export type GeneratedAssetKind =
  | "cover_image_prompt"
  | "background_loop_prompt"
  | "support_graphic_prompt"
  | "text_card"
  | "b_roll_list"
  | "voiceover_script"
  | "caption_file"
  | "license_checklist";

export type ContentGeneratedAsset = {
  assetId: string;
  kind: GeneratedAssetKind;
  name: string;
  platformTargets: string[];
  body: string;
  prompt?: string;
  negativePrompt?: string;
  checklist?: string[];
  licenseStatus: "needs_recorded_license" | "generated_or_licensed_only";
  automationStatus: "draft_asset";
  humanApprovalRequired: true;
};

export type ContentGeneratedAssets = {
  manifestId: string;
  sourceQueueItemId: string;
  sourceBriefId: string;
  generatedAt: string;
  status: "draft_assets";
  renderReady: false;
  humanApprovalRequired: true;
  assets: ContentGeneratedAsset[];
  renderInputs: {
    aspectRatio: "9:16";
    estimatedDurationSeconds: number;
    textCardCount: number;
    voiceoverLineCount: number;
    captionRequired: true;
    licenseReviewRequired: true;
  };
  qaChecklist: string[];
};

export type ContentPlatformPackage = {
  packageId: string;
  sourceQueueItemId: string;
  generatedAt: string;
  humanApprovalRequired: true;
  drafts: PlatformPackageDraft[];
};

export type ContentCalendarSeedRow = {
  day: number;
  weekTheme: string;
  contentPillar: string;
  title: string;
  caption: string;
  cta: string;
  recommendedPlatforms: string[];
  format: string;
  safetyNote: string;
};

export type ContentCalendarQueueItem = ContentCalendarSeedRow & {
  id: string;
  clientChannelId: string;
  source: "seed" | "import";
  sourceLabel: string;
  status: ContentCalendarStatus;
  scriptDraft?: ContentScriptDraft;
  policyReview?: ScriptPolicyReview;
  platformPackage?: ContentPlatformPackage;
  assetBrief?: ContentAssetBrief;
  generatedAssets?: ContentGeneratedAssets;
  updatedAt?: string;
};

const requiredHeaders = [
  "day",
  "week_theme",
  "content_pillar",
  "title",
  "caption",
  "cta",
  "recommended_platform",
  "format",
  "safety_note"
] as const;

export const contentCalendarStatusOrder: ContentCalendarStatus[] = [
  "queued",
  "scripting",
  "policy_review",
  "needs_edits",
  "approved",
  "packaged"
];

export const contentCalendarStatusLabels: Record<ContentCalendarStatus, string> = {
  queued: "Queued",
  scripting: "Scripting",
  policy_review: "Policy Review",
  needs_edits: "Needs Edits",
  approved: "Approved",
  packaged: "Packaged"
};

export const scriptDraftReviewStatusOrder: ScriptDraftReviewStatus[] = [
  "draft",
  "needs_compliance_review",
  "approved",
  "rejected"
];

export const scriptDraftReviewStatusLabels: Record<ScriptDraftReviewStatus, string> = {
  draft: "Draft",
  needs_compliance_review: "Needs Compliance Review",
  approved: "Human Approved",
  rejected: "Rejected"
};

export const policyReviewDecisionOrder: PolicyReviewDecision[] = ["pass", "revise", "block"];

export const policyReviewDecisionLabels: Record<PolicyReviewDecision, string> = {
  pass: "Pass",
  revise: "Revise",
  block: "Block"
};

export const scriptDraftSafetyBoundaries: ScriptSafetyBoundaries = {
  mustInclude: [
    "Educational framing only.",
    "Encourage professional, medical, or emergency support when relevant.",
    "Avoid shame, hype, fearmongering, or moral judgment.",
    "Acknowledge legal and personal risk where relevant.",
    "Keep language calm, grounded, and non-prescriptive."
  ],
  mustNotInclude: [
    "No dosing instructions.",
    "No sourcing, vendors, links to buy, or acquisition guidance.",
    "No encouragement to use psychedelics.",
    "No claims that psychedelics cure, treat, prevent, diagnose, or heal any condition.",
    "No protocols for self-treatment.",
    "No instructions for combining substances.",
    "No extraction, preparation, or administration instructions.",
    "No glamorizing, sensational visuals, or spiritual certainty claims.",
    "No replacement of medical, psychiatric, legal, or crisis support."
  ],
  escalationTriggers: [
    "Suicidal ideation",
    "Psychosis or mania",
    "Severe panic or dissociation",
    "Chest pain, seizure, loss of consciousness, or medical emergency",
    "Requests for dosing, sourcing, or illegal activity",
    "Claims about treating diagnosed medical or psychiatric conditions"
  ],
  requiredDisclaimer:
    "This content is for education and harm reduction only. It is not medical, psychiatric, or legal advice."
};

export const policyReviewBlockCategories: PolicyReviewBlockCategory[] = [
  { id: "sourcing", label: "Sourcing or Access", severity: "critical" },
  { id: "dosage_guidance", label: "Dosage, Timing, or Administration Guidance", severity: "critical" },
  { id: "medical_advice", label: "Medical Advice", severity: "critical" },
  { id: "legal_advice", label: "Legal Advice", severity: "critical" },
  { id: "diagnosis", label: "Diagnosis or Clinical Assessment", severity: "critical" },
  { id: "treatment_claims", label: "Treatment, Cure, or Health Outcome Claims", severity: "critical" },
  { id: "guaranteed_outcomes", label: "Guaranteed or Overconfident Outcomes", severity: "critical" },
  { id: "encouragement_to_use", label: "Encouragement, Promotion, or Normalization of Use", severity: "critical" },
  { id: "crisis_risk_mishandling", label: "Crisis-Risk Mishandling", severity: "critical" }
];

export const policyReviewFlagTerms = [
  "cure",
  "treat",
  "heal",
  "fix",
  "guaranteed",
  "clinically proven",
  "breakthrough",
  "safe for everyone",
  "microdose",
  "dose",
  "redose",
  "stack",
  "protocol",
  "where to buy",
  "vendor",
  "DM me",
  "link in bio",
  "retreat",
  "facilitator",
  "medicine journey",
  "trauma release",
  "this saved me",
  "try it",
  "you should take"
];

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  function pushCell() {
    row.push(cell.trim());
    cell = "";
  }

  function pushRow() {
    if (row.some((value) => value.trim())) {
      rows.push(row);
    }
    row = [];
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"" && next === "\"" && inQuotes) {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      pushCell();
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      pushCell();
      pushRow();
      if (char === "\r" && next === "\n") {
        index += 1;
      }
    } else {
      cell += char;
    }
  }

  pushCell();
  pushRow();

  return rows;
}

function splitPlatformList(value: string) {
  return value
    .split("/")
    .map((platform) => platform.trim())
    .filter(Boolean);
}

export function parseContentCalendarCsv(text: string): ContentCalendarSeedRow[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Content calendar CSV is missing headers: ${missingHeaders.join(", ")}.`);
  }

  return rows.slice(1).map((cells, index) => {
    const record = headers.reduce<Record<string, string>>((current, header, cellIndex) => {
      current[header] = cells[cellIndex] ?? "";
      return current;
    }, {});
    const day = Number.parseInt(record.day, 10);

    if (!Number.isInteger(day) || day < 1) {
      throw new Error(`Content calendar row ${index + 1} has an invalid day.`);
    }

    return {
      day,
      weekTheme: record.week_theme,
      contentPillar: record.content_pillar,
      title: record.title,
      caption: record.caption,
      cta: record.cta,
      recommendedPlatforms: splitPlatformList(record.recommended_platform),
      format: record.format,
      safetyNote: record.safety_note
    };
  });
}

export function createContentCalendarQueueItems(
  clientChannelId: string,
  rows: ContentCalendarSeedRow[],
  options: {
    source?: "seed" | "import";
    sourceLabel?: string;
  } = {}
): ContentCalendarQueueItem[] {
  return rows.map((row) => ({
    ...row,
    id: `${clientChannelId}-day-${String(row.day).padStart(2, "0")}`,
    clientChannelId,
    source: options.source ?? "seed",
    sourceLabel: options.sourceLabel ?? "content calendar",
    status: "queued"
  }));
}

export function mergeContentCalendarQueue(
  currentQueue: ContentCalendarQueueItem[] | undefined,
  incomingQueue: ContentCalendarQueueItem[]
) {
  const currentById = new Map((currentQueue ?? []).map((item) => [item.id, item]));
  const incomingIds = new Set(incomingQueue.map((item) => item.id));
  const mergedIncoming = incomingQueue.map((item) => {
    const current = currentById.get(item.id);

    return current
      ? {
          ...item,
          status: current.status,
          scriptDraft: current.scriptDraft,
          policyReview: current.policyReview,
          platformPackage: current.platformPackage,
          assetBrief: current.assetBrief,
          generatedAssets: current.generatedAssets,
          updatedAt: current.updatedAt
        }
      : item;
  });
  const extraCurrent = (currentQueue ?? []).filter((item) => !incomingIds.has(item.id));

  return [...mergedIncoming, ...extraCurrent].sort((first, second) => {
    if (first.clientChannelId !== second.clientChannelId) {
      return first.clientChannelId.localeCompare(second.clientChannelId);
    }

    return first.day - second.day || first.id.localeCompare(second.id);
  });
}

function sentenceParts(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function normaliseScriptPlatform(platform: string): ShortFormScriptPlatform | null {
  const lower = platform.toLowerCase();
  if (lower.includes("tiktok")) return "TikTok";
  if (lower.includes("instagram")) return "Instagram Reels";
  if (lower.includes("youtube")) return "YouTube Shorts";
  return null;
}

function inferTargetPlatforms(item: ContentCalendarQueueItem): ShortFormScriptPlatform[] {
  const platforms = item.recommendedPlatforms
    .map(normaliseScriptPlatform)
    .filter((platform): platform is ShortFormScriptPlatform => !!platform);
  const uniquePlatforms = Array.from(new Set(platforms));

  return uniquePlatforms.length > 0 ? uniquePlatforms : ["Instagram Reels", "YouTube Shorts"];
}

function inferContentIntent(item: ContentCalendarQueueItem): ScriptContentIntent {
  const text = `${item.title} ${item.caption}`.toLowerCase();
  if (text.includes("myth")) return "myth_correction";
  if (text.includes("professional help") || text.includes("support")) return "resource_awareness";
  if (item.contentPillar.toLowerCase() === "conversion") return "resource_awareness";
  if (text.includes("journal") || text.includes("intention")) return "reflection";
  if (text.includes("safety") || text.includes("risk")) return "harm_reduction";
  return "education";
}

function inferRiskLevel(item: ContentCalendarQueueItem): ScriptRiskLevel {
  const text = `${item.title} ${item.caption} ${item.safetyNote}`.toLowerCase();
  if (/(self-harm|suicid|psychosis|mania|bipolar|crisis|emergency|reality feels unstable)/.test(text)) {
    return "high";
  }

  if (item.contentPillar.toLowerCase() === "conversion" || /(legal|medical|therapy|professional)/.test(text)) {
    return "medium";
  }

  return "low";
}

function inferCtaType(cta: string): ScriptDraftCtaType {
  const lower = cta.toLowerCase();
  if (lower.includes("save")) return "save";
  if (lower.includes("share")) return "share";
  if (lower.includes("comment")) return "comment";
  if (lower.includes("professional") || lower.includes("support") || lower.includes("safety")) return "seek_support";
  if (lower.includes("article") || lower.includes("worksheet") || lower.includes("checklist")) return "read_resource";
  return cta.trim() ? "comment" : "none";
}

function timestampRange(index: number, total: number, durationSeconds: number) {
  const start = Math.round((durationSeconds / total) * index);
  const end = Math.round((durationSeconds / total) * (index + 1));
  return `${start}-${end}s`;
}

function voiceoverPurpose(index: number, total: number): ScriptVoiceoverPurpose {
  if (index === 0) return "acknowledge";
  if (index === total - 1) return "CTA";
  if (index === 1) return "educate";
  if (index === 2) return "reduce_harm";
  return "clarify";
}

export function createScriptDraftFromQueueItem(item: ContentCalendarQueueItem): ContentScriptDraft {
  const durationSeconds = item.format.toLowerCase().includes("long") ? 60 : 45;
  const captionSentences = sentenceParts(item.caption);
  const voiceoverLines = [
    item.title,
    ...captionSentences.slice(0, 3),
    item.safetyNote,
    item.cta
  ].filter(Boolean);
  const limitedVoiceoverLines = voiceoverLines.slice(0, 6);

  return {
    scriptId: `${item.id}-script`,
    sourceQueueItemId: item.id,
    topic: item.title,
    targetPlatforms: inferTargetPlatforms(item),
    estimatedDurationSeconds: durationSeconds,
    audience: "Adults researching psychedelic harm reduction who need caution, context, and support boundaries.",
    contentIntent: inferContentIntent(item),
    riskLevel: inferRiskLevel(item),
    hook: {
      text: truncateText(item.title, 96),
      durationSeconds: 4,
      safetyNote: "Hook must invite reflection without hype, urgency, or encouragement to use."
    },
    voiceover: limitedVoiceoverLines.map((line, index) => ({
      beat: index + 1,
      timestampRange: timestampRange(index, limitedVoiceoverLines.length, durationSeconds),
      line,
      purpose: voiceoverPurpose(index, limitedVoiceoverLines.length)
    })),
    sceneBeats: limitedVoiceoverLines.map((line, index) => ({
      beat: index + 1,
      timestampRange: timestampRange(index, limitedVoiceoverLines.length, durationSeconds),
      visualDirection: "Use calm text-led visuals with simple cards, captions, or neutral abstract background.",
      bRollOrGraphic: "Licensed or generated neutral visuals only; avoid glamorized substance imagery.",
      onScreenText: truncateText(line, 72),
      accessibilityNote: "High contrast captions, no flashing cuts, and readable pacing."
    })),
    captions: {
      style: "clear, calm, non-sensational",
      fullCaptionText: `${item.caption}\n\n${scriptDraftSafetyBoundaries.requiredDisclaimer}`,
      hashtags: ["#HarmReduction", "#Integration", "#Preparation", "#MentalHealthAwareness"],
      disclaimer: scriptDraftSafetyBoundaries.requiredDisclaimer
    },
    cta: {
      type: inferCtaType(item.cta),
      text: item.cta,
      safetyCheck: "CTA must not encourage psychedelic use, sourcing, dosing, or self-treatment."
    },
    platformNotes: {
      TikTok: {
        editingNotes: "Keep cuts slow and caption-led; avoid trend audio that changes the educational tone.",
        captionNotes: "Use the disclaimer in the caption and avoid sales language.",
        riskNotes: "Treat TikTok as draft-only until platform review is complete."
      },
      Instagram_Reels: {
        editingNotes: "Use carousel-like text cards or a calm talking-head layout.",
        captionNotes: "Keep the CTA educational, reflective, or support-oriented.",
        riskNotes: "Conversion posts need explicit scope boundaries."
      },
      YouTube_Shorts: {
        editingNotes: "Open with the title, then move through clear safety beats.",
        captionNotes: "Include educational framing and concise hashtags.",
        riskNotes: "Avoid implying clinical or legal guidance."
      }
    },
    safetyBoundaries: scriptDraftSafetyBoundaries,
    reviewStatus: "draft"
  };
}

function publicScriptText(scriptDraft: ContentScriptDraft) {
  return [
    scriptDraft.hook.text,
    ...scriptDraft.voiceover.map((beat) => beat.line),
    ...scriptDraft.sceneBeats.map((beat) => beat.onScreenText),
    scriptDraft.captions.fullCaptionText,
    scriptDraft.cta.text
  ].join(" ");
}

function hasWarningContext(text: string, matchIndex: number) {
  const context = text.slice(Math.max(matchIndex - 72, 0), matchIndex).toLowerCase();
  return /(not|no|avoid|cautious|red flag|should not|does not|do not|cannot|without|promise|guaranteed outcome)/.test(context);
}

function hasRiskTerm(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  if (!match || typeof match.index !== "number") {
    return false;
  }

  return !hasWarningContext(text, match.index);
}

function detectBlockedCategories(scriptDraft: ContentScriptDraft): PolicyBlockCategoryId[] {
  const text = publicScriptText(scriptDraft).toLowerCase();
  const categories: PolicyBlockCategoryId[] = [];

  if (hasRiskTerm(text, /\b(where to buy|vendor|dealer|marketplace|ship|import|grow|extract|acquire)\b/i)) {
    categories.push("sourcing");
  }

  if (hasRiskTerm(text, /\b(microdose|redose|dose range|how much|take\s+\d|\d+\s*(mg|grams?)|stack)\b/i)) {
    categories.push("dosage_guidance");
  }

  if (hasRiskTerm(text, /\b(start|stop|replace|taper|combine)\b.{0,32}\b(medication|therapy|medicine|antidepressant|supplement)\b/i)) {
    categories.push("medical_advice");
  }

  if (hasRiskTerm(text, /\b(avoid detection|avoid prosecution|workplace testing|border control|legal for you)\b/i)) {
    categories.push("legal_advice");
  }

  if (hasRiskTerm(text, /\b(you have|this means you have|diagnose|diagnosis)\b.{0,48}\b(depression|ptsd|addiction|anxiety|psychosis|bipolar|trauma)\b/i)) {
    categories.push("diagnosis");
  }

  if (hasRiskTerm(text, /\b(cure|treat|heal|prevent|reverse|fix)\b.{0,48}\b(depression|ptsd|addiction|anxiety|trauma|pain|symptom|condition|disorder)\b/i)) {
    categories.push("treatment_claims");
  }

  if (hasRiskTerm(text, /\b(guaranteed|risk-free|safe for everyone|always works|never fails)\b/i)) {
    categories.push("guaranteed_outcomes");
  }

  if (hasRiskTerm(text, /\b(you should try|try psychedelics|take psychedelics|use psychedelics|experiment with psychedelics)\b/i)) {
    categories.push("encouragement_to_use");
  }

  const crisisRiskDetected = /\b(self-harm|suicid|overdose|psychosis|mania|medical emergency|immediate danger)\b/i.test(text);
  const crisisHandled = /\b(988|emergency|professional help|qualified professional|emergency services)\b/i.test(text);
  if (crisisRiskDetected && !crisisHandled) {
    categories.push("crisis_risk_mishandling");
  }

  return Array.from(new Set(categories));
}

function detectManualFlagTerms(scriptDraft: ContentScriptDraft) {
  const text = publicScriptText(scriptDraft).toLowerCase();

  return policyReviewFlagTerms.filter((term) => {
    const lowerTerm = term.toLowerCase();
    const index = text.indexOf(lowerTerm);
    return index >= 0 && !hasWarningContext(text, index);
  });
}

export function reviewScriptDraftPolicy(scriptDraft: ContentScriptDraft): ScriptPolicyReview {
  const blockedCategories = detectBlockedCategories(scriptDraft);
  const manualFlagTerms = detectManualFlagTerms(scriptDraft);
  const crisisRiskDetected = /\b(self-harm|suicid|overdose|psychosis|mania|medical emergency|immediate danger)\b/i.test(
    publicScriptText(scriptDraft)
  );
  const decision: PolicyReviewDecision =
    blockedCategories.length > 0 ? "block" : manualFlagTerms.length > 0 ? "revise" : "pass";
  const notes = [
    "Human approval is required before packaging or publishing.",
    manualFlagTerms.length > 0
      ? `Manual review terms detected: ${manualFlagTerms.join(", ")}.`
      : "No manual-review terms detected in public-facing script text."
  ];
  const requiredEdits =
    decision === "pass"
      ? []
      : [
          ...blockedCategories.map((category) => {
            const label = policyReviewBlockCategories.find((item) => item.id === category)?.label ?? category;
            return `Remove or rewrite blocked content for ${label}.`;
          }),
          ...(manualFlagTerms.length > 0
            ? ["Rewrite flagged terms into neutral, educational, non-promotional language."]
            : [])
        ];

  return {
    scriptId: scriptDraft.scriptId,
    reviewerRole: "Fact/Policy Agent",
    decision,
    blockedCategories,
    revisionRequired: decision !== "pass",
    notes,
    requiredEdits,
    crisisRiskDetected,
    finalHumanReviewRequired: true,
    reviewedAt: new Date().toISOString()
  };
}

export function createScriptDraftForQueueItem(item: ContentCalendarQueueItem): ContentCalendarQueueItem {
  return {
    ...item,
    status: "scripting",
    scriptDraft: createScriptDraftFromQueueItem(item),
    policyReview: undefined,
    platformPackage: undefined,
    assetBrief: undefined,
    generatedAssets: undefined,
    updatedAt: new Date().toISOString()
  };
}

export function reviewQueueItemScriptPolicy(item: ContentCalendarQueueItem): ContentCalendarQueueItem {
  const scriptDraft = item.scriptDraft ?? createScriptDraftFromQueueItem(item);
  const policyReview = reviewScriptDraftPolicy(scriptDraft);

  return {
    ...item,
    status: policyReview.decision === "pass" ? "policy_review" : "needs_edits",
    scriptDraft: {
      ...scriptDraft,
      reviewStatus: policyReview.decision === "pass" ? "needs_compliance_review" : "draft"
    },
    policyReview,
    platformPackage: undefined,
    assetBrief: undefined,
    generatedAssets: undefined,
    updatedAt: policyReview.reviewedAt
  };
}

export function canPackageQueueItem(item: ContentCalendarQueueItem) {
  return item.scriptDraft?.reviewStatus === "approved" && item.policyReview?.decision === "pass";
}

function createPlatformBody(item: ContentCalendarQueueItem, platform: PlatformPackageName) {
  const scriptDraft = item.scriptDraft ?? createScriptDraftFromQueueItem(item);
  const voiceoverSummary = scriptDraft.voiceover.map((beat) => beat.line).join(" ");
  const disclaimer = scriptDraft.captions.disclaimer;

  if (platform === "linkedin") {
    return [
      item.title,
      "",
      voiceoverSummary,
      "",
      item.cta,
      "",
      disclaimer
    ].join("\n");
  }

  if (platform === "newsletter") {
    return [
      `Subject: ${item.title}`,
      "",
      scriptDraft.captions.fullCaptionText,
      "",
      "Production note: Review all claims and support language before sending."
    ].join("\n");
  }

  if (platform === "threads") {
    return `${item.title}\n\n${scriptDraft.hook.text}\n\n${item.cta}\n\n${disclaimer}`;
  }

  if (platform === "tiktok_draft") {
    return `${scriptDraft.hook.text}\n\n${item.cta}\n\n${disclaimer}\n\nDraft only. Do not publish without final human approval.`;
  }

  return `${scriptDraft.captions.fullCaptionText}\n\n${item.cta}`;
}

export function createPlatformPackageForQueueItem(item: ContentCalendarQueueItem): ContentPlatformPackage {
  if (!canPackageQueueItem(item)) {
    throw new Error("Queue item must have passed policy review and human script approval before packaging.");
  }

  const scriptDraft = item.scriptDraft ?? createScriptDraftFromQueueItem(item);
  const platforms: PlatformPackageName[] = [
    "instagram",
    "linkedin",
    "facebook",
    "threads",
    "newsletter",
    "tiktok_draft"
  ];

  return {
    packageId: `${item.id}-package`,
    sourceQueueItemId: item.id,
    generatedAt: new Date().toISOString(),
    humanApprovalRequired: true,
    drafts: platforms.map((platform) => ({
      platform,
      title: item.title,
      body: createPlatformBody(item, platform),
      hashtags: scriptDraft.captions.hashtags,
      safetyDisclaimer: scriptDraft.captions.disclaimer,
      automationStatus: "draft_only"
    }))
  };
}

function createAssetBriefDeliverables(
  item: ContentCalendarQueueItem,
  scriptDraft: ContentScriptDraft
): ContentAssetBriefDeliverable[] {
  const staticFormat: ContentAssetBriefDeliverable["format"] = item.format.toLowerCase().includes("carousel")
    ? "carousel"
    : "text post";
  const deliverables: ContentAssetBriefDeliverable[] = [
    {
      name: "Vertical short video draft",
      format: "9:16 short video",
      aspectRatio: "9:16",
      platforms: scriptDraft.targetPlatforms,
      productionNotes:
        "Text-led vertical draft using slow pacing, readable captions, and neutral visuals. Do not render or publish automatically."
    },
    {
      name: `${item.format} static package`,
      format: staticFormat,
      aspectRatio: staticFormat === "carousel" ? "4:5 or 1:1" : "4:5",
      platforms: item.recommendedPlatforms.filter((platform) => platform.toLowerCase() !== "newsletter"),
      productionNotes:
        "Use concise text cards from the scene beats. Keep disclaimers visible in caption or final card."
    }
  ];

  if (item.recommendedPlatforms.some((platform) => platform.toLowerCase() === "newsletter")) {
    deliverables.push({
      name: "Newsletter section draft",
      format: "newsletter",
      aspectRatio: "responsive email",
      platforms: ["Newsletter"],
      productionNotes:
        "Use the approved caption as body copy and add the education-only disclaimer near the CTA."
    });
  }

  return deliverables;
}

function createAssetBriefVisualPrompts(
  item: ContentCalendarQueueItem,
  scriptDraft: ContentScriptDraft
): ContentAssetBriefVisualPrompt[] {
  const basePrompt =
    "Calm harm-reduction education visual with a grounded editorial feel, soft natural light, notebook or " +
    "neutral support-planning cues, diverse adult audience, clear empty space for readable text overlays.";
  const negativePrompt =
    "No substances, pills, mushrooms, ceremonies, intoxication, clinical treatment claims, spiritual certainty, " +
    "neon hype, fear imagery, needles, weapons, copyrighted logos, or identifiable private people.";

  return [
    {
      promptId: `${item.id}-cover-visual`,
      prompt: `${basePrompt} Cover image for "${item.title}".`,
      negativePrompt,
      licenseRequirement: "generated_or_licensed_only"
    },
    {
      promptId: `${item.id}-background-loop`,
      prompt:
        `${basePrompt} Minimal vertical background loop for ${scriptDraft.estimatedDurationSeconds} seconds, ` +
        "subtle motion only, designed for captions and accessibility.",
      negativePrompt,
      licenseRequirement: "generated_or_licensed_only"
    },
    {
      promptId: `${item.id}-support-graphic`,
      prompt:
        `${basePrompt} Simple checklist or reflection graphic supporting the CTA: "${truncateText(item.cta, 80)}".`,
      negativePrompt,
      licenseRequirement: "generated_or_licensed_only"
    }
  ];
}

export function createAssetBriefForQueueItem(item: ContentCalendarQueueItem): ContentAssetBrief {
  if (!canPackageQueueItem(item)) {
    throw new Error("Queue item must have passed policy review and human script approval before creating an asset brief.");
  }

  const scriptDraft = item.scriptDraft ?? createScriptDraftFromQueueItem(item);
  const generatedAt = new Date().toISOString();

  return {
    briefId: `${item.id}-asset-brief`,
    sourceQueueItemId: item.id,
    sourceScriptId: scriptDraft.scriptId,
    generatedAt,
    status: "brief_only",
    humanApprovalRequired: true,
    creativeDirection:
      "Grounded, non-sensational harm-reduction education. The creative should slow the viewer down, " +
      "make boundaries obvious, and avoid any visual language that glamorizes psychedelic use.",
    visualStyle:
      "Neutral editorial, high contrast text cards, warm natural light, simple workspace or journaling cues, " +
      "restrained motion, no flashing cuts.",
    deliverables: createAssetBriefDeliverables(item, scriptDraft),
    scenes: scriptDraft.sceneBeats.map((scene) => ({
      beat: scene.beat,
      timestampRange: scene.timestampRange,
      onScreenText: scene.onScreenText,
      visualDirection: scene.visualDirection,
      bRollOrGraphic: scene.bRollOrGraphic,
      assetNeed:
        scene.beat === 1
          ? "Opening title card plus calm background visual."
          : "Licensed/generated b-roll or text card that supports the voiceover without adding new claims.",
      accessibilityNote: scene.accessibilityNote
    })),
    visualPrompts: createAssetBriefVisualPrompts(item, scriptDraft),
    voiceoverPlan: {
      tone: "Calm, grounded, reflective, non-authoritative.",
      pacing: "Slow enough for captions to be read. Leave short pauses after safety boundaries and CTA.",
      recordingNotes:
        "Record from the approved script only. Do not improvise dosing, sourcing, medical, legal, or treatment guidance.",
      lines: scriptDraft.voiceover.map((beat) => beat.line)
    },
    audioPlan:
      "Optional quiet bed under -22 LUFS. No trend audio that shifts the content toward hype, comedy, or promotion.",
    captionPlan:
      "Burned-in captions must match approved voiceover lines. Caption copy must include the education-only disclaimer.",
    licenseNotes: [
      "Use generated or explicitly licensed visuals only.",
      "Record source, prompt, model/tool, license, and editor before rendering.",
      "Do not use copyrighted music, platform trend audio, logos, or third-party footage without a recorded license."
    ],
    safetyConstraints: [
      ...scriptDraft.safetyBoundaries.mustInclude,
      "Keep the final render behind human approval."
    ],
    prohibitedVisuals: [
      "Substances, dosing tools, vendors, ceremonies, or consumption scenes.",
      "Before/after recovery claims, medical-treatment framing, or guaranteed outcomes.",
      "Fear-based crisis imagery, glamorized psychedelic aesthetics, or spiritual-certainty cues."
    ]
  };
}

export function addAssetBriefToQueueItem(item: ContentCalendarQueueItem): ContentCalendarQueueItem {
  const assetBrief = createAssetBriefForQueueItem(item);

  return {
    ...item,
    assetBrief,
    generatedAssets: undefined,
    updatedAt: assetBrief.generatedAt
  };
}

export function canGenerateAssetsForQueueItem(item: ContentCalendarQueueItem) {
  return canPackageQueueItem(item) && !!item.assetBrief;
}

function createPromptGeneratedAssets(
  item: ContentCalendarQueueItem,
  assetBrief: ContentAssetBrief
): ContentGeneratedAsset[] {
  const kindByIndex: GeneratedAssetKind[] = [
    "cover_image_prompt",
    "background_loop_prompt",
    "support_graphic_prompt"
  ];

  return assetBrief.visualPrompts.map((visualPrompt, index) => ({
    assetId: visualPrompt.promptId,
    kind: kindByIndex[index] ?? "support_graphic_prompt",
    name: visualPrompt.promptId.replace(`${item.id}-`, "").replaceAll("-", " "),
    platformTargets: assetBrief.deliverables.flatMap((deliverable) => deliverable.platforms),
    body:
      "Use this prompt to create a draft visual asset. Record the generation tool, model, prompt, " +
      "license, editor, and approval status before any render.",
    prompt: visualPrompt.prompt,
    negativePrompt: visualPrompt.negativePrompt,
    licenseStatus: "generated_or_licensed_only",
    automationStatus: "draft_asset",
    humanApprovalRequired: true
  }));
}

function createTextCardAssets(assetBrief: ContentAssetBrief): ContentGeneratedAsset[] {
  const platforms = assetBrief.deliverables
    .filter((deliverable) => deliverable.format === "9:16 short video" || deliverable.format === "carousel")
    .flatMap((deliverable) => deliverable.platforms);

  return assetBrief.scenes.map((scene) => ({
    assetId: `${assetBrief.sourceQueueItemId}-text-card-${String(scene.beat).padStart(2, "0")}`,
    kind: "text_card",
    name: `Text card ${scene.beat}`,
    platformTargets: platforms,
    body: [
      scene.onScreenText,
      "",
      `Timing: ${scene.timestampRange}`,
      `Visual direction: ${scene.visualDirection}`,
      `Accessibility: ${scene.accessibilityNote}`
    ].join("\n"),
    licenseStatus: "generated_or_licensed_only",
    automationStatus: "draft_asset",
    humanApprovalRequired: true
  }));
}

function createProductionGeneratedAssets(
  item: ContentCalendarQueueItem,
  assetBrief: ContentAssetBrief,
  scriptDraft: ContentScriptDraft
): ContentGeneratedAsset[] {
  const videoPlatforms = assetBrief.deliverables
    .filter((deliverable) => deliverable.format === "9:16 short video")
    .flatMap((deliverable) => deliverable.platforms);
  const allPlatforms = assetBrief.deliverables.flatMap((deliverable) => deliverable.platforms);

  return [
    {
      assetId: `${item.id}-b-roll-list`,
      kind: "b_roll_list",
      name: "B-roll and graphic needs",
      platformTargets: videoPlatforms,
      body: assetBrief.scenes
        .map((scene) => `Beat ${scene.beat} (${scene.timestampRange}): ${scene.assetNeed}`)
        .join("\n"),
      checklist: assetBrief.prohibitedVisuals,
      licenseStatus: "needs_recorded_license",
      automationStatus: "draft_asset",
      humanApprovalRequired: true
    },
    {
      assetId: `${item.id}-voiceover-script`,
      kind: "voiceover_script",
      name: "Voiceover script",
      platformTargets: videoPlatforms,
      body: [
        `Tone: ${assetBrief.voiceoverPlan.tone}`,
        `Pacing: ${assetBrief.voiceoverPlan.pacing}`,
        assetBrief.voiceoverPlan.recordingNotes,
        "",
        ...assetBrief.voiceoverPlan.lines.map((line, index) => `${index + 1}. ${line}`)
      ].join("\n"),
      checklist: [
        "Record from approved script only.",
        "No improvised dosing, sourcing, medical, legal, or treatment guidance.",
        "Final audio requires human approval before render."
      ],
      licenseStatus: "generated_or_licensed_only",
      automationStatus: "draft_asset",
      humanApprovalRequired: true
    },
    {
      assetId: `${item.id}-caption-file`,
      kind: "caption_file",
      name: "Caption file draft",
      platformTargets: allPlatforms,
      body: [
        scriptDraft.captions.fullCaptionText,
        "",
        `Hashtags: ${scriptDraft.captions.hashtags.join(" ")}`
      ].join("\n"),
      checklist: [
        assetBrief.captionPlan,
        scriptDraft.captions.disclaimer,
        "Caption must match approved voiceover and platform package."
      ],
      licenseStatus: "generated_or_licensed_only",
      automationStatus: "draft_asset",
      humanApprovalRequired: true
    },
    {
      assetId: `${item.id}-license-checklist`,
      kind: "license_checklist",
      name: "License checklist",
      platformTargets: allPlatforms,
      body: assetBrief.licenseNotes.join("\n"),
      checklist: [
        "Prompt/model/tool recorded for generated visuals.",
        "Music or audio license recorded before render.",
        "No copyrighted logos, third-party footage, or unapproved platform trend audio.",
        "Human approval recorded before video render."
      ],
      licenseStatus: "needs_recorded_license",
      automationStatus: "draft_asset",
      humanApprovalRequired: true
    }
  ];
}

export function createGeneratedAssetsForQueueItem(item: ContentCalendarQueueItem): ContentGeneratedAssets {
  if (!canGenerateAssetsForQueueItem(item)) {
    throw new Error("Queue item must have an approved asset brief before generating draft assets.");
  }

  const assetBrief = item.assetBrief!;
  const scriptDraft = item.scriptDraft ?? createScriptDraftFromQueueItem(item);
  const generatedAt = new Date().toISOString();
  const assets = [
    ...createPromptGeneratedAssets(item, assetBrief),
    ...createTextCardAssets(assetBrief),
    ...createProductionGeneratedAssets(item, assetBrief, scriptDraft)
  ];

  return {
    manifestId: `${item.id}-generated-assets`,
    sourceQueueItemId: item.id,
    sourceBriefId: assetBrief.briefId,
    generatedAt,
    status: "draft_assets",
    renderReady: false,
    humanApprovalRequired: true,
    assets,
    renderInputs: {
      aspectRatio: "9:16",
      estimatedDurationSeconds: scriptDraft.estimatedDurationSeconds,
      textCardCount: assetBrief.scenes.length,
      voiceoverLineCount: assetBrief.voiceoverPlan.lines.length,
      captionRequired: true,
      licenseReviewRequired: true
    },
    qaChecklist: [
      "Confirm every visual avoids prohibited harm-reduction visuals.",
      "Confirm generated or licensed source is recorded for every visual and audio asset.",
      "Confirm captions match the approved script exactly.",
      "Confirm disclaimer remains visible in caption or final card.",
      "Confirm final render remains behind human QA and approval."
    ]
  };
}

export function generateAssetsForQueueItem(item: ContentCalendarQueueItem): ContentCalendarQueueItem {
  const generatedAssets = createGeneratedAssetsForQueueItem(item);

  return {
    ...item,
    generatedAssets,
    updatedAt: generatedAssets.generatedAt
  };
}

export function packageQueueItem(item: ContentCalendarQueueItem): ContentCalendarQueueItem {
  const platformPackage = createPlatformPackageForQueueItem(item);
  const assetBrief = createAssetBriefForQueueItem(item);

  return {
    ...item,
    status: "packaged",
    platformPackage,
    assetBrief,
    generatedAssets: undefined,
    updatedAt: assetBrief.generatedAt
  };
}

export const psychedelicHarmReductionCalendarCsv = `day,week_theme,content_pillar,title,caption,cta,recommended_platform,format,safety_note
1,Awareness,Education,What Psychedelic Harm Reduction Means,"Psychedelic harm reduction is not an invitation to use substances. It is education for people who want to make safer, more informed decisions. It focuses on risk awareness, preparation, emotional safety, support systems, legal awareness, and integration. Psychedelics are not shortcuts or guaranteed healing tools. They require respect, context, and responsibility.",Comment CHECKLIST if you want a preparation checklist.,Instagram / Facebook / LinkedIn,Text post,"Education only. No substances, sourcing, dosage, medical advice, or legal advice."
2,Awareness,Education,5 Myths About Psychedelics,"Myth 1: Psychedelics cure everything. Myth 2: One experience changes your life forever. Myth 3: Natural means safe. Myth 4: A stronger experience is always better. Myth 5: Preparation is optional. A grounded approach means being honest about risks, limits, and the need for support before and after any experience.",Which myth have you heard most often?,Instagram / Facebook,Carousel,Avoids encouragement to use; focuses on risk literacy.
3,Awareness,Education,Set and Setting Explained,"Set is your internal state: mood, expectations, fears, stress level, and intention. Setting is your external environment: location, people, safety, and support. Both can strongly shape an experience. Harm reduction begins by asking: Am I emotionally stable? Is this environment safe? Do I have support? What is my plan if things become difficult?",Save this before making any psychedelic-related decision.,Instagram / TikTok / LinkedIn,Carousel or short video,General safety education only.
4,Awareness,Trust,What A Psychedelic Coach Should Not Promise,"Be cautious of anyone who promises guaranteed healing, no risk, spiritual awakening on demand, trauma cure, or life transformation in one session. Ethical support should include boundaries, consent, risk awareness, preparation, integration, and referral to medical or mental health professionals when needed.",Use this as a red flag checklist.,Instagram / LinkedIn,Text post,Does not advertise treatment or medical outcomes.
5,Awareness,Trust,Why I Care About Harm Reduction,"I care about harm reduction because people deserve honest information, not hype. Many approach psychedelics with pain, high expectations, or incomplete knowledge. My work is about slowing down, asking better questions, understanding risk, and supporting integration. The goal is not to sell a miracle. The goal is safer, more grounded decision-making.",Message me if you want preparation or integration support.,Instagram / LinkedIn,Personal brand post,"Frames coaching as reflection and education, not treatment."
6,Awareness,Education,7 Questions Before Any Psychedelic Decision,"Before any psychedelic-related decision, ask: Am I seeking healing or escape? Do I have mental health risks to discuss with a professional? Do I understand the legal risks? Do I have support after? Am I being pressured? Am I ready for difficult emotions? What is my integration plan? Sometimes the safest choice is to wait.",Comment 7Q for a checklist version.,Instagram / Facebook,Checklist post,Encourages caution and professional support.
7,Awareness,Conversion,What Is A Harm Reduction Planning Session?,"A harm reduction planning session helps you think clearly before a psychedelic-related decision. It does not include sourcing, dosage guidance, medical advice, legal advice, or encouragement to use. It can help explore intention, readiness, risks, set and setting, emotional safety, support systems, and integration planning.",Message PLAN if you want details.,Instagram / LinkedIn,Offer post,Clear scope boundaries and no illegal guidance.
8,Preparation,Education,Intention Is Not A Wish,"An intention is not a wish for a perfect outcome. It is an honest question you bring to yourself. What do I want to understand? What am I avoiding? What am I ready to face? What support do I need? A useful intention is not always beautiful. It is clear, grounded, and honest.",Write one honest intention in your journal today.,Instagram / Threads,Text post,Self-reflection only.
9,Preparation,Education,Preparation Does Not Mean Control,"Preparation does not guarantee a good experience or allow you to control everything. It helps you reduce some risks, understand your boundaries, plan support, and avoid impulsive decisions. Harm reduction is not certainty. It is responsibility.",Save this if you prefer grounded education over hype.,Instagram / LinkedIn,Text post,Avoids guarantees and outcome claims.
10,Preparation,Education,When Waiting May Be The Safest Option,"Waiting may be wise if you are in crisis, recently experienced major loss, feel pressured, expect one experience to fix your life, lack support, do not understand legal risks, or have a history of psychosis or bipolar mania. This is not a diagnosis. It is an invitation to slow down and seek appropriate professional guidance.","If unsure, speak with a qualified professional first.",Instagram / LinkedIn,Carousel,Encourages delay and professional care.
11,Preparation,Education,Build An Emotional Safety Plan,"An emotional safety plan can include: who to contact if distressed, grounding tools, a calm environment, post-experience rest, emergency resources, and a plan for difficult thoughts. Harm reduction includes before, during, and after. Safety is not only physical; it is emotional and relational too.",Comment SAFE if you want a template.,Instagram / Facebook,Checklist post,Safety planning only; no use instructions.
12,Preparation,Trust,Red Flags In A Guide Or Coach,"Red flags include: promising guaranteed healing, ignoring consent, minimizing risk, pressuring you, avoiding mental health screening, acting like a guru, discouraging outside support, or skipping integration. Safe support should increase your agency, not your dependency.",Share this with someone researching support options.,Instagram / LinkedIn,Carousel,Promotes ethical boundaries.
13,Preparation,Education,Legal Awareness Is Harm Reduction,"Harm reduction includes knowing the law in your location. Understand legal risks, advertising rules, possession risks, and the boundaries of coaching. Legal awareness is not fear; it is part of responsible decision-making.",Check the laws in your own location before making decisions.,LinkedIn / Instagram,Text post,No legal advice; encourages local legal awareness.
14,Preparation,Conversion,Preparation Support Session,"If you are curious but unsure how to think about readiness, risk, intention, support, and integration, a preparation support session may help. This is not therapy, medical advice, legal advice, sourcing, dosage guidance, or encouragement to use. It is a grounded conversation for safer decision-making.",Message PREP if you want details.,Instagram / LinkedIn,Offer post,Clear service scope and disclaimers.
15,Integration,Education,What Integration Really Means,"Integration is the process of bringing insights into daily life. It is not only retelling an experience or chasing symbols. It means reflecting, grounding, separating insight from impulse, taking small actions, and getting support when needed. An experience may open a door, but integration is how you walk through it responsibly.",Comment INTEGRATE if you want support prompts.,Instagram / LinkedIn,Educational post,Post-experience support only.
16,Integration,Education,Do Not Rush Major Life Decisions,"After an intense experience, you may feel tempted to quit a job, end a relationship, move, or reinvent your life immediately. Some insights may matter, but your nervous system may still be sensitive. Write it down, rest, talk to trusted support, and revisit big decisions when grounded.",Save this for after intense experiences.,Instagram / Threads,Text post,Encourages caution and delay.
17,Integration,Education,7 Integration Journal Questions,Ask: What did I notice? What felt true? What might be fear or overwhelm? What does my body feel now? What should I not interpret too quickly? What small safe action can I take? What support do I need? Integration is not forcing answers. It is listening responsibly.,Use these as journal prompts this week.,Instagram / Newsletter,Carousel,Journaling and reflection only.
18,Integration,Trust,Difficult Experiences Need Care,"A difficult psychedelic experience does not mean you failed. It also does not automatically mean it was beneficial. It may involve fear, confusion, trauma activation, or emotional overwhelm. The key question is: what kind of care and support do I need now? If you feel unsafe or at risk of self-harm, contact emergency or professional help immediately.",You do not have to process difficult experiences alone.,Instagram / LinkedIn,Text post,Includes crisis safety guidance.
19,Integration,Education,Integration Can Look Boring,"Integration can look like sleeping enough, eating well, journaling, returning to therapy, apologizing, setting a boundary, reducing stimulation, or taking one small honest action. Breakthroughs are not always dramatic. Lasting change often comes from small practices repeated over time.",What is one small grounded action you can take today?,Instagram / Facebook,Text post,"Grounded behavior change, no medical claims."
20,Integration,Education,When To Seek Professional Help,"Seek professional help if panic persists, sleep is severely disrupted, thoughts feel dangerously fast, reality feels unstable, trauma flashbacks become intense, self-harm thoughts appear, or daily functioning becomes difficult. Coaching has limits. Some situations belong with licensed medical or mental health professionals.",Safety matters more than interpretation.,LinkedIn / Instagram,Educational post,Encourages appropriate clinical care.
21,Integration,Conversion,Integration Coaching Session,"Integration coaching may help if you have insights but do not know how to apply them, feel confused, want grounded reflection, or need help separating insight from impulse. It is not therapy, medical care, diagnosis, or guru-style interpretation. It is structured reflection and next-step planning.",Message INTEGRATION if you want details.,Instagram / LinkedIn,Offer post,Clear boundaries and no treatment claims.
22,Authority,Education,Coaching vs Therapy vs Medical Care,"Coaching may support reflection, intention, preparation, and integration planning. Therapy supports clinical mental health treatment. Medical care supports medication interactions, psychiatric history, physical risk, and emergency symptoms. A responsible coach knows when to refer out.",Boundaries are part of safety.,LinkedIn / Instagram,Carousel,Defines scope without overclaiming.
23,Authority,Trust,How I Work,"My approach is simple: no hype, no pressure, no sourcing, no dosage guidance, no medical claims, no guaranteed outcomes. I ask grounded questions, support preparation and integration, and help you think more clearly. The goal is not dependence. The goal is informed self-leadership.","If this approach resonates, message me.",Instagram / LinkedIn,Personal brand post,Ethical positioning.
24,Authority,Education,10 Journal Prompts For Preparation And Integration,Try these prompts: What am I seeking? What am I avoiding? What do I fear? What support do I need? What red flags should I not ignore? How will I care for myself afterward? Which insight needs time? Who should I consult? What if waiting is the right choice? What is one safe next step?,Comment JOURNAL if you want a worksheet.,Instagram / Newsletter,Carousel,Reflection tool only.
25,Authority,Education,A Grounded Integration Example,"Imagine someone has a powerful experience and wants to change everything within 48 hours. A grounded integration approach would be: write the insight down, rest, talk with trusted support, avoid major decisions immediately, separate truth from nervous system activation, and choose one small safe action.",Integration respects insight without obeying every impulse.,Instagram / LinkedIn,Story post,No personal medical advice.
26,Conversion,Conversion,Free Preparation Checklist,"I am creating a free Psychedelic Harm Reduction Preparation Checklist. It includes readiness questions, set and setting prompts, emotional safety planning, integration prompts, red flags, and professional support reminders. It is for education and safer decision-making, not encouragement to use.",Comment CHECKLIST if you want it.,Instagram / Facebook,Lead magnet post,Lead magnet framed as education.
27,Conversion,Trust,FAQ: Harm Reduction Coaching,"Do I sell or source substances? No. Do I provide dosage guidance? No. Do I tell you whether to use? No. Am I a therapist or doctor? No. What do I help with? Preparation, reflection, harm reduction planning, integration, and grounded decision-making within clear boundaries.",Send me any other questions.,Instagram / LinkedIn,FAQ post,Clear prohibited services.
28,Conversion,Conversion,Private Sessions Available,"I offer limited private sessions for preparation support, harm reduction planning, integration reflection, grounding, and emotional safety planning. This is not therapy, medical advice, legal advice, sourcing, or encouragement to use. It is for people who want a grounded, non-hype space to think clearly.",Message SESSION if you want details.,Instagram / LinkedIn,Offer post,Explicit boundaries.
29,Authority,Education,Psychedelics Are Not Shortcuts,"Psychedelics are often marketed as shortcuts, but meaningful change requires preparation, humility, support, and integration. A powerful experience without grounded follow-through can fade or create confusion. The real work is not chasing intensity. It is building a safer relationship with yourself and your choices.",Comment ARTICLE if you want the full article.,Newsletter / LinkedIn,Long-form post,Educational and non-promotional.
30,Authority,Trust,A Harm Reduction Manifesto,"Psychedelics are not toys, shortcuts, or guaranteed cures. I believe in knowledge, honesty, consent, preparation, legal awareness, psychological humility, integration, and support. The first question is not how to use. The first question is: am I ready, informed, supported, and safe?",Follow for grounded psychedelic harm reduction education.,Instagram / LinkedIn,Manifesto post,Brand statement with safety-first framing.`;

export const psychedelicHarmReductionCalendarRows = parseContentCalendarCsv(
  psychedelicHarmReductionCalendarCsv
);

export function getSeedContentCalendarQueue(clientChannelId: string) {
  if (clientChannelId !== "psychedelic-harm-reduction") {
    return [];
  }

  return createContentCalendarQueueItems(clientChannelId, psychedelicHarmReductionCalendarRows, {
    source: "seed",
    sourceLabel: "psychedelic-harm-reduction-30-day-content-calendar-en.csv"
  });
}

export function getAllSeedContentCalendarQueue() {
  return getSeedContentCalendarQueue("psychedelic-harm-reduction");
}
