// @ts-nocheck -- Bun provides test globals at runtime.
import React, { useState } from "react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const replace = mock(() => undefined);
const registrationSearchParams = new URLSearchParams(
  "username=dr-ada&domain=dental.bio",
);

mock.module("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => registrationSearchParams,
}));
mock.module("@/utils/hooks/useDomainConfig", () => ({
  useDomainConfig: () => ({
    domain: "dental.bio",
    positions: ["Dentist", "Student"],
  }),
}));
mock.module("@/utils/hooks/useDeviceFingerprint", () => ({
  useDeviceFingerprint: () => "test-fingerprint",
}));
mock.module("@/utils/functions/getUserIp", () => ({
  getUserLocation: () => Promise.resolve("United Kingdom"),
}));
const { default: RegisterPage } = await import("./page");
const { DateOfBirthField } = await import("./_components/DateOfBirthField");
const { RegistrationOtpInput } =
  await import("./_components/RegistrationOtpInput");

const originalFetch = globalThis.fetch;
const originalSetInterval = window.setInterval;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.setInterval = originalSetInterval;
  replace.mockClear();
});

function ControlledDateOfBirth() {
  const [value, setValue] = useState("");
  return (
    <DateOfBirthField
      value={value}
      onChange={setValue}
      onBlur={() => undefined}
    />
  );
}

function ControlledOtp({ error }: { error?: string }) {
  const [value, setValue] = useState("");
  return (
    <RegistrationOtpInput value={value} onChange={setValue} error={error} />
  );
}

async function chooseOption(label: string, option: string) {
  const trigger = screen.getByRole("combobox", { name: label });
  const nativeSelect = trigger.parentElement?.querySelector("select");
  if (!nativeSelect) throw new Error(`Missing native select for ${label}`);
  fireEvent.change(nativeSelect, { target: { value: option } });
  await waitFor(() => expect(trigger.textContent).toContain(option));
}

async function fillValidRegistrationDetails() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "owner@example.com" },
  });
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "New" },
  });
  fireEvent.change(screen.getByLabelText("Last name"), {
    target: { value: "Owner" },
  });
  fireEvent.change(screen.getByLabelText("Date of birth"), {
    target: { value: "04/05/2000" },
  });
  await chooseOption("Position", "Dentist");
  await waitFor(() =>
    expect(
      screen.getByRole("combobox", { name: "Country" }).textContent,
    ).toContain("United Kingdom"),
  );
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "Password!1" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "Password!1" },
  });
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("registration form", () => {
  it("labels password-manager fields and focuses the first invalid field", async () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText("Email").getAttribute("autocomplete")).toBe(
      "email",
    );
    expect(screen.getByLabelText("Password").getAttribute("autocomplete")).toBe(
      "new-password",
    );
    expect(
      screen.getByLabelText("Confirm password").getAttribute("autocomplete"),
    ).toBe("new-password");
    expect(
      screen.getByLabelText("Date of birth").getAttribute("autocomplete"),
    ).toBe("bday");

    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );

    await waitFor(() =>
      expect(screen.getByText("Email is required")).toBeTruthy(),
    );
    expect(document.activeElement).toBe(screen.getByLabelText("Email"));
  });

  it("normalizes a pasted birthday through the accessible date field", () => {
    render(<ControlledDateOfBirth />);
    const birthday = screen.getByLabelText("Date of birth");

    fireEvent.paste(birthday, {
      clipboardData: { getData: () => "1990-07-03" },
    });

    expect(birthday.value).toBe("03/07/1990");
    expect(birthday.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("accepts pasted digits in the OTP field and exposes its error accessibly", () => {
    render(<ControlledOtp error="Enter the 6-digit code" />);
    const otp = screen.getByLabelText("Verification code");

    fireEvent.paste(otp, {
      clipboardData: { getData: () => "1x2x3x4x5x6x7" },
    });

    expect(otp.value).toBe("123456");
    expect(otp.getAttribute("autocomplete")).toBe("one-time-code");
    expect(otp.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toContain(
      "Enter the 6-digit code",
    );
  });

  it("sends the server-issued ticket on verification and preserves it for provider retry", async () => {
    const requestBodies: Record<string, unknown>[] = [];
    const responses = [
      { ok: true, data: { ticket: "ticket-one" } },
      {
        ok: false,
        code: "PROVIDER_RETRY_REQUIRED",
        formError: "Account setup needs another try.",
      },
      { ok: true, data: { redirectTo: "/dashboard" } },
    ];
    globalThis.fetch = mock((_url: string, init: RequestInit) => {
      requestBodies.push(JSON.parse(String(init.body)));
      return jsonResponse(responses.shift());
    }) as typeof fetch;
    render(<RegisterPage />);
    await fillValidRegistrationDetails();

    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    const otp = await screen.findByLabelText("Verification code");
    fireEvent.change(otp, { target: { value: "123456" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Verify and create account" }),
    );

    await screen.findByText("Account setup needs another try.");
    expect(
      screen.getByText(/We sent a code to owner@example\.com/),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Verify and create account" }),
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(requestBodies[0]).not.toHaveProperty("registrationTicket");
    expect(requestBodies[1]).toMatchObject({
      otp: "123456",
      registrationTicket: "ticket-one",
    });
    expect(requestBodies[2]).toMatchObject({
      otp: "123456",
      registrationTicket: "ticket-one",
    });
  });

  it("clears the old ticket when returning to details and replaces it on a new send", async () => {
    const requestBodies: Record<string, unknown>[] = [];
    const responses = [
      { ok: true, data: { ticket: "ticket-one" } },
      { ok: true, data: { ticket: "ticket-two" } },
      { ok: true, data: { redirectTo: "/dashboard" } },
    ];
    globalThis.fetch = mock((_url: string, init: RequestInit) => {
      requestBodies.push(JSON.parse(String(init.body)));
      return jsonResponse(responses.shift());
    }) as typeof fetch;
    render(<RegisterPage />);
    await fillValidRegistrationDetails();

    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await screen.findByLabelText("Verification code");
    fireEvent.click(screen.getByRole("button", { name: "Back to details" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    const otp = await screen.findByLabelText("Verification code");
    fireEvent.change(otp, { target: { value: "123456" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Verify and create account" }),
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(requestBodies[2]).toMatchObject({
      registrationTicket: "ticket-two",
    });
  });

  it("does not advance when a successful send response omits its ticket", async () => {
    globalThis.fetch = mock(() =>
      jsonResponse({ ok: true, data: {} }),
    ) as typeof fetch;
    render(<RegisterPage />);
    await fillValidRegistrationDetails();

    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );

    await screen.findByText(
      "Registration is temporarily unavailable. Please try again.",
    );
    expect(screen.queryByLabelText("Verification code")).toBeNull();
    expect(screen.getByLabelText("Email").value).toBe("owner@example.com");
  });

  it("allows only one resend request while a resend is in flight", async () => {
    let intervalCallback: (() => void) | undefined;
    window.setInterval = ((callback: TimerHandler) => {
      intervalCallback = callback as () => void;
      return 1;
    }) as typeof window.setInterval;

    let requestCount = 0;
    const resendResolvers: Array<(response: Response) => void> = [];
    const fetchMock = mock((_url: string, _init: RequestInit) => {
      requestCount += 1;
      if (requestCount === 1) {
        return jsonResponse({ ok: true, data: { ticket: "ticket-one" } });
      }
      return new Promise<Response>((resolve) => {
        resendResolvers.push(resolve);
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;
    render(<RegisterPage />);
    await fillValidRegistrationDetails();

    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await screen.findByLabelText("Verification code");
    expect(intervalCallback).toBeDefined();
    act(() => {
      for (let second = 0; second < 60; second++) intervalCallback?.();
    });

    const resend = screen.getByRole("button", { name: "Resend code" });
    await act(async () => {
      fireEvent.click(resend);
      fireEvent.click(resend);
      await Promise.resolve();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(resend.disabled).toBe(true);

    await act(async () => {
      for (const resolve of resendResolvers) {
        resolve(
          new Response(
            JSON.stringify({ ok: true, data: { ticket: "ticket-two" } }),
            { headers: { "content-type": "application/json" } },
          ),
        );
      }
    });
  });
});
