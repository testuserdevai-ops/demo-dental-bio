import { afterEach, describe, expect, test } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import { BrandDomainProvider } from "@/app/contexts/BrandDomainContext";
import { ProfileThemeRoot } from "@/app/components/profile-presentation/ProfileThemeRoot";
import { MemoryAnalyticsTransport } from "@/lib/analytics/transport";
import {
  PROFILE_TEMPLATE_IDS,
  type ProfileTemplateId,
} from "@/lib/profile-presentation/catalog";

import PublicProfileHeader from "./PublicProfileHeader";

afterEach(cleanup);

(
  window as typeof window & { happyDOM: { setURL: (url: string) => void } }
).happyDOM.setURL("https://dental.bio/template-basic");

function renderHeader({
  templateId = "direct-booking",
  bookingEnabled = true,
  bookingLink = "https://booking.example.test/visit",
  email = "practice@example.test",
  phone = "+442012345678",
}: {
  templateId?: ProfileTemplateId;
  bookingEnabled?: boolean;
  bookingLink?: string | null;
  email?: string | null;
  phone?: string | null;
} = {}) {
  const transport = new MemoryAnalyticsTransport();
  render(
    <AnalyticsProvider
      createEventId={() => "20000000-0000-4000-8000-000000000001"}
      now={() => new Date("2026-08-12T10:00:00.000Z")}
      profileId="30000000-0000-4000-8000-000000000001"
      renderContext={{ kind: "public" }}
      transport={transport}
    >
      <BrandDomainProvider brandDomain="dental.bio">
        <ProfileThemeRoot themeId="premium-contrast">
          <PublicProfileHeader
            bookingEnabled={bookingEnabled}
            bookingLink={bookingLink}
            displayName="Dr Alex Morgan"
            email={email}
            imageUrl="https://cdn.example.test/profile.webp"
            isVerified
            phone={phone}
            templateId={templateId}
            username="dr-alex"
          />
        </ProfileThemeRoot>
      </BrandDomainProvider>
    </AnalyticsProvider>,
  );
  return transport;
}

describe("PublicProfileHeader", () => {
  test("keeps the shared identity and overflow concept available to every template", () => {
    for (const templateId of PROFILE_TEMPLATE_IDS) {
      cleanup();
      renderHeader({ templateId });
      const header = document.querySelector('[data-profile-header="true"]');
      expect(header?.getAttribute("data-profile-header-template")).toBe(
        templateId,
      );
      expect(screen.getByText("@dr-alex")).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Share profile" }),
      ).toBeTruthy();
    }
  });

  test("uses the strongest available owner action and preserves tracking", () => {
    const transport = renderHeader();
    const booking = screen.getByRole("link", { name: "Book" });
    expect(booking.getAttribute("href")).toBe(
      "https://booking.example.test/visit",
    );
    expect(booking.getAttribute("target")).toBe("_blank");
    fireEvent.click(booking);
    expect(transport.events.map(({ action }) => action)).toEqual([
      { type: "booking_click" },
      { type: "cta_click", ctaType: "booking" },
    ]);
  });

  test("falls back to contact and opens the existing share actions", () => {
    renderHeader({ bookingEnabled: false, bookingLink: null });
    expect(
      screen.getByRole("link", { name: "Contact" }).getAttribute("href"),
    ).toBe("mailto:practice@example.test");

    fireEvent.click(screen.getByRole("button", { name: "Share profile" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy dentalbio" })).toBeTruthy();
  });

  test("stays sticky and morphs into the compact portrait pill after scrolling", async () => {
    renderHeader();
    const header = document.querySelector('[data-profile-header="true"]')!;
    expect(header.className).toContain("sticky");
    expect(header.getAttribute("data-profile-header-scrolled")).toBe("false");

    Object.defineProperty(window, "scrollY", { configurable: true, value: 80 });
    fireEvent.scroll(window);
    await waitFor(() =>
      expect(header.getAttribute("data-profile-header-scrolled")).toBe("true"),
    );
    expect(
      screen.getByRole("img", { name: "Portrait of Dr Alex Morgan" }),
    ).toBeTruthy();

    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  test("keeps the page wrapper from creating a sticky-breaking scroll container", async () => {
    const legacyCss = await Bun.file(
      new URL("../link-page.css", import.meta.url),
    ).text();
    expect(legacyCss).toMatch(/html,\s*body\s*\{[^}]*overflow-x:\s*clip/s);
    expect(legacyCss).toMatch(/\.wrapper\s*\{[^}]*overflow-x:\s*clip/s);
  });
});
