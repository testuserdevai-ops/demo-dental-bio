import { describe, expect, test } from "bun:test";

import { selectProfileTreatmentServices } from "./profile-treatment-services";

const row = (
  id: string,
  rank: number,
  isService: boolean | null,
  title = `Owner item ${id}`,
  description: string | null = `Owner description ${id}`,
) => ({
  treatment_id: id,
  rank,
  treatments: { title, description, isService },
});

describe("selectProfileTreatmentServices", () => {
  test("partitions every eligible row without a cap and orders each kind by rank then ID", () => {
    const input = [
      row("t-6", 6, false),
      row("s-2", 2, true),
      row("t-2", 2, false),
      row("t-1b", 1, false),
      row("s-1", 1, true),
      row("t-5", 5, false),
      row("t-4", 4, false),
      row("t-3", 3, null),
      row("t-1a", 1, false),
    ];

    const selected = selectProfileTreatmentServices(input as never);

    expect(selected.treatments.map(({ id }) => id)).toEqual([
      "t-1a",
      "t-1b",
      "t-2",
      "t-3",
      "t-4",
      "t-5",
      "t-6",
    ]);
    expect(selected.services.map(({ id }) => id)).toEqual(["s-1", "s-2"]);
    expect(selected.treatments.map(({ position }) => position)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(selected.services.map(({ position }) => position)).toEqual([1, 2]);
    expect(input.map(({ treatment_id }) => treatment_id)).toEqual([
      "t-6",
      "s-2",
      "t-2",
      "t-1b",
      "s-1",
      "t-5",
      "t-4",
      "t-3",
      "t-1a",
    ]);
  });

  test("fails closed for null relations and blank required owner titles", () => {
    const selected = selectProfileTreatmentServices([
      null,
      { treatment_id: "missing", rank: 1, treatments: null },
      row("blank", 2, false, "   "),
      row("service", 3, true, " Owner service ", "   "),
      row("treatment", 4, false, " Owner treatment ", " Detail "),
    ] as never);

    expect(selected).toEqual({
      treatments: [
        {
          id: "treatment",
          title: "Owner treatment",
          description: "Detail",
          rank: 4,
          position: 1,
          kind: "treatment",
        },
      ],
      services: [
        {
          id: "service",
          title: "Owner service",
          description: null,
          rank: 3,
          position: 1,
          kind: "service",
        },
      ],
    });
    expect(selectProfileTreatmentServices(null)).toEqual({
      treatments: [],
      services: [],
    });
  });
});
