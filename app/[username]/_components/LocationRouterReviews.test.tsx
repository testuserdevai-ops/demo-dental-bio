import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import LocationRouterReviews from "./LocationRouterReviews";

afterEach(cleanup);

function renderReviews(
  props: React.ComponentProps<typeof LocationRouterReviews>,
) {
  return render(
    <AnalyticsProvider
      profileId="11111111-1111-4111-8111-111111111111"
      renderContext={{ kind: "public" }}
    >
      <LocationRouterReviews {...props} />
    </AnalyticsProvider>,
  );
}

describe("LocationRouterReviews", () => {
  test("reuses saved patient feedback without implying a location mapping", () => {
    renderReviews({
      reviews: [
        {
          id: 1,
          reviewer_name: "Amina",
          content: "The team made every step clear.",
          stars: 5,
        },
        {
          id: 2,
          reviewer_name: "James",
          content: "Friendly care and useful directions.",
          stars: 5,
        },
      ] as never,
      externalReviewPages: [
        { id: 3, link: "https://example.com/reviews" },
      ] as never,
    });

    expect(
      screen.getByRole("heading", { name: "Patient feedback" }),
    ).toBeTruthy();
    expect(screen.getByText("Across our practices")).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(
      screen
        .getByRole("link", { name: /Read more patient reviews/ })
        .getAttribute("href"),
    ).toBe("https://example.com/reviews");
  });

  test("collapses when no usable saved reviews exist", () => {
    const { container } = renderReviews({
      reviews: [] as never,
      externalReviewPages: [] as never,
    });

    expect(container.innerHTML).toBe("");
  });
});
