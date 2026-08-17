import { describe, expect, test } from "bun:test";

import { normalizeProfileLinkHref, selectProfileLinks } from "./profile-links";

function link(id: string, overrides: Record<string, unknown> = {}) {
  return {
    links: {
      link_id: id,
      title: `Owner ${id}`,
      link: `https://example.test/${id}`,
      is_active: true,
      rank: 0,
      image_url: null,
      image_variant: "none",
      image_alt: null,
      image_decorative: true,
      is_featured: false,
      ...overrides,
    },
  };
}

describe("selectProfileLinks", () => {
  test("shows every eligible link by group/link rank without title classification or a cap", () => {
    const result = selectProfileLinks([
      {
        link_group_id: "later",
        heading: "Owner later heading",
        rank: 2,
        dentistry_links: [link("f", { rank: 2 }), link("e", { rank: 1 })],
      },
      {
        link_group_id: "first",
        heading: "  Owner first heading  ",
        rank: 1,
        dentistry_links: [
          link("d", { rank: 4, title: "Something unmatched" }),
          link("b", { rank: 2 }),
          link("c", { rank: 3 }),
          link("a", { rank: 1 }),
        ],
      },
    ]);

    expect(result.map((group) => group.id)).toEqual(["first", "later"]);
    expect(
      result.flatMap((group) => group.links.map((item) => item.id)),
    ).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(
      result.flatMap((group) => group.links.map((item) => item.position)),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("fails closed for inactive, malformed, credential-bearing, untitled, and null rows", () => {
    const result = selectProfileLinks([
      null,
      {
        link_group_id: "safe-group",
        heading: " ",
        rank: null,
        dentistry_links: [
          link("safe"),
          link("disabled", { is_active: false }),
          link("http", { link: "http://example.test" }),
          link("credential", { link: "https://user:secret@example.test" }),
          link("script", { link: "javascript:alert(1)" }),
          link("untitled", { title: " " }),
          { links: null },
        ],
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ heading: null });
    expect(result[0]?.links.map((item) => item.id)).toEqual(["safe"]);
    expect(selectProfileLinks(null)).toEqual([]);
  });
});

describe("normalizeProfileLinkHref", () => {
  test("accepts only credential-free HTTPS URLs", () => {
    expect(normalizeProfileLinkHref(" https://example.test/path ")).toBe(
      "https://example.test/path",
    );
    expect(normalizeProfileLinkHref("http://example.test")).toBeNull();
    expect(normalizeProfileLinkHref("https://u:p@example.test")).toBeNull();
    expect(normalizeProfileLinkHref(null)).toBeNull();
  });
});
