import React from "react";
import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, renderHook } from "@testing-library/react";
import { BrandDomainProvider } from "@/app/contexts/BrandDomainContext";
import { useDomainConfig } from "./useDomainConfig";

const originalLocation = window.location;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

function wrapper(brandDomain: string | null) {
  return function DomainConfigWrapper({ children }: React.PropsWithChildren) {
    return (
      <BrandDomainProvider brandDomain={brandDomain}>
        {children}
      </BrandDomainProvider>
    );
  };
}

describe("useDomainConfig", () => {
  it("uses the server-resolved override before the browser hostname", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, hostname: "doctors.bio" },
    });

    const { result } = renderHook(() => useDomainConfig(), {
      wrapper: wrapper("coach.bio"),
    });

    expect(result.current.domain).toBe("coach.bio");
  });

  it("uses the current browser hostname when no override is available", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, hostname: "doctors.bio" },
    });

    const { result } = renderHook(() => useDomainConfig(), {
      wrapper: wrapper(null),
    });

    expect(result.current.domain).toBe("doctors.bio");
  });
});
