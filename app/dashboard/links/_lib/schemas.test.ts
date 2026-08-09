import { describe, expect, it } from "bun:test";
import {
  createLinkGroupInputSchema,
  createLinkInputSchema,
  reorderLinkGroupsInputSchema,
  updateLinkInputSchema,
} from "./schemas";

describe("link schemas", () => {
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
      }).url,
    ).toBe("https://example.test/path");
    expect(
      createLinkInputSchema.safeParse({
        linkGroupId: groupId,
        title: "Website",
        url: "javascript:alert(1)",
        isActive: true,
      }).success,
    ).toBe(false);
    expect(
      updateLinkInputSchema.safeParse({
        linkGroupId: groupId,
        linkId: crypto.randomUUID(),
        title: "Website",
        url: "https://example.test",
        isActive: true,
        rank: 1,
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
