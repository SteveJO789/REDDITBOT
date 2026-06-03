import { describe, expect, it } from "vitest";
import {
  createGeneratedAssetsForQueueItem,
  createAssetBriefForQueueItem,
  canPackageQueueItem,
  createContentCalendarQueueItems,
  createScriptDraftFromQueueItem,
  generateAssetsForQueueItem,
  mergeContentCalendarQueue,
  packageQueueItem,
  parseContentCalendarCsv,
  psychedelicHarmReductionCalendarCsv,
  psychedelicHarmReductionCalendarRows,
  reviewQueueItemScriptPolicy,
  reviewScriptDraftPolicy
} from "../src/lib/contentCalendar";

describe("contentCalendar", () => {
  it("parses the psychedelic harm-reduction seed calendar", () => {
    const rows = parseContentCalendarCsv(psychedelicHarmReductionCalendarCsv);

    expect(rows).toHaveLength(30);
    expect(rows[0]).toMatchObject({
      day: 1,
      weekTheme: "Awareness",
      contentPillar: "Education",
      title: "What Psychedelic Harm Reduction Means",
      recommendedPlatforms: ["Instagram", "Facebook", "LinkedIn"]
    });
    expect(rows[29].title).toBe("A Harm Reduction Manifesto");
  });

  it("creates stable queue ids for a client channel", () => {
    const queue = createContentCalendarQueueItems(
      "psychedelic-harm-reduction",
      psychedelicHarmReductionCalendarRows
    );

    expect(queue[0].id).toBe("psychedelic-harm-reduction-day-01");
    expect(queue[0].status).toBe("queued");
    expect(queue[29].id).toBe("psychedelic-harm-reduction-day-30");
  });

  it("preserves workflow status when seed rows are refreshed", () => {
    const queue = createContentCalendarQueueItems(
      "psychedelic-harm-reduction",
      psychedelicHarmReductionCalendarRows
    );
    const scriptDraft = createScriptDraftFromQueueItem(queue[0]);
    const changedQueue = [
      {
        ...queue[0],
        status: "approved" as const,
        scriptDraft,
        updatedAt: "2026-06-03T00:00:00.000Z"
      }
    ];

    const merged = mergeContentCalendarQueue(changedQueue, queue);

    expect(merged[0].status).toBe("approved");
    expect(merged[0].scriptDraft?.scriptId).toBe(scriptDraft.scriptId);
    expect(merged[0].updatedAt).toBe("2026-06-03T00:00:00.000Z");
    expect(merged).toHaveLength(30);
  });

  it("creates a script draft from a queue item", () => {
    const [item] = createContentCalendarQueueItems(
      "psychedelic-harm-reduction",
      psychedelicHarmReductionCalendarRows
    );
    const scriptDraft = createScriptDraftFromQueueItem(item);

    expect(scriptDraft.sourceQueueItemId).toBe(item.id);
    expect(scriptDraft.estimatedDurationSeconds).toBeGreaterThanOrEqual(30);
    expect(scriptDraft.estimatedDurationSeconds).toBeLessThanOrEqual(60);
    expect(scriptDraft.safetyBoundaries.mustNotInclude).toContain("No dosing instructions.");
  });

  it("runs policy review and keeps human approval required", () => {
    const [item] = createContentCalendarQueueItems(
      "psychedelic-harm-reduction",
      psychedelicHarmReductionCalendarRows
    );
    const reviewedItem = reviewQueueItemScriptPolicy({
      ...item,
      scriptDraft: createScriptDraftFromQueueItem(item)
    });

    expect(reviewedItem.policyReview?.decision).toBe("pass");
    expect(reviewedItem.policyReview?.finalHumanReviewRequired).toBe(true);
    expect(reviewedItem.status).toBe("policy_review");
  });

  it("blocks dosage guidance in public script text", () => {
    const [item] = createContentCalendarQueueItems(
      "psychedelic-harm-reduction",
      psychedelicHarmReductionCalendarRows
    );
    const scriptDraft = createScriptDraftFromQueueItem(item);
    const review = reviewScriptDraftPolicy({
      ...scriptDraft,
      voiceover: [
        {
          beat: 1,
          timestampRange: "0-10s",
          line: "Take 5mg before journaling.",
          purpose: "educate"
        }
      ]
    });

    expect(review.decision).toBe("block");
    expect(review.blockedCategories).toContain("dosage_guidance");
  });

  it("packages only policy-passed and human-approved scripts", () => {
    const [item] = createContentCalendarQueueItems(
      "psychedelic-harm-reduction",
      psychedelicHarmReductionCalendarRows
    );
    const reviewedItem = reviewQueueItemScriptPolicy({
      ...item,
      scriptDraft: createScriptDraftFromQueueItem(item)
    });

    expect(canPackageQueueItem(reviewedItem)).toBe(false);

    const approvedItem = {
      ...reviewedItem,
      scriptDraft: {
        ...reviewedItem.scriptDraft!,
        reviewStatus: "approved" as const
      }
    };
    const packagedItem = packageQueueItem(approvedItem);

    expect(canPackageQueueItem(approvedItem)).toBe(true);
    expect(packagedItem.status).toBe("packaged");
    expect(packagedItem.platformPackage?.drafts).toHaveLength(6);
    expect(packagedItem.assetBrief?.status).toBe("brief_only");
    expect(packagedItem.assetBrief?.humanApprovalRequired).toBe(true);
    expect(packagedItem.platformPackage?.drafts.every((draft) => draft.automationStatus === "draft_only")).toBe(true);
  });

  it("creates a gated video asset brief for approved scripts", () => {
    const [item] = createContentCalendarQueueItems(
      "psychedelic-harm-reduction",
      psychedelicHarmReductionCalendarRows
    );
    const reviewedItem = reviewQueueItemScriptPolicy({
      ...item,
      scriptDraft: createScriptDraftFromQueueItem(item)
    });

    expect(() => createAssetBriefForQueueItem(reviewedItem)).toThrow(
      "Queue item must have passed policy review and human script approval before creating an asset brief."
    );

    const approvedItem = {
      ...reviewedItem,
      scriptDraft: {
        ...reviewedItem.scriptDraft!,
        reviewStatus: "approved" as const
      }
    };
    const assetBrief = createAssetBriefForQueueItem(approvedItem);

    expect(assetBrief.sourceQueueItemId).toBe(item.id);
    expect(assetBrief.sourceScriptId).toBe(approvedItem.scriptDraft.scriptId);
    expect(assetBrief.deliverables[0]).toMatchObject({
      format: "9:16 short video",
      aspectRatio: "9:16"
    });
    expect(assetBrief.scenes).toHaveLength(approvedItem.scriptDraft.sceneBeats.length);
    expect(assetBrief.visualPrompts.every((prompt) => prompt.licenseRequirement === "generated_or_licensed_only")).toBe(
      true
    );
    expect(assetBrief.prohibitedVisuals.join(" ")).toContain("Substances");
  });

  it("generates draft assets from an approved asset brief", () => {
    const [item] = createContentCalendarQueueItems(
      "psychedelic-harm-reduction",
      psychedelicHarmReductionCalendarRows
    );
    const reviewedItem = reviewQueueItemScriptPolicy({
      ...item,
      scriptDraft: createScriptDraftFromQueueItem(item)
    });
    const approvedItem = {
      ...reviewedItem,
      scriptDraft: {
        ...reviewedItem.scriptDraft!,
        reviewStatus: "approved" as const
      }
    };

    expect(() => createGeneratedAssetsForQueueItem(approvedItem)).toThrow(
      "Queue item must have an approved asset brief before generating draft assets."
    );

    const packagedItem = packageQueueItem(approvedItem);
    const assetReadyItem = generateAssetsForQueueItem(packagedItem);
    const generatedAssets = assetReadyItem.generatedAssets!;

    expect(generatedAssets.status).toBe("draft_assets");
    expect(generatedAssets.renderReady).toBe(false);
    expect(generatedAssets.humanApprovalRequired).toBe(true);
    expect(generatedAssets.sourceBriefId).toBe(packagedItem.assetBrief?.briefId);
    expect(generatedAssets.assets.every((asset) => asset.automationStatus === "draft_asset")).toBe(true);
    expect(generatedAssets.assets.every((asset) => asset.humanApprovalRequired)).toBe(true);
    expect(generatedAssets.assets.map((asset) => asset.kind)).toEqual(
      expect.arrayContaining([
        "cover_image_prompt",
        "background_loop_prompt",
        "support_graphic_prompt",
        "text_card",
        "b_roll_list",
        "voiceover_script",
        "caption_file",
        "license_checklist"
      ])
    );
    expect(generatedAssets.renderInputs).toMatchObject({
      aspectRatio: "9:16",
      captionRequired: true,
      licenseReviewRequired: true
    });
  });
});
