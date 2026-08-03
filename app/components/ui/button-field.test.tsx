// @ts-nocheck -- Bun provides its test module at runtime.
import React from "react";
import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./button";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Input } from "./input";
import { Textarea } from "./textarea";

afterEach(cleanup);

describe("owned button and field primitives", () => {
  it("forwards native button behavior and exposes pending state", () => {
    const onClick = () => {};
    render(
      <Button type="submit" isPending onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("links label, description, and assertive error to an invalid input", () => {
    render(
      <Field id="website" invalid>
        <FieldLabel>Website</FieldLabel>
        <Input />
        <FieldDescription>Use your public URL.</FieldDescription>
        <FieldError assertive>Enter a valid URL.</FieldError>
      </Field>,
    );
    const input = screen.getByLabelText("Website");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(
      "website-description website-error",
    );
    expect(screen.getByRole("alert").textContent).toBe("Enter a valid URL.");
  });

  it("keeps textarea native controlled input behavior", () => {
    let value = "";
    const view = render(
      <Textarea
        aria-label="Bio"
        value={value}
        onChange={(event) => {
          value = event.target.value;
        }}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Bio" }), {
      target: { value: "Dental professional" },
    });
    view.rerender(
      <Textarea aria-label="Bio" value={value} onChange={() => {}} />,
    );
    expect(
      (screen.getByRole("textbox", { name: "Bio" }) as HTMLTextAreaElement)
        .value,
    ).toBe("Dental professional");
  });
});
