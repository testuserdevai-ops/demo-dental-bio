import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const track = mock(() => true);
mock.module("@/app/contexts/AnalyticsContext", () => ({
  useTrackedAction: () => track,
}));

const { PublicProfileLinkCard } = await import("./PublicProfileLinkCard");

const analytics = {
  section: "links" as const,
  position: 2,
  action: {
    type: "link_click" as const,
    linkId: "00000000-0000-4000-8000-000000000701",
    groupId: "00000000-0000-4000-8000-000000000702",
  },
};

afterEach(() => {
  cleanup();
  track.mockClear();
});

describe("PublicProfileLinkCard", () => {
  test("preserves native anchor semantics and controlled analytics for a small icon", () => {
    render(
      <PublicProfileLinkCard
        href="https://example.test/book"
        label="Book a visit"
        analytics={analytics}
        presentation={{
          variant: "small-icon",
          imageUrl: "https://cdn.example.test/icon.webp",
          imageAlt: "Calendar",
          decorative: false,
          featured: true,
        }}
      />,
    );
    const anchor = screen.getByRole("link", { name: "Calendar Book a visit" });
    expect(anchor.getAttribute("href")).toBe("https://example.test/book");
    expect(anchor.getAttribute("target")).toBe("_blank");
    expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
    expect(anchor.getAttribute("data-link-image-variant")).toBe("small-icon");
    expect(anchor.getAttribute("data-link-featured")).toBe("true");
    fireEvent.click(anchor, { ctrlKey: true });
    expect(track).toHaveBeenCalledWith(analytics);
  });

  test("uses empty alt for decorative large images", () => {
    render(
      <PublicProfileLinkCard
        href="https://example.test/learn"
        label="Learn about implants"
        analytics={analytics}
        presentation={{
          variant: "large-image",
          imageUrl: "https://cdn.example.test/large.webp",
          imageAlt: null,
          decorative: true,
          featured: false,
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Learn about implants" }),
    ).toBeTruthy();
    expect(screen.getByRole("presentation").getAttribute("alt")).toBe("");
  });

  test("falls back inside the same anchor when an image fails", () => {
    const view = render(
      <PublicProfileLinkCard
        href="https://example.test/contact"
        label="Contact us"
        analytics={analytics}
        presentation={{
          variant: "large-image",
          imageUrl: "https://cdn.example.test/missing.webp",
          imageAlt: "Reception",
          decorative: false,
          featured: false,
        }}
      />,
    );
    const image = screen.getByRole("img", { name: "Reception" });
    fireEvent.error(image);
    const anchor = screen.getByRole("link", { name: "Contact us" });
    expect(anchor.getAttribute("data-link-image-variant")).toBe("none");
    expect(anchor.getAttribute("href")).toBe("https://example.test/contact");
    view.rerender(
      <PublicProfileLinkCard
        href="https://example.test/contact"
        label="Contact us"
        analytics={analytics}
        presentation={{
          variant: "small-icon",
          imageUrl: "https://cdn.example.test/replacement.webp",
          imageAlt: "Reception team",
          decorative: false,
          featured: false,
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Reception team" })).toBeTruthy();
  });
});
