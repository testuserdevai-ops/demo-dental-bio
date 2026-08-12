import { describe, expect, it } from "bun:test";
import {
  buildManagedCampaignUrl,
  validateManagedCampaign,
} from "./campaign-url";

const campaign = {
  campaignEnabled: true,
  campaignSource: "instagram",
  campaignMedium: "paid_social",
  campaignName: "summer-smiles",
  campaignContent: "profile-card",
  campaignTerm: "",
};

describe("managed campaign URLs", () => {
  it("preserves unrelated query parameters and fragments", () => {
    expect(
      buildManagedCampaignUrl(
        "https://booking.example/path?location=hove#book",
        campaign,
      ),
    ).toBe(
      "https://booking.example/path?location=hove&utm_source=instagram&utm_medium=paid_social&utm_campaign=summer-smiles&utm_content=profile-card#book",
    );
  });

  it("does not duplicate an existing managed UTM key", () => {
    expect(
      validateManagedCampaign(
        "https://booking.example/?utm_source=old&utm_source=second",
        campaign,
      ),
    ).toBe(
      "Remove the existing utm_source parameter before using the campaign builder",
    );
  });

  it("leaves a normalized destination unchanged when disabled", () => {
    expect(
      buildManagedCampaignUrl("booking.example/path#book", {
        ...campaign,
        campaignEnabled: false,
      }),
    ).toBe("https://booking.example/path#book");
  });

  it("rejects non-HTTP destinations", () => {
    expect(() =>
      buildManagedCampaignUrl("javascript:alert(1)", campaign),
    ).toThrow("Enter a valid HTTP(S) URL");
  });
});
