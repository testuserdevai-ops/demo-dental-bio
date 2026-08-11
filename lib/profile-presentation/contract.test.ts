import { describe, expect, test } from "bun:test";

import {
  DEFAULT_PROFILE_PRESENTATION_CONFIGURATION,
  deriveProfilePresentationEntitlement,
  parseProfilePresentationConfiguration,
  resolveProfilePresentationConfiguration,
} from "./contract";

const free = { tier: "free" } as const;
const pro = { tier: "pro" } as const;

describe("profile presentation contract", () => {
  test("defaults missing configurations to the Basic compatibility template", () => {
    expect(resolveProfilePresentationConfiguration(null, free)).toEqual({
      configuration: DEFAULT_PROFILE_PRESENTATION_CONFIGURATION,
      reason: "missing",
    });
  });

  test("migrates the controlled legacy v0 envelope without owner-content changes", () => {
    expect(
      parseProfilePresentationConfiguration(
        {
          schema_version: 0,
          template_id: "direct-booking",
          theme_id: "warm-care",
          layout_variant: "classic-stack",
          answers: {
            primaryAction: "booking",
            featuredTreatmentIds: ["12", "18"],
          },
        },
        free,
      ),
    ).toEqual({
      schemaVersion: 1,
      templateId: "direct-booking",
      themeId: "warm-care",
      layoutVariant: "classic-stack",
      answers: {
        primaryAction: "booking",
        featuredTreatmentIds: ["12", "18"],
      },
    });
  });

  test("rejects unknown identifiers, answer keys, free text, and incompatible layouts", () => {
    const base = {
      schemaVersion: 1,
      templateId: "direct-booking",
      themeId: "clinical-light",
      layoutVariant: "classic-stack",
      answers: {},
    };

    for (const invalid of [
      { ...base, templateId: "arbitrary-template" },
      { ...base, themeId: "#ffffff" },
      { ...base, layoutVariant: "drag-anywhere" },
      { ...base, answers: { biography: "private free text" } },
      { ...base, answers: { featuredTreatmentIds: ["not-an-id"] } },
      { ...base, answers: { featuredTreatmentIds: ["0"] } },
      { ...base, layoutVariant: "editorial-split" },
      { ...base, destinationUrl: "https://example.test/private" },
    ]) {
      expect(() =>
        parseProfilePresentationConfiguration(invalid, pro),
      ).toThrow();
    }
  });

  test("enforces paid themes and layouts and safely resolves a downgrade", () => {
    const premium = {
      schemaVersion: 1,
      templateId: "cosmetic-transformation",
      themeId: "premium-contrast",
      layoutVariant: "hero-overlap",
      answers: { signatureTreatmentId: "42" },
    } as const;

    expect(parseProfilePresentationConfiguration(premium, pro)).toEqual(
      premium,
    );
    expect(() => parseProfilePresentationConfiguration(premium, free)).toThrow(
      "requires a paid plan",
    );
    expect(resolveProfilePresentationConfiguration(premium, free)).toEqual({
      configuration: {
        ...premium,
        themeId: "clinical-light",
        layoutVariant: "classic-stack",
      },
      reason: "entitlement-fallback",
    });
  });

  test("fails safely for retired, malformed, and future configurations", () => {
    const retired = {
      schemaVersion: 1,
      templateId: "retired-template",
      themeId: "clinical-light",
      layoutVariant: "classic-stack",
      answers: {},
    };
    const future = { ...retired, schemaVersion: 99 };

    expect(resolveProfilePresentationConfiguration(retired, pro)).toEqual({
      configuration: DEFAULT_PROFILE_PRESENTATION_CONFIGURATION,
      reason: "malformed",
    });
    expect(resolveProfilePresentationConfiguration(future, pro)).toEqual({
      configuration: DEFAULT_PROFILE_PRESENTATION_CONFIGURATION,
      reason: "unsupported-version",
    });
  });

  test("derives paid access only from controlled plan or an active trial", () => {
    const now = new Date("2026-08-11T12:00:00.000Z");
    expect(
      deriveProfilePresentationEntitlement(
        { subscription_status: "PRO", trial_end: null },
        now,
      ),
    ).toEqual(pro);
    expect(
      deriveProfilePresentationEntitlement(
        { subscription_status: "FREE", trial_end: "2026-08-12T00:00:00.000Z" },
        now,
      ),
    ).toEqual(pro);
    expect(
      deriveProfilePresentationEntitlement(
        { subscription_status: "FREE", trial_end: "2026-08-10T00:00:00.000Z" },
        now,
      ),
    ).toEqual(free);
  });
});
