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
  test("delegates every ordered review and external destination without local selection", () => {
    const { container } = renderReviews({
      reviews: Array.from({ length: 4 }, (_, index) => ({
        id: index + 1,
        reviewer_name: `Router reviewer ${index + 1}`,
        content: `Router review ${index + 1}`,
        stars: 5,
        image_url: null,
        platform: "Google",
        created_at: `2026-01-0${index + 1}T09:00:00.000Z`,
        rank: index + 1,
        enabled: true,
      })) as never,
      externalReviewPages: [
        { id: 3, link: "https://example.com/reviews" },
      ] as never,
    });

    expect(
      Array.from(container.querySelectorAll("[data-review-id]")).map((node) =>
        node.getAttribute("data-review-position"),
      ),
    ).toEqual(["1", "2", "3", "4"]);
    expect(screen.getByText("Router review 4")).toBeTruthy();
    expect(
      container
        .querySelector('[data-external-review-page-id="3"]')
        ?.getAttribute("href"),
    ).toBe("https://example.com/reviews");
    expect(screen.queryByText("Across our practices")).toBeNull();
  });

  test("collapses when no usable saved reviews exist", () => {
    const { container } = renderReviews({
      reviews: [] as never,
      externalReviewPages: [] as never,
    });

    expect(container.innerHTML).toBe("");
  });
});
