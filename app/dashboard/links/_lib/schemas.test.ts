import { describe, expect, it } from "bun:test";
import {
  createLinkGroupInputSchema,
  createLinkInputSchema,
  reorderLinkGroupsInputSchema,
  updateLinkInputSchema,
} from "./schemas";

describe("link schemas", () => {
  const textOnly = {
    imageUrl: null,
    imageVariant: "none" as const,
    imageAlt: null,
    imageDecorative: true,
    isFeatured: false,
  };
  it("accepts controlled group fields only", () => {
    expect(createLinkGroupInputSchema.parse({ heading: "Resources" })).toEqual({
      heading: "Resources",
    });
    expect(
      createLinkGroupInputSchema.safeParse({
        heading: "Resources",
        dentistryId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
    expect(createLinkGroupInputSchema.safeParse({ heading: "" }).success).toBe(
      false,
    );
  });

  it("normalizes bare URLs and rejects unsafe protocols and extra authority", () => {
    const groupId = crypto.randomUUID();
    expect(
      createLinkInputSchema.parse({
        linkGroupId: groupId,
        title: "Website",
        url: "example.test/path",
        isActive: true,
        ...textOnly,
      }).url,
    ).toBe("https://example.test/path");
    expect(
      createLinkInputSchema.safeParse({
        linkGroupId: groupId,
        title: "Website",
        url: "javascript:alert(1)",
        isActive: true,
        ...textOnly,
      }).success,
    ).toBe(false);
    expect(
      updateLinkInputSchema.safeParse({
        linkGroupId: groupId,
        linkId: crypto.randomUUID(),
        title: "Website",
        url: "https://example.test",
        isActive: true,
        ...textOnly,
        rank: 1,
      }).success,
    ).toBe(false);
  });

  it("enforces controlled variants and coherent alt text", () => {
    const base = {
      linkGroupId: crypto.randomUUID(),
      title: "Booking",
      url: "https://example.test/book",
      isActive: true,
      isFeatured: true,
    };
    expect(
      createLinkInputSchema.safeParse({
        ...base,
        imageUrl: "https://storage.test/icon.webp",
        imageVariant: "small-icon",
        imageAlt: "Calendar",
        imageDecorative: false,
      }).success,
    ).toBe(true);
    expect(
      createLinkInputSchema.safeParse({
        ...base,
        imageUrl: "https://storage.test/card.webp",
        imageVariant: "large-image",
        imageAlt: null,
        imageDecorative: false,
      }).success,
    ).toBe(false);
    expect(
      createLinkInputSchema.safeParse({
        ...base,
        ...textOnly,
        imageVariant: "automatic-thumbnail",
      }).success,
    ).toBe(false);
  });

  it("requires a nonempty unique UUID reorder set", () => {
    const id = crypto.randomUUID();
    expect(
      reorderLinkGroupsInputSchema.safeParse({ orderedIds: [] }).success,
    ).toBe(false);
    expect(
      reorderLinkGroupsInputSchema.safeParse({ orderedIds: [id, id] }).success,
    ).toBe(false);
    expect(
      reorderLinkGroupsInputSchema.parse({ orderedIds: [id] }).orderedIds,
    ).toEqual([id]);
  });
});
