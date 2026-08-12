import { describe, expect, mock, test } from "bun:test";
import { render, screen } from "@testing-library/react";

mock.module("@/utils/hooks/useDomainConfig", () => ({
  useDomainConfig: () => ({
    brandName: "Dentalbio",
    logoPath: "/logo.svg",
  }),
}));

mock.module("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

mock.module("next/image", () => ({
  default: ({ alt, ...props }: React.ComponentProps<"img">) => (
    // The responsive behavior belongs to Next Image; this test covers layout ownership.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

mock.module("./ShareModal", () => ({
  default: () => <button type="button">More profile actions</button>,
}));

mock.module("./SocialLinks", () => ({
  default: () => <div data-testid="social-links" />,
}));

mock.module("@/app/components/analytics/TrackedAction", () => ({
  TrackedLink: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

const { default: Footer } = await import("./Footer");

const baseProps = {
  bookingLink: "",
  contact_email: "",
  profileId: "11111111-1111-4111-8111-111111111111",
  socialLinks: null,
  title:
    "Complete care for confident smiles with a deliberately long practice name",
  username: "long-practice-name",
  website_link: undefined,
} as const;

describe("public profile Footer", () => {
  test("reserves a dedicated column for profile actions beside long branded copy", () => {
    const { container } = render(
      <Footer {...baseProps} presentation="template" useDentalBrand={true} />,
    );

    expect(container.querySelectorAll("[data-profile-footer]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-footer-menu]")).toHaveLength(1);
    expect(
      container
        .querySelector("[data-footer-brand-row]")
        ?.classList.contains("grid-cols-[44px_minmax(0,1fr)_44px]"),
    ).toBe(true);
    expect(
      container
        .querySelector("[data-footer-copy]")
        ?.classList.contains("min-w-0"),
    ).toBe(true);
    expect(
      screen
        .getByText(/Join Complete care for confident smiles/)
        .classList.contains("[overflow-wrap:anywhere]"),
    ).toBe(true);
  });

  test("keeps one actions menu with the credit when paid branding is hidden", () => {
    const { container } = render(
      <Footer {...baseProps} presentation="template" useDentalBrand={false} />,
    );

    expect(container.querySelector("[data-footer-brand-row]")).toBeNull();
    expect(container.querySelectorAll("[data-footer-menu]")).toHaveLength(1);
    expect(
      container
        .querySelector("[data-footer-credit-row]")
        ?.classList.contains("grid-cols-[44px_minmax(0,1fr)_44px]"),
    ).toBe(true);
  });
});
