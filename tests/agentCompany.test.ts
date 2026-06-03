import { describe, expect, it } from "vitest";
import {
  clientChannels,
  createInitialAgentCompanyProgress,
  getClientChannel,
  mergeAgentCompanyProgress
} from "../src/lib/agentCompany";

describe("agentCompany client channels", () => {
  it("starts new progress with the psychedelic harm-reduction channel", () => {
    const progress = createInitialAgentCompanyProgress();
    const channel = getClientChannel(progress.activeClientChannelId);

    expect(channel.id).toBe("psychedelic-harm-reduction");
    expect(progress.activeChannel).toBe(channel.activeChannel);
    expect(channel.calendarRows).toBe(30);
    expect(progress.contentQueue).toHaveLength(30);
  });

  it("keeps legacy AI tools progress mapped to the AI tools profile", () => {
    const progress = mergeAgentCompanyProgress({
      activeChannel: "AI tools explained in 60 seconds"
    });

    expect(progress.activeClientChannelId).toBe("ai-tools-shorts");
  });

  it("keeps all configured channel ids unique", () => {
    const ids = clientChannels.map((channel) => channel.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
