import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "bun:test";

import { NavbarProvider, useNavbar } from "./NavbarContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <NavbarProvider>{children}</NavbarProvider>
);

describe("NavbarProvider", () => {
  it("keeps the nav updater stable across state changes", () => {
    const { result } = renderHook(() => useNavbar(), { wrapper });
    const initialUpdater = result.current.setNavItemState;

    act(() => initialUpdater("Shop", true));

    expect(result.current.navState.Shop).toBe(true);
    expect(result.current.setNavItemState).toBe(initialUpdater);

    act(() => initialUpdater("Shop", true));

    expect(result.current.setNavItemState).toBe(initialUpdater);
  });
});
