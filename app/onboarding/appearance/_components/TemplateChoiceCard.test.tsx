import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";

import { TemplateChoiceCard } from "./TemplateChoiceCard";

const baseProps = {
  id: "basic" as const,
  name: "Premium template",
  purpose: "A representative paid template used to verify plan labels.",
  structure: ["Identity", "Primary action"],
  checked: false,
};

describe("TemplateChoiceCard plan presentation", () => {
  it("shows Pro for an entitled paid template and keeps it selectable", () => {
    const onChange = mock(() => {});
    render(
      <TemplateChoiceCard
        {...baseProps}
        entitlementTier="pro"
        minimumTier="pro"
        onChange={onChange}
      />,
    );

    const radio = screen.getByRole("radio", { name: /Premium template/ });
    expect(radio.hasAttribute("disabled")).toBe(false);
    expect(screen.getByText("Pro", { exact: true })).toBeTruthy();
    fireEvent.click(radio);
    expect(onChange).toHaveBeenCalledWith("basic");
  });

  it("shows Pro locked for an ineligible paid template", () => {
    const onChange = mock(() => {});
    render(
      <TemplateChoiceCard
        {...baseProps}
        entitlementTier="free"
        minimumTier="pro"
        onChange={onChange}
      />,
    );

    const radio = screen.getByRole("radio", { name: /Premium template/ });
    expect(radio.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Pro · Locked", { exact: true })).toBeTruthy();
    expect(radio.getAttribute("aria-describedby")).toContain(
      "template-basic-availability",
    );
    fireEvent.click(radio);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps a free template labelled Free for a Pro owner", () => {
    render(
      <TemplateChoiceCard
        {...baseProps}
        entitlementTier="pro"
        minimumTier="free"
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("Free", { exact: true })).toBeTruthy();
  });
});
