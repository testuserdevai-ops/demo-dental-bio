import React from "react";
import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import { useBrandDomainOverride } from "@/app/contexts/BrandDomainContext";
import { BrandDomainProvider } from "@/app/contexts/BrandDomainContext";

mock.module("next/font/google", () => ({
  Inter: () => ({ className: "inter", variable: "--font-inter" }),
  Manrope: () => ({ className: "manrope", variable: "--font-manrope" }),
}));
mock.module("next/headers", () => ({
  headers: async () => new Headers({ host: "doctors.bio" }),
}));
mock.module("./components/GoogleAnalytics", () => ({ default: () => null }));
mock.module("@/app/components/ui/sonner", () => ({ Toaster: () => null }));

const { default: RootLayout } = await import("./layout");

function BrandProbe({ label }: { label: string }) {
  return <output data-testid={label}>{useBrandDomainOverride()}</output>;
}

type ElementWithChildren = React.ReactElement<{
  children?: React.ReactNode;
}>;

function rootBrandProvider(layout: ElementWithChildren) {
  const body = React.Children.toArray(layout.props.children).find(
    (child): child is ElementWithChildren =>
      React.isValidElement(child) && child.type === "body",
  );
  const provider = React.Children.toArray(body?.props.children).find(
    (child): child is ElementWithChildren =>
      React.isValidElement(child) && child.type === BrandDomainProvider,
  );

  if (!provider) throw new Error("Root brand provider is missing");
  return provider;
}

describe("RootLayout branding", () => {
  it("provides the root request brand to client consumers", async () => {
    const layout = await RootLayout({ children: <BrandProbe label="root" /> });
    render(rootBrandProvider(layout as ElementWithChildren));

    expect(screen.getByTestId("root").textContent).toBe("doctors.bio");
  });

  it("allows a nested profile provider to supersede the root request brand", async () => {
    const layout = await RootLayout({
      children: (
        <BrandDomainProvider brandDomain="coach.bio">
          <BrandProbe label="nested" />
        </BrandDomainProvider>
      ),
    });
    render(rootBrandProvider(layout as ElementWithChildren));

    expect(screen.getByTestId("nested").textContent).toBe("coach.bio");
  });
});
