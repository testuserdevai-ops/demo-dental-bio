import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

mock.module("@/app/contexts/AnalyticsContext", () => ({
  useTrackedAction: () => () => true,
}));

const { default: SocialLinks } = await import("./SocialLinks");

afterEach(cleanup);

describe("SocialLinks", () => {
  test("uses an unambiguous globe for the external website in every shared template", () => {
    render(<SocialLinks website_link="practice.example.test" />);

    const website = screen.getByRole("link", { name: "Open website" });
    expect(website.getAttribute("href")).toBe("https://practice.example.test");
    expect(
      website.querySelector('[data-social-icon="website-globe"]'),
    ).toBeTruthy();
  });
});
