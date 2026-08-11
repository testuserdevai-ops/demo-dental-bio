import { describe, expect, it } from "bun:test";

import { PROFILE_TEMPLATE_IDS } from "@/lib/profile-presentation/catalog";

import { PROFILE_TEMPLATE_CHOICES } from "./chooser-options";
import { PROFILE_TEMPLATE_PREVIEWS } from "./template-preview-manifest";

describe("onboarding chooser catalog", () => {
  it("gives Basic and all eight templates a name, purpose, and preview state", () => {
    expect(PROFILE_TEMPLATE_CHOICES.map((choice) => choice.id)).toEqual([
      ...PROFILE_TEMPLATE_IDS,
    ]);
    expect(Object.keys(PROFILE_TEMPLATE_PREVIEWS)).toEqual([
      ...PROFILE_TEMPLATE_IDS,
    ]);
    for (const choice of PROFILE_TEMPLATE_CHOICES) {
      expect(choice.name.length).toBeGreaterThan(0);
      expect(choice.purpose.length).toBeGreaterThan(30);
      expect(choice.structure.length).toBeGreaterThan(0);
    }
  });

  it("requires meaningful alt text for screenshots and decorative alt for explicit placeholders", () => {
    for (const preview of Object.values(PROFILE_TEMPLATE_PREVIEWS)) {
      if (preview.status === "available") {
        expect(preview.alt.length).toBeGreaterThan(30);
        expect(preview.src.endsWith(".webp")).toBe(true);
      } else {
        expect(preview.alt).toBe("");
        expect(preview.reason.length).toBeGreaterThan(20);
      }
    }
  });

  it("uses the stable seeded Direct Booking capture in its selector preview", () => {
    expect(PROFILE_TEMPLATE_PREVIEWS["direct-booking"]).toEqual({
      status: "available",
      src: "/previews/template-direct-booking.webp",
      alt: "Direct Booking profile with a clinician portrait, appointment action, supporting website link, featured treatments, and a practice location image.",
    });
  });

  it("uses the stable seeded Location Router capture in its selector preview", () => {
    expect(PROFILE_TEMPLATE_PREVIEWS["location-provider-router"]).toEqual({
      status: "available",
      src: "/previews/template-location-router.webp",
      alt: "Location Router profile showing its practice introduction, labelled location selector, and selected practice address card.",
    });
  });

  it("uses the stable seeded Services Catalogue capture in its selector preview", () => {
    expect(PROFILE_TEMPLATE_PREVIEWS["services-catalogue"]).toEqual({
      status: "available",
      src: "/previews/template-services-catalogue.webp",
      alt: "Services Catalogue profile with a large clinician portrait, clear care introduction, and prominent consultation action.",
    });
  });

  it("uses the stable seeded Trust-First capture in its selector preview", () => {
    expect(PROFILE_TEMPLATE_PREVIEWS["trust-first-family-practice"]).toEqual({
      status: "available",
      src: "/previews/template-trust-first.webp",
      alt: "Trust-First Family Practice profile showing warm patient photography, a reassurance statement, and immediate family booking and call actions.",
    });
    expect(PROFILE_TEMPLATE_PREVIEWS["clinic-commerce"]).toEqual({
      status: "available",
      src: "/previews/template-clinic-commerce.webp",
      alt: "Clinic and Commerce profile with a clinician portrait, clinic booking action, shop path, and a curated featured-product section.",
    });
  });

  it("uses the stable seeded Cosmetic Transformation capture in its selector preview", () => {
    expect(PROFILE_TEMPLATE_PREVIEWS["cosmetic-transformation"]).toEqual({
      status: "available",
      src: "/previews/template-cosmetic-results.webp",
      alt: "Cosmetic Transformation profile with a consultation hero, overlapping clinician portrait, immediate consultation action, and signature treatment card.",
    });
  });

  it("uses the stable seeded Specialist Assessment capture in its selector preview", () => {
    expect(PROFILE_TEMPLATE_PREVIEWS["specialist-assessment"]).toEqual({
      status: "available",
      src: "/previews/template-specialist-assessment.webp",
      alt: "Specialist Assessment profile with a clinician portrait, focused tooth-pain guidance, immediate assessment and consultation actions, and referral guidance.",
    });
  });

  it("uses the stable seeded Expert and Educator capture in its selector preview", () => {
    expect(PROFILE_TEMPLATE_PREVIEWS["expert-educator"]).toEqual({
      status: "available",
      src: "/previews/template-expert-educator.webp",
      alt: "Expert and Educator profile with a professional portrait, patient and professional audience paths, immediate consultation and collaboration actions, and editorial positioning.",
    });
  });
});
