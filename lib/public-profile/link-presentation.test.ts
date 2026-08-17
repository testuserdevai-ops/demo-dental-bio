import { describe, expect, test } from "bun:test";

import {
  DEFAULT_PUBLIC_LINK_PRESENTATION,
  publicLinkPresentationSchema,
  resolvePublicLinkPresentation,
} from "./link-presentation";

describe("public link presentation", () => {
  test("accepts both controlled image variants and text-only links", () => {
    expect(
      publicLinkPresentationSchema.parse({
        variant: "small-icon",
        imageUrl: "https://cdn.example.test/icon.webp",
        imageAlt: "Calendar",
        decorative: false,
        featured: true,
      }).variant,
    ).toBe("small-icon");
    expect(
      publicLinkPresentationSchema.parse({
        variant: "large-image",
        imageUrl: "https://cdn.example.test/card.webp",
        imageAlt: null,
        decorative: true,
        featured: false,
      }).variant,
    ).toBe("large-image");
    expect(
      publicLinkPresentationSchema.parse(DEFAULT_PUBLIC_LINK_PRESENTATION),
    ).toEqual(DEFAULT_PUBLIC_LINK_PRESENTATION);
  });

  test("rejects unsafe URLs, unknown fields, and incoherent alt policy", () => {
    expect(
      publicLinkPresentationSchema.safeParse({
        variant: "small-icon",
        imageUrl: "javascript:alert(1)",
        imageAlt: "Icon",
        decorative: false,
        featured: false,
      }).success,
    ).toBe(false);
    expect(
      publicLinkPresentationSchema.safeParse({
        variant: "large-image",
        imageUrl: "https://cdn.example.test/card.webp",
        imageAlt: null,
        decorative: false,
        featured: false,
      }).success,
    ).toBe(false);
    expect(
      publicLinkPresentationSchema.safeParse({
        ...DEFAULT_PUBLIC_LINK_PRESENTATION,
        destinationUrl: "https://private.example.test",
      }).success,
    ).toBe(false);
  });

  test("fails malformed or incomplete media safely to intentional text-only presentation", () => {
    expect(
      resolvePublicLinkPresentation({
        variant: "large-image",
        imageUrl: null,
        imageAlt: null,
        decorative: true,
        featured: true,
      }),
    ).toEqual(DEFAULT_PUBLIC_LINK_PRESENTATION);

    expect(
      resolvePublicLinkPresentation({
        variant: "large-image",
        imageUrl: "/previews/legacy-cover.webp",
        imageAlt: "Legacy cover",
        decorative: false,
        featured: false,
      }),
    ).toEqual(DEFAULT_PUBLIC_LINK_PRESENTATION);

    expect(
      resolvePublicLinkPresentation({
        variant: "small-icon",
        imageUrl: "not a url",
        imageAlt: "Broken icon",
        decorative: false,
        featured: false,
      }),
    ).toEqual(DEFAULT_PUBLIC_LINK_PRESENTATION);
  });
});
