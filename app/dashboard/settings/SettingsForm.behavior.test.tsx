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
import {
  navigationSpies,
  resetNavigationMocks,
} from "@/test/mocks/next-navigation";

const { refresh, replace } = navigationSpies;
const updateUserForId = mock(
  async (): Promise<{ error: null | { message: string } }> => ({ error: null }),
);
const updateUser = mock(() => ({ eq: updateUserForId }));

mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: { id: "00000000-0000-4000-8000-000000000001" },
        },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table !== "users") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: "00000000-0000-4000-8000-000000000001",
                role: "user",
                subscription_status: "PRO",
                current_period_end: null,
                trial_end: null,
              },
              error: null,
            }),
          }),
        }),
        update: updateUser,
      };
    },
  }),
}));
mock.module("@/services/apiClient", () => ({
  apiClient: { get: async () => ({ unique: true }) },
}));

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
    updateUser.mockClear();
    updateUserForId.mockReset();
    updateUserForId.mockResolvedValue({ error: null });
  });

  it("renders the server-seeded settings values", () => {
    renderSettings();

    expect(
      (screen.getByLabelText("First Name") as HTMLInputElement).value,
    ).toBe("Server");
    expect((screen.getByLabelText("Last Name") as HTMLInputElement).value).toBe(
      "Owner",
    );
    expect(
      (screen.getByPlaceholderText("Username") as HTMLInputElement).value,
    ).toBe("server-owner");
  });

  it("awaits the successful save before refreshing", async () => {
    const request = deferred<{ error: null }>();
    updateUserForId.mockImplementationOnce(() => request.promise);
    renderSettings();
    fireEvent.change(screen.getByLabelText("First Name"), {
      target: { value: "Updated" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateUserForId).toHaveBeenCalledTimes(1));
    expect(refresh).not.toHaveBeenCalled();

    request.resolve({ error: null });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("preserves edited values and does not refresh when save fails", async () => {
    updateUserForId.mockResolvedValueOnce({
      error: { message: "save failed" },
    });
    renderSettings();
    const firstName = screen.getByLabelText("First Name") as HTMLInputElement;
    fireEvent.change(firstName, { target: { value: "Still here" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/error?message=failed_to_update_user_details",
      ),
    );

    expect(firstName.value).toBe("Still here");
    expect(refresh).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
