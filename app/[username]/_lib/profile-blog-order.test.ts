import { describe, expect, test } from "bun:test";

import { selectCommerceBlogGroups } from "./clinic-commerce-template";
import { selectCosmeticBlogGroups } from "./cosmetic-transformation-template";
import { selectDirectBookingBlogGroups } from "./direct-booking-template";
import { selectExpertBlogGroups } from "./expert-educator-template";
import { createLocationRouterBlogSections } from "./location-router-template";
import {
  orderPublicBlogGroups,
  orderPublicBlogQuery,
} from "./profile-blog-order";
import { selectCatalogueBlogGroups } from "./services-catalogue-template";
import { selectSpecialistBlogGroups } from "./specialist-assessment-template";
import { selectTrustFirstBlogGroups } from "./trust-first-template";

const selectors = [
  ["Clinic Commerce", selectCommerceBlogGroups],
  ["Cosmetic Transformation", selectCosmeticBlogGroups],
  ["Direct Booking", selectDirectBookingBlogGroups],
  ["Expert Educator", selectExpertBlogGroups],
  ["Location Router", createLocationRouterBlogSections],
  ["Services Catalogue", selectCatalogueBlogGroups],
  ["Specialist Assessment", selectSpecialistBlogGroups],
  ["Trust-First", selectTrustFirstBlogGroups],
] as const;

const tiedRankInventory = [
  {
    id: 20,
    rank: 1,
    name: "Later ID",
    enabled: true,
    blogs: [
      {
        id: 202,
        group_id: 20,
        rank: 1,
        title: "Post 202",
        slug: "post-202",
        image_url: null,
        enabled: true,
      },
      {
        id: 201,
        group_id: 20,
        rank: 1,
        title: "Post 201",
        slug: "post-201",
        image_url: null,
        enabled: true,
      },
    ],
  },
  {
    id: 10,
    rank: 1,
    name: "Earlier ID",
    enabled: true,
    blogs: [
      {
        id: 102,
        group_id: 10,
        rank: 1,
        title: "Post 102",
        slug: "post-102",
        image_url: null,
        enabled: true,
      },
      {
        id: 101,
        group_id: 10,
        rank: 1,
        title: "Post 101",
        slug: "post-101",
        image_url: null,
        enabled: true,
      },
    ],
  },
] as const;

describe("public blog rank ordering", () => {
  for (const [template, select] of selectors) {
    test(`${template} orders tied group and post ranks by immutable ID`, () => {
      const result = select(tiedRankInventory as never);

      expect(result.map((group) => group.id)).toEqual([10, 20]);
      expect(
        result.flatMap((group) => group.blogs.map((blog) => blog.id)),
      ).toEqual([101, 102, 201, 202]);
    });
  }

  test("does not mutate the embedded query result while sorting", () => {
    const ordered = orderPublicBlogGroups(tiedRankInventory);

    expect(ordered.map((group) => group.id)).toEqual([10, 20]);
    expect(tiedRankInventory.map((group) => group.id)).toEqual([20, 10]);
    expect(tiedRankInventory[0].blogs.map((blog) => blog.id)).toEqual([
      202, 201,
    ]);
  });

  test("applies rank then ID at both Supabase relation levels", () => {
    const calls: Array<[string, { referencedTable: "blogs" }?]> = [];
    const query = {
      order(column: string, options?: { referencedTable: "blogs" }) {
        calls.push([column, options]);
        return this;
      },
    };

    expect(orderPublicBlogQuery(query)).toBe(query);
    expect(calls).toEqual([
      ["rank", undefined],
      ["id", undefined],
      ["rank", { referencedTable: "blogs" }],
      ["id", { referencedTable: "blogs" }],
    ]);
  });
});

describe("malformed Cosmetic and Expert blog relations", () => {
  for (const [template, select] of [
    ["Cosmetic Transformation", selectCosmeticBlogGroups],
    ["Expert Educator", selectExpertBlogGroups],
  ] as const) {
    test(`${template} ignores nulls, duplicates, and mismatched relations`, () => {
      const valid = {
        id: 101,
        group_id: 10,
        rank: 1,
        title: "Valid post",
        slug: "valid-post",
        image_url: null,
        enabled: true,
      };
      const result = select([
        null,
        {
          id: 10,
          rank: 1,
          name: "Owner group",
          enabled: true,
          blogs: [
            null,
            valid,
            { ...valid, title: "Duplicate post" },
            { ...valid, id: 102, group_id: 99, title: "Wrong group" },
          ],
        },
        {
          id: 10,
          rank: 2,
          name: "Duplicate group",
          enabled: true,
          blogs: [{ ...valid, id: 103, title: "Duplicate group post" }],
        },
      ] as never);

      expect(result).toEqual([
        {
          id: 10,
          name: "Owner group",
          blogs: [
            {
              id: 101,
              title: "Valid post",
              slug: "valid-post",
              imageUrl: null,
              position: 1,
            },
          ],
        },
      ]);
    });
  }
});
