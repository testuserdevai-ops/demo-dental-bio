import { describe, expect, test } from "bun:test";

import {
  getTrustPriorityInformation,
  normalizeTrustFirstHttpUrl,
  selectTrustFirstBlogGroups,
} from "./trust-first-template";

describe("Trust-First Family Practice template state", () => {
  test("keeps every enabled valid saved blog in owner order without a cap", () => {
    const selected = selectTrustFirstBlogGroups([
      {
        id: 81,
        name: "Family visits",
        enabled: true,
        blogs: Array.from({ length: 4 }, (_, index) => ({
          id: 810 + index,
          group_id: 81,
          title: `Family visit ${index + 1}`,
          slug: `family-visit-${index + 1}`,
          image_url: index === 0 ? "/previews/preview-1.webp" : null,
          enabled: true,
        })),
      },
      {
        id: 82,
        name: "At-home support",
        enabled: true,
        blogs: [
          {
            id: 820,
            group_id: 82,
            title: "Building a brushing routine",
            slug: "building-a-brushing-routine",
            image_url: "https://cdn.example.com/brushing.webp",
            enabled: true,
          },
          {
            id: 821,
            group_id: 82,
            title: "Preparing an anxious child",
            slug: "preparing-an-anxious-child",
            image_url: null,
            enabled: true,
          },
        ],
      },
    ]);

    expect(selected.map(({ id }) => id)).toEqual([81, 82]);
    expect(selected.flatMap(({ blogs }) => blogs.map(({ id }) => id))).toEqual([
      810, 811, 812, 813, 820, 821,
    ]);
    expect(
      selected.flatMap(({ blogs }) => blogs.map(({ position }) => position)),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("fails closed for malformed, duplicate, disabled, unsafe, and unrelated blog records", () => {
    const selected = selectTrustFirstBlogGroups([
      null,
      { id: 81, name: "Hidden", enabled: false, blogs: [] },
      { id: 82, name: "   ", enabled: true, blogs: [] },
      {
        id: 83,
        name: "Safe guidance",
        enabled: true,
        blogs: [
          {
            id: 830,
            group_id: 83,
            title: "Safe article",
            slug: "safe-article",
            image_url: "/previews/preview-2.webp",
            enabled: true,
          },
          {
            id: 831,
            group_id: 83,
            title: "Unsafe media",
            slug: "unsafe-media",
            image_url: "https://owner:secret@example.com/cover.webp",
            enabled: true,
          },
          { id: 832, group_id: 83, title: " ", slug: "blank", enabled: true },
          {
            id: 833,
            group_id: 83,
            title: "Bad route",
            slug: "bad/route",
            enabled: true,
          },
          {
            id: 834,
            group_id: 99,
            title: "Wrong group",
            slug: "wrong-group",
            enabled: true,
          },
          {
            id: 830,
            group_id: 83,
            title: "Duplicate",
            slug: "duplicate",
            enabled: true,
          },
          {
            id: 835,
            group_id: 83,
            title: "Disabled",
            slug: "disabled",
            enabled: null,
          },
        ],
      },
      { id: 83, name: "Duplicate group", enabled: true, blogs: [] },
      { id: 84, name: "Malformed", enabled: true, blogs: {} as never },
    ] as never);

    expect(selected).toEqual([
      {
        id: 83,
        name: "Safe guidance",
        blogs: [
          {
            id: 830,
            title: "Safe article",
            slug: "safe-article",
            imageUrl: "/previews/preview-2.webp",
            position: 1,
          },
          {
            id: 831,
            title: "Unsafe media",
            slug: "unsafe-media",
            imageUrl: null,
            position: 2,
          },
        ],
      },
    ]);
    expect(selectTrustFirstBlogGroups(null)).toEqual([]);
  });

  test("maps only controlled practical-information answers", () => {
    expect(
      getTrustPriorityInformation({
        priorityInformation: ["anxiety-care", "accessibility"],
      }),
    ).toEqual([
      expect.objectContaining({
        id: "anxiety-care",
        title: "Anxiety-aware care",
      }),
      expect.objectContaining({
        id: "accessibility",
        title: "Accessible visits",
      }),
    ]);
  });

  test("accepts only HTTP(S) booking destinations", () => {
    expect(normalizeTrustFirstHttpUrl("example.com/book")).toBe(
      "https://example.com/book",
    );
    expect(normalizeTrustFirstHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeTrustFirstHttpUrl(null)).toBeNull();
  });
});
