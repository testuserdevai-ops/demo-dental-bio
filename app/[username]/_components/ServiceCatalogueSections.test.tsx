import { describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes } from "react";

mock.module("@/app/components/analytics/TrackedAction", () => ({
  TrackedButton: ({
    analytics: _analytics,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    analytics: unknown;
  }) => <button {...props} />,
}));

const { ServiceCatalogueSections } = await import("./ServiceCatalogueSections");

describe("ServiceCatalogueSections", () => {
  test("keeps a touch-sized accessible disclosure task usable", () => {
    render(
      <ServiceCatalogueSections
        heading="Treatments"
        items={[
          {
            id: "10000000-0000-4000-8000-000000000001",
            title: "Dental implants",
            description: "A carefully planned replacement option.",
            kind: "treatment",
          },
          {
            id: "10000000-0000-4000-8000-000000000002",
            title: "Teeth whitening",
            description: null,
            kind: "treatment",
          },
        ]}
      />,
    );

    const implants = screen.getByRole("button", { name: "Dental implants" });
    expect(implants.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Teeth whitening")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Teeth whitening" }),
    ).toBeNull();

    fireEvent.click(implants);
    expect(implants.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByText("A carefully planned replacement option."),
    ).toBeTruthy();

    fireEvent.click(implants);
    expect(implants.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen.queryByText(
        "Contact the practice for details and suitability guidance.",
      ),
    ).toBeNull();
  });
});
