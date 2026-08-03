// @ts-nocheck -- Bun provides test globals at runtime.
import React, { useState } from "react";
import { afterEach, describe, expect, it, mock, setSystemTime } from "bun:test";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
  setSystemTime();
  registrationSearchParams.set("username", "dr-ada");
  registrationSearchParams.set("domain", "dental.bio");
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
  it("shows brand-aware availability copy on the details step", async () => {
    registrationSearchParams.set("domain", "coach.bio");
    render(<RegisterPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Country" }).textContent,
      ).toContain("United Kingdom"),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Almost there" }),
    ).toBeTruthy();
    expect(screen.getByText("Congratulations!")).toBeTruthy();
    const profileAddress = screen.getByText("coach.bio/dr-ada");
    expect(profileAddress.classList.contains("break-words")).toBe(true);
    expect(profileAddress.classList.contains("text-2xl")).toBe(true);
    expect(profileAddress.classList.contains("sm:text-3xl")).toBe(true);
    expect(screen.getByText("is available, make it yours:")).toBeTruthy();
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Almost there",
    });
    expect(heading.classList.contains("text-3xl")).toBe(true);
    expect(heading.classList.contains("sm:text-4xl")).toBe(true);
  });

  it("removes the availability copy from the OTP step", async () => {
    globalThis.fetch = mock(() =>
      jsonResponse({ ok: true, data: { ticket: "ticket-one" } }),
    ) as typeof fetch;
    render(<RegisterPage />);

    await fillValidRegistrationDetails();
    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );
    await screen.findByLabelText("Verification code");

    expect(
      screen.getByRole("heading", { level: 1, name: "Verify your email" }),
    ).toBeTruthy();
    expect(screen.queryByText("Congratulations!")).toBeNull();
    expect(screen.queryByText("dental.bio/dr-ada")).toBeNull();
    expect(screen.queryByText("is available, make it yours:")).toBeNull();
  });

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

  it("keeps the date of birth field manually editable", () => {
    render(<ControlledDateOfBirth />);
    const birthday = screen.getByLabelText("Date of birth");

    fireEvent.change(birthday, { target: { value: "21/09/1992" } });
    fireEvent.blur(birthday);

    expect(birthday.value).toBe("21/09/1992");
  });

  it("limits calendar selection to the adult cutoff and formats the selected date", async () => {
    setSystemTime(new Date(2026, 7, 3, 12));
    const user = userEvent.setup();
    render(<ControlledDateOfBirth />);
    const trigger = screen.getByRole("button", {
      name: "Open date of birth calendar",
    });

    await user.click(trigger);

    expect(
      screen.getByRole("dialog", { name: "Choose date of birth" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Select a date between 3 August 1908 and 3 August 2008.",
      ),
    ).toBeTruthy();
    const year = screen.getByRole("combobox", { name: "Choose the Year" });
    const yearOptions = Array.from(year.querySelectorAll("option"));
    expect(yearOptions.at(0)?.value).toBe("1908");
    expect(yearOptions.at(-1)?.value).toBe("2008");
    expect(
      screen.getByRole("button", {
        name: "Monday, August 4th, 2008",
      }).disabled,
    ).toBe(true);

    await user.click(
      screen.getByRole("button", {
        name: "Sunday, August 3rd, 2008",
      }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("Date of birth").value).toBe("03/08/2008");
    expect(document.activeElement).toBe(trigger);
  });

  it("clamps a leap-day adult cutoff to the last valid target date", async () => {
    setSystemTime(new Date(2028, 1, 29, 12));
    const user = userEvent.setup();
    render(<ControlledDateOfBirth />);

    await user.click(
      screen.getByRole("button", { name: "Open date of birth calendar" }),
    );

    expect(
      screen.getByText(
        "Select a date between 28 February 1910 and 28 February 2010.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Monday, March 1st, 2010",
      }),
    ).toBeNull();
  });

  it("closes the date picker on cancel and restores focus", async () => {
    const user = userEvent.setup();
    render(<ControlledDateOfBirth />);
    const trigger = screen.getByRole("button", {
      name: "Open date of birth calendar",
    });

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes the date picker with Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<ControlledDateOfBirth />);
    const trigger = screen.getByRole("button", {
      name: "Open date of birth calendar",
    });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
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
