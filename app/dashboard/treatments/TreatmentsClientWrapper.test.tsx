import { describe, expect, it } from "bun:test";
import { mergeKindOrder } from "./_lib/order";

describe("mergeKindOrder", () => {
  it("replaces one kind while preserving the complete mixed aggregate order", () => {
    expect(
      mergeKindOrder(
        {
          treatments: [
            {
              id: "treatment-a",
              title: "A",
              description: "",
              kind: "treatment",
              rank: 1,
            },
            {
              id: "treatment-b",
              title: "B",
              description: "",
              kind: "treatment",
              rank: 3,
            },
          ],
          services: [
            {
              id: "service-a",
              title: "S",
              description: "",
              kind: "service",
              rank: 2,
            },
          ],
        },
        "treatment",
        ["treatment-b", "treatment-a"],
      ),
    ).toEqual(["treatment-b", "service-a", "treatment-a"]);
  });
});
