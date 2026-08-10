// @ts-nocheck -- Bun provides test globals at runtime.
import { afterEach, describe, expect, it, mock, setSystemTime } from "bun:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useLoginLockout } from "./use-login-lockout";

const originalSetInterval = window.setInterval;
const originalConsoleError = console.error;

afterEach(() => {
  cleanup();
  setSystemTime();
  localStorage.clear();
  window.setInterval = originalSetInterval;
  console.error = originalConsoleError;
});

function createAlertRef() {
  const alert = document.createElement("div");
  const focus = mock(() => undefined);
  Object.defineProperty(alert, "focus", {
    configurable: true,
    value: focus,
  });
  return { alertRef: { current: alert }, focus };
}

function LockoutState() {
  const { isLocked } = useLoginLockout({ current: null });
  return <output>{isLocked ? "locked" : "unlocked"}</output>;
}

describe("useLoginLockout", () => {
  it("starts and persists a 60-second lockout on the third failure", async () => {
    const now = new Date("2026-08-03T20:00:00.000Z");
    setSystemTime(now);
    const { alertRef, focus } = createAlertRef();
    const { result } = renderHook(() => useLoginLockout(alertRef), {
      wrapper: StrictMode,
    });

    act(() => {
      expect(result.current.recordFailure()).toBe(false);
      expect(result.current.recordFailure()).toBe(false);
      expect(result.current.recordFailure()).toBe(true);
    });

    expect(result.current.isLocked).toBe(true);
    expect(result.current.remainingSeconds).toBe(60);
    expect(localStorage.getItem("loginAttempts")).toBe("3");
    expect(localStorage.getItem("lockoutEndTime")).toBe(
      String(now.getTime() + 60_000),
    );
    await waitFor(() => expect(focus).toHaveBeenCalledTimes(1));
  });

  it("restores, ticks, and clears persisted state without refocusing", async () => {
    const now = new Date("2026-08-03T20:00:00.000Z");
    setSystemTime(now);
    localStorage.setItem("loginAttempts", "3");
    localStorage.setItem("lockoutEndTime", String(now.getTime() + 60_000));
    let intervalCallback: (() => void) | undefined;
    window.setInterval = ((callback: TimerHandler, delay?: number) => {
      if (delay === 1_000) {
        intervalCallback = callback as () => void;
        return 1;
      }
      return originalSetInterval(callback, delay);
    }) as typeof window.setInterval;
    const { alertRef, focus } = createAlertRef();
    const { result } = renderHook(() => useLoginLockout(alertRef), {
      wrapper: StrictMode,
    });

    await waitFor(() => expect(result.current.remainingSeconds).toBe(60));
    await waitFor(() => expect(focus).toHaveBeenCalledTimes(1));
    expect(intervalCallback).toBeDefined();

    setSystemTime(new Date(now.getTime() + 1_000));
    act(() => intervalCallback?.());
    expect(result.current.remainingSeconds).toBe(59);
    expect(focus).toHaveBeenCalledTimes(1);

    setSystemTime(new Date(now.getTime() + 60_000));
    act(() => intervalCallback?.());
    expect(result.current.isLocked).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
    expect(localStorage.getItem("loginAttempts")).toBeNull();
    expect(localStorage.getItem("lockoutEndTime")).toBeNull();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("hydrates as unlocked before restoring persisted lockout state", async () => {
    const now = new Date("2026-08-03T20:00:00.000Z");
    setSystemTime(now);
    const serverMarkup = renderToString(<LockoutState />);
    const container = document.createElement("div");
    container.innerHTML = serverMarkup;
    localStorage.setItem("loginAttempts", "3");
    localStorage.setItem("lockoutEndTime", String(now.getTime() + 60_000));
    const consoleError = mock(console.error);
    console.error = consoleError;

    let root: ReturnType<typeof hydrateRoot>;
    act(() => {
      root = hydrateRoot(container, <LockoutState />);
    });

    expect(container.textContent).toBe("unlocked");
    await waitFor(() => expect(container.textContent).toBe("locked"));
    expect(consoleError).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});
