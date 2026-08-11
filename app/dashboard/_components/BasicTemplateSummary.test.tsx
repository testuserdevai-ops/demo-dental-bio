import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

import BasicTemplateSummary from "./BasicTemplateSummary";

describe("BasicTemplateSummary", () => {
  test("identifies Basic as the compatibility default with a representative preview", () => {
    render(<BasicTemplateSummary />);

    expect(
      screen.getByRole("heading", { name: "Basic", level: 2 }),
    ).toBeTruthy();
    expect(screen.getByText("Compatibility default")).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: "Representative Basic template preview",
      }),
    ).toBeTruthy();
    expect(screen.getByTestId("basic-preview-canvas").className).toContain(
      "bg-[#e8f0ff]",
    );
    expect(screen.getByTestId("basic-preview-action").className).toContain(
      "bg-[#3158b5]",
    );
    expect(screen.getByTestId("basic-preview-content").className).toContain(
      "bg-white",
    );
  });

  test("exposes the exact section order with native disclosure semantics", () => {
    render(<BasicTemplateSummary />);

    const disclosure = screen.getByText("View Basic section order");
    fireEvent.click(disclosure);

    const order = screen
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(order).toEqual([
      "Header",
      "Profile and social links",
      "Treatments",
      "Services",
      "Links",
      "Blog",
      "Videos",
      "Gallery",
      "Reviews",
      "Locations",
      "Contact and footer",
    ]);
  });
});
