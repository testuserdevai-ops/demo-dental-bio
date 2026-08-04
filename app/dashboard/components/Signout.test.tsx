import React from "react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  navigationSpies,
  resetNavigationMocks,
} from "@/test/mocks/next-navigation";

type SignOutResult = { error: Error | null };

const signOut = mock<() => Promise<SignOutResult>>();
const { push } = navigationSpies;

mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { signOut } }),
}));

const { default: Signout } = await import("./Signout");

beforeEach(() => {
  signOut.mockReset();
  resetNavigationMocks();
});

afterEach(cleanup);

describe("Signout", () => {
  it("awaits browser Supabase sign-out and routes home on success", async () => {
    signOut.mockResolvedValue({ error: null });
    render(<Signout />);

    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith("/");
  });

  it("does not route when browser Supabase sign-out returns an error", async () => {
    signOut.mockResolvedValue({ error: new Error("Sign-out failed") });
    render(<Signout />);

    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();
  });
});
