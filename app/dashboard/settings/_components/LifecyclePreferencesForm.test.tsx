import { afterEach, describe, expect, test, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import type { ActionResult } from "@/lib/forms/action-result";
import type { LifecyclePreferenceState } from "@/lib/lifecycle/repository";

const initial: LifecyclePreferenceState = {
  lifecycleEmailsEnabled: true,
  weeklySummaryEnabled: true,
  milestoneEmailsEnabled: true,
  promotionalUnsubscribedAt: null,
  permanentDeliveryFailureAt: null,
  supportPausedUntil: null,
  revision: 2,
  updatedAt: "2026-08-12T12:00:00.000Z",
};

const saveLifecyclePreferenceAction = mock(
  async (): Promise<ActionResult<LifecyclePreferenceState>> => ({
    ok: true,
    data: { ...initial, weeklySummaryEnabled: false, revision: 3 },
  }),
);
mock.module("../lifecycle-actions", () => ({
  saveLifecyclePreferenceAction,
}));

const { LifecyclePreferencesForm } = await import("./LifecyclePreferencesForm");

describe("LifecyclePreferencesForm", () => {
  afterEach(() => {
    cleanup();
    saveLifecyclePreferenceAction.mockReset();
    saveLifecyclePreferenceAction.mockResolvedValue({
      ok: true,
      data: { ...initial, weeklySummaryEnabled: false, revision: 3 },
    });
  });

  test("saves the exact server revision and controlled choices", async () => {
    render(<LifecyclePreferencesForm initial={initial} />);
    fireEvent.click(
      screen.getByRole("switch", { name: "Weekly performance summary" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Save notification preferences" }),
    );

    await waitFor(() =>
      expect(saveLifecyclePreferenceAction).toHaveBeenCalledWith(undefined, {
        expectedRevision: 2,
        lifecycleEmailsEnabled: true,
        weeklySummaryEnabled: false,
        milestoneEmailsEnabled: true,
      }),
    );
  });

  test("global unsubscribe disables every promotional choice", () => {
    render(
      <LifecyclePreferencesForm
        initial={{
          ...initial,
          promotionalUnsubscribedAt: "2026-08-12T10:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByText("Marketing email is unsubscribed")).toBeTruthy();
    for (const name of [
      "Profile guidance emails",
      "Weekly performance summary",
      "First-value milestones",
    ]) {
      expect(
        (screen.getByRole("switch", { name }) as HTMLButtonElement).disabled,
      ).toBe(true);
    }
  });

  test("preserves choices and shows a bounded conflict error", async () => {
    saveLifecyclePreferenceAction.mockResolvedValueOnce({
      ok: false,
      code: "PREFERENCES_SAVE_FAILED",
      formError: "Notification preferences changed. Reload and try again.",
    });
    render(<LifecyclePreferencesForm initial={initial} />);
    const weekly = screen.getByRole("switch", {
      name: "Weekly performance summary",
    });
    fireEvent.click(weekly);
    fireEvent.click(
      screen.getByRole("button", { name: "Save notification preferences" }),
    );
    expect(
      await screen.findByText(
        "Notification preferences changed. Reload and try again.",
      ),
    ).toBeTruthy();
    expect(weekly.getAttribute("data-state")).toBe("unchecked");
  });
});
