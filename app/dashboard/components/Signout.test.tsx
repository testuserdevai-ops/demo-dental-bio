import React from "react";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

type SignOutResult = { error: Error | null };
type Router = { push: (href: string) => void };

const signOut = mock<() => Promise<SignOutResult>>();
const push = mock<(href: string) => void>();

mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { signOut } }),
}));

mock.module("next/navigation", () => ({
  useRouter: (): Router => ({ push }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

const { default: Signout } = await import("./Signout");

beforeEach(() => {
  signOut.mockReset();
  push.mockClear();
});

afterEach(cleanup);

afterAll(() => {
  mock.restore();
});

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
