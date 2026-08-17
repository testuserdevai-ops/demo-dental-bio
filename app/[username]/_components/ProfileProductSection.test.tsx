import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AnalyticsProvider } from "@/app/contexts/AnalyticsContext";
import type { AnalyticsEvent } from "@/lib/analytics/contract";
import type { AnalyticsTransport } from "@/lib/analytics/transport";

import type { ProfileProduct } from "../_lib/profile-products";

mock.module("@/app/components/Image/SafeImage", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const { default: ProfileProductSection } =
  await import("./ProfileProductSection");

class RecordingTransport implements AnalyticsTransport {
  events: AnalyticsEvent[] = [];
  fail = false;

  async send(event: AnalyticsEvent) {
    this.events.push(event);
    if (this.fail) throw new Error("offline");
    return { status: "dispatched" as const, eventId: event.eventId };
  }
}

const products: ProfileProduct[] = Array.from({ length: 8 }, (_, index) => ({
  id: String(3_001 + index),
  name: `Owner product ${index + 1}`,
  link: `https://seller.example.test/products/${index + 1}`,
  platform: index === 0 ? "Owner seller" : undefined,
  image_url: index === 0 ? "https://cdn.example.test/product.webp" : undefined,
  price: index === 0 ? "19.99" : undefined,
  currency: index === 0 ? "GBP(£)" : undefined,
  rank: index + 1,
  enabled: true,
  position: index + 1,
}));

function renderSection(transport: RecordingTransport, inventory = products) {
  return render(
    <AnalyticsProvider
      createEventId={() => "11111111-1111-4111-8111-111111111111"}
      now={() => new Date("2026-08-17T12:00:00.000Z")}
      profileId="db010000-0000-4000-8000-000000000001"
      renderContext={{ kind: "public" }}
      transport={transport}
    >
      <ProfileProductSection products={inventory} />
    </AnalyticsProvider>,
  );
}

function clickWithoutNavigation(link: Element) {
  let defaultPrevented = true;
  const preventNavigation = (event: MouseEvent) => {
    defaultPrevented = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener("click", preventNavigation, { once: true });
  fireEvent.click(link);
  return defaultPrevented;
}

afterEach(cleanup);

describe("ProfileProductSection", () => {
  test("renders every supplied product and the outbound-seller disclosure", () => {
    renderSection(new RecordingTransport());

    expect(document.querySelectorAll("[data-product-id]")).toHaveLength(8);
    expect(screen.getByText("Owner product 8")).toBeTruthy();
    expect(screen.getByText("Owner seller")).toBeTruthy();
    expect(screen.getByText("GBP(£) 19.99")).toBeTruthy();
    expect(
      screen.getByText(
        /Product links open an external seller's website\. Review the seller,/,
      ),
    ).toBeTruthy();
  });

  test("uses native external tracked links with the final visible position", () => {
    const transport = new RecordingTransport();
    renderSection(transport);
    const card = document.querySelector('[data-product-id="3008"]');
    const link = card?.querySelector("a");

    expect(link?.getAttribute("href")).toBe(
      "https://seller.example.test/products/8",
    );
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(clickWithoutNavigation(link!)).toBe(false);
    expect(transport.events[0]).toMatchObject({
      section: "shop",
      position: 8,
      action: { type: "product_click", productId: 3008 },
    });
  });

  test("does not block the seller link when tracking fails and hides empty inventory", () => {
    const transport = new RecordingTransport();
    transport.fail = true;
    const { container, rerender } = renderSection(transport);
    const link = document.querySelector('[data-product-id="3001"] a');

    expect(clickWithoutNavigation(link!)).toBe(false);
    expect(transport.events).toHaveLength(1);

    rerender(
      <AnalyticsProvider
        profileId="db010000-0000-4000-8000-000000000001"
        renderContext={{ kind: "public" }}
        transport={transport}
      >
        <ProfileProductSection products={[]} />
      </AnalyticsProvider>,
    );
    expect(container.childElementCount).toBe(0);
  });
});
