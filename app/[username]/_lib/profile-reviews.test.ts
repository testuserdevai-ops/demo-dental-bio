import { describe, expect, test } from "bun:test";

import { selectProfileReviews } from "./profile-reviews";

function review(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    reviewer_name: `Reviewer ${id}`,
    content: `Owner review ${id}`,
    stars: 5,
    image_url: null,
    platform: `Platform ${id}`,
    created_at: `2026-01-${String(id).padStart(2, "0")}T09:00:00+00:00`,
    rank: id,
    enabled: true,
    ...overrides,
  };
}

describe("selectProfileReviews", () => {
  test("preserves the supplied eligible order without a visibility cap", () => {
    const rows = [4, 2, 5, 1, 3].map((id) => review(id));

    const result = selectProfileReviews(rows, []);

    expect(result.reviews.map(({ id }) => id)).toEqual([4, 2, 5, 1, 3]);
    expect(result.reviews.map(({ position }) => position)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  test("fails closed for unusable rows and assigns positions after filtering", () => {
    const result = selectProfileReviews(
      [
        review(11),
        review(0),
        review(12, { enabled: false }),
        review(13, { reviewer_name: " " }),
        review(14, { content: null }),
        review(15, { platform: "" }),
        review(16, { stars: 6 }),
        review(17, { created_at: "not-a-date" }),
        review(18),
      ],
      [],
    );

    expect(
      result.reviews.map(({ id, position }) => ({ id, position })),
    ).toEqual([
      { id: 11, position: 1 },
      { id: 18, position: 2 },
    ]);
  });

  test("drops unsafe optional media without consuming an otherwise valid card", () => {
    const result = selectProfileReviews(
      [
        review(1, { image_url: "/reviewer.webp" }),
        review(2, { image_url: "https://cdn.example/reviewer.webp" }),
        review(3, { image_url: "https://user:secret@cdn.example/a.webp" }),
        review(4, { image_url: "javascript:alert(1)" }),
      ],
      [],
    );

    expect(result.reviews.map(({ imageUrl }) => imageUrl)).toEqual([
      "/reviewer.webp",
      "https://cdn.example/reviewer.webp",
      null,
      null,
    ]);
  });

  test("keeps every credential-free HTTPS destination in supplied order", () => {
    const result = selectProfileReviews(
      [],
      [
        { id: 9, link: " https://reviews.example/owner " },
        { id: 7, link: "https://www.directory.example/profile?tab=reviews" },
        { id: 8, link: "https://hidden.example/owner", enabled: false },
        { id: 0, link: "https://invalid-id.example" },
        { id: 6, link: "http://reviews.example/owner" },
        { id: 5, link: "https://owner:secret@reviews.example/owner" },
        { id: 4, link: "not a URL" },
        { id: 3, link: "https://reviews.example/owner\nunsafe" },
      ],
    );

    expect(result.externalReviewPages).toEqual([
      {
        id: 9,
        href: "https://reviews.example/owner",
        label: "reviews.example",
        position: 1,
      },
      {
        id: 7,
        href: "https://www.directory.example/profile?tab=reviews",
        label: "directory.example",
        position: 2,
      },
    ]);
  });

  test("keeps a safe external destination reachable with zero review cards", () => {
    expect(
      selectProfileReviews(null, [
        { id: 101, link: "https://reviews.example/zero-cards" },
      ]),
    ).toEqual({
      reviews: [],
      externalReviewPages: [
        {
          id: 101,
          href: "https://reviews.example/zero-cards",
          label: "reviews.example",
          position: 1,
        },
      ],
    });
    expect(selectProfileReviews(undefined, undefined)).toEqual({
      reviews: [],
      externalReviewPages: [],
    });
  });
});
