import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OtpInput from "./OtpInput";

describe("OtpInput", () => {
  it("exposes an accessible numeric one-time-code group", () => {
    render(<OtpInput autoFocus={false} invalid describedBy="otp-error" />);

    const first = screen.getByRole("textbox", {
      name: "Verification code digit 1 of 6",
    });
    expect(first.getAttribute("aria-invalid")).toBe("true");
    expect(first.getAttribute("autocomplete")).toBe("one-time-code");
    expect(first.getAttribute("inputmode")).toBe("numeric");
    expect(first.getAttribute("aria-describedby")).toBe("otp-error");
  });

  it("supports full-code paste and completes once", async () => {
    const user = userEvent.setup();
    const onChange = mock(() => undefined);
    const onComplete = mock(() => undefined);
    render(
      <OtpInput
        autoFocus={false}
        onChange={onChange}
        onComplete={onComplete}
      />,
    );

    const first = screen.getByRole("textbox", {
      name: "Verification code digit 1 of 6",
    });
    await user.click(first);
    await user.paste("12 34-56");

    expect(onChange).toHaveBeenLastCalledWith("123456");
    expect(onComplete).toHaveBeenCalledWith("123456");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("supports arrow navigation and backward deletion", async () => {
    const user = userEvent.setup();
    render(<OtpInput autoFocus={false} />);
    const first = screen.getByRole("textbox", {
      name: "Verification code digit 1 of 6",
    });
    const second = screen.getByRole("textbox", {
      name: "Verification code digit 2 of 6",
    });

    await user.click(first);
    await user.keyboard("1");
    expect(document.activeElement).toBe(second);
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(first);
    await user.keyboard("{ArrowRight}{Backspace}");
    expect(document.activeElement).toBe(first);
    expect((first as HTMLInputElement).value).toBe("");
  });
});
