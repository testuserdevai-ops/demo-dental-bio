import { describe, expect, test } from "bun:test";

import {
  getTrustPriorityInformation,
  normalizeTrustFirstHttpUrl,
  selectTrustFirstReviews,
  selectTrustFirstTreatments,
} from "./trust-first-template";

const reviews = [
  { id: 2, content: "Second", stars: 5, rank: 2 },
  { id: 1, content: "First", stars: 5, rank: 1 },
  { id: 3, content: "", stars: null, rank: 3 },
];

describe("Trust-First Family Practice template state", () => {
  test("keeps configured reviews in answer order and ignores stale IDs", () => {
    expect(
      selectTrustFirstReviews(
        { featuredReviewIds: ["2", "999", "1"] },
        reviews,
      ).map(({ id }) => id),
    ).toEqual([2, 1]);
  });

  test("falls back to the first two useful reviews in display order", () => {
    expect(selectTrustFirstReviews({}, reviews).map(({ id }) => id)).toEqual([
      1, 2,
    ]);
  });

  test("shows no more than three ordered treatment records", () => {
    const treatments = [
      {
        treatment_id: "2",
        rank: 2,
        treatments: { title: "Two", description: null, isService: false },
      },
      {
        treatment_id: "service",
        rank: 1,
        treatments: { title: "Service", description: null, isService: true },
      },
      {
        treatment_id: "1",
        rank: 1,
        treatments: { title: "One", description: null, isService: false },
      },
      {
        treatment_id: "3",
        rank: 3,
        treatments: { title: "Three", description: null, isService: false },
      },
      {
        treatment_id: "4",
        rank: 4,
        treatments: { title: "Four", description: null, isService: false },
      },
    ];

    expect(
      selectTrustFirstTreatments(treatments).map(
        ({ treatment_id }) => treatment_id,
      ),
    ).toEqual(["1", "2", "3"]);
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
