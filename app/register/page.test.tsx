// @ts-nocheck -- Bun provides test globals at runtime.
import React, { useState } from "react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import {
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
    positions: ["Dentist"],
  }),
}));
mock.module("@/utils/hooks/useDeviceFingerprint", () => ({
  useDeviceFingerprint: () => "test-fingerprint",
}));
mock.module("@/utils/functions/getUserIp", () => ({
  getUserLocation: () => Promise.resolve("United Kingdom"),
}));
mock.module("@/utils/domainConfig", () => ({
  getDomainConfigByHostname: () => null,
  getAllDomains: () => ["dental.bio"],
  getDomainConfig: () => ({
    domain: "dental.bio",
    positions: ["Dentist"],
  }),
}));

const { default: RegisterPage } = await import("./page");
const { DateOfBirthField } = await import("./_components/DateOfBirthField");
const { RegistrationOtpInput } =
  await import("./_components/RegistrationOtpInput");

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
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
});
