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

  it("removes every action path from disabled asChild links", () => {
    let clicks = 0;
    render(
      <Button asChild disabled>
        <a
          aria-label="Open dashboard"
          href="https://example.test/dashboard"
          onClick={() => clicks++}
        >
          Open dashboard
        </a>
      </Button>,
    );
    const link = screen.getByText("Open dashboard");
    expect(link.getAttribute("href")).toBeNull();
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("aria-label")).toBe("Open dashboard");
    expect(link.getAttribute("tabindex")).toBe("-1");
    fireEvent.click(link);
    fireEvent.keyDown(link, { key: "Enter" });
    expect(clicks).toBe(0);
  });

  it("removes every action path from pending asChild links", () => {
    let clicks = 0;
    render(
      <Button asChild isPending>
        <a href="https://example.test/dashboard" onClick={() => clicks++}>
          Open dashboard
        </a>
      </Button>,
    );
    const link = screen.getByText("Open dashboard");
    expect(link.getAttribute("href")).toBeNull();
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("aria-busy")).toBe("true");
    expect(link.getAttribute("tabindex")).toBe("-1");
    fireEvent.click(link);
    fireEvent.keyDown(link, { key: "Enter" });
    expect(clicks).toBe(0);
  });

  it("keeps safe parent props and refs on disabled asChild content", () => {
    let parentClicks = 0;
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <Button
        asChild
        aria-label="Unavailable dashboard"
        aria-describedby="help-text"
        data-testid="disabled-dashboard"
        data-state="unavailable"
        disabled
        id="dashboard-control"
        onClick={() => parentClicks++}
        ref={ref}
        type="submit"
      >
        <a href="https://example.test/dashboard">Open dashboard</a>
      </Button>,
    );
    const control = screen.getByTestId("disabled-dashboard");
    expect(control.getAttribute("id")).toBe("dashboard-control");
    expect(control.getAttribute("aria-label")).toBe("Unavailable dashboard");
    expect(control.getAttribute("aria-describedby")).toBe("help-text");
    expect(control.getAttribute("data-state")).toBe("unavailable");
    expect(control.getAttribute("type")).toBeNull();
    expect(ref.current).toBe(control);
    fireEvent.click(control);
    expect(parentClicks).toBe(0);
  });

  it("shows pending feedback for pending asChild content", () => {
    render(
      <Button asChild isPending>
        <a href="https://example.test/dashboard">Open dashboard</a>
      </Button>,
    );
    const control = screen.getByText("Open dashboard");
    expect(control.querySelector("svg[aria-hidden='true']")).not.toBeNull();
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

  it("describes a control only with nodes that exist", () => {
    const view = render(
      <Field id="title">
        <FieldLabel>Title</FieldLabel>
        <Input />
      </Field>,
    );
    expect(
      screen.getByLabelText("Title").getAttribute("aria-describedby"),
    ).toBeNull();
    view.rerender(
      <Field id="title" invalid>
        <FieldLabel>Title</FieldLabel>
        <Input />
        <FieldError id="actual-error">Required</FieldError>
      </Field>,
    );
    expect(
      screen.getByLabelText("Title").getAttribute("aria-describedby"),
    ).toBe("actual-error");
  });

  it("uses only a rendered description ID", () => {
    render(
      <Field id="website">
        <FieldLabel>Website</FieldLabel>
        <Input />
        <FieldDescription id="custom-description">
          Use your public URL.
        </FieldDescription>
      </Field>,
    );
    expect(
      screen.getByLabelText("Website").getAttribute("aria-describedby"),
    ).toBe("custom-description");
  });

  it("uses only a rendered error ID when invalid", () => {
    render(
      <Field id="website" invalid>
        <FieldLabel>Website</FieldLabel>
        <Input />
        <FieldError id="custom-error">Required</FieldError>
      </Field>,
    );
    expect(
      screen.getByLabelText("Website").getAttribute("aria-describedby"),
    ).toBe("custom-error");
  });

  it("removes a dynamic error ID when its node is removed", () => {
    const view = render(
      <Field id="website" invalid>
        <FieldLabel>Website</FieldLabel>
        <Input />
        <FieldDescription>Description</FieldDescription>
        <FieldError>Error</FieldError>
      </Field>,
    );
    expect(
      screen.getByLabelText("Website").getAttribute("aria-describedby"),
    ).toBe("website-description website-error");
    view.rerender(
      <Field id="website">
        <FieldLabel>Website</FieldLabel>
        <Input />
        <FieldDescription>Description</FieldDescription>
      </Field>,
    );
    expect(
      screen.getByLabelText("Website").getAttribute("aria-describedby"),
    ).toBe("website-description");
  });

  it("merges external described-by IDs without duplicate tokens", () => {
    render(
      <Field id="website" invalid>
        <FieldLabel>Website</FieldLabel>
        <Input aria-describedby="external website-description external" />
        <FieldDescription>Description</FieldDescription>
        <FieldError>Error</FieldError>
      </Field>,
    );
    expect(
      screen.getByLabelText("Website").getAttribute("aria-describedby"),
    ).toBe("external website-description website-error");
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
