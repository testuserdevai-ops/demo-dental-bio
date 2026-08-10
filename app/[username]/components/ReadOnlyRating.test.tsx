import { describe, expect, it } from "bun:test";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import ReadOnlyRating, { normalizeReadOnlyRating } from "./ReadOnlyRating";

describe("ReadOnlyRating", () => {
  it("renders five noninteractive stars with an accessible integer rating", () => {
    render(<ReadOnlyRating value={4} />);

    expect(screen.getByRole("img", { name: "4 out of 5 stars" })).toBeTruthy();
    expect(screen.getAllByText("★")).toHaveLength(5);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getAllByText("★")[0]?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("keeps the legacy display integer-only and bounded", () => {
    expect(normalizeReadOnlyRating(4.6)).toBe(5);
    expect(normalizeReadOnlyRating(-1)).toBe(0);
    expect(normalizeReadOnlyRating(8)).toBe(5);
    expect(normalizeReadOnlyRating(undefined)).toBe(0);
  });
});
