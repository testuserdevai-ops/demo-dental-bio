import { afterEach, describe, expect, it, mock } from "bun:test";
import * as React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PreviewProvider } from "@/app/contexts/PreviewContext";
import type { ActionResult } from "@/lib/forms/action-result";
import {
  navigationSpies,
  resetNavigationMocks,
} from "@/test/mocks/next-navigation";

const saveDashboardSettings = mock(async (): Promise<ActionResult<void>> => ({
  ok: true,
  data: undefined,
}));
mock.module("./actions", () => ({ saveDashboardSettings }));

const { default: SettingsForm } = await import("./SettingsForm");
const serverUser = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "server-owner",
  title: "Dr",
  first_name: "Server",
  middle_name: "Seed",
  last_name: "Owner",
  birthday: "1990-04-03",
};

function renderSettings() {
  return render(
    <PreviewProvider>
      <SettingsForm user={serverUser} />
    </PreviewProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("SettingsForm server seed and save mutation", () => {
  afterEach(() => {
    cleanup();
    resetNavigationMocks();
    saveDashboardSettings.mockReset();
    saveDashboardSettings.mockResolvedValue({ ok: true, data: undefined });
  });

  it("renders the server-seeded settings values", () => {
    renderSettings();
    expect(
      (screen.getByLabelText("First Name") as HTMLInputElement).value,
    ).toBe("Server");
    expect((screen.getByLabelText("Last Name") as HTMLInputElement).value).toBe(
      "Owner",
    );
    expect((screen.getByLabelText("Username") as HTMLInputElement).value).toBe(
      "server-owner",
    );
  });

  it("awaits the successful save before refreshing", async () => {
    const request = deferred<ActionResult<void>>();
    saveDashboardSettings.mockImplementationOnce(() => request.promise);
    renderSettings();
    fireEvent.change(screen.getByLabelText("First Name"), {
      target: { value: "Updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() => expect(saveDashboardSettings).toHaveBeenCalledTimes(1));
    expect(navigationSpies.refresh).not.toHaveBeenCalled();
    request.resolve({ ok: true, data: undefined });
    await waitFor(() =>
      expect(navigationSpies.refresh).toHaveBeenCalledTimes(1),
    );
  });

  it("preserves edits and exposes a server field error", async () => {
    saveDashboardSettings.mockResolvedValueOnce({
      ok: false,
      code: "USERNAME_TAKEN",
      fieldErrors: { username: ["This username is already taken."] },
    });
    renderSettings();
    const firstName = screen.getByLabelText("First Name") as HTMLInputElement;
    fireEvent.change(firstName, { target: { value: "Still here" } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect(
      await screen.findByText("This username is already taken."),
    ).toBeTruthy();
    expect(firstName.value).toBe("Still here");
    expect(navigationSpies.refresh).not.toHaveBeenCalled();
  });
});
