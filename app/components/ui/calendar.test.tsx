// @ts-nocheck -- Bun provides its test module at runtime.
import React, { useState } from "react";
import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Calendar } from "./calendar";

afterEach(cleanup);

function ControlledCalendar() {
  const [selected, setSelected] = useState<Date | undefined>(
    new Date(2000, 4, 10),
  );

  return (
    <Calendar
      className="calendar-contract"
      mode="single"
      defaultMonth={new Date(2000, 4, 1)}
      selected={selected}
      onSelect={setSelected}
    />
  );
}

describe("Calendar", () => {
  it("preserves accessible calendar navigation and selection semantics", async () => {
    const user = userEvent.setup();
    const { container } = render(<ControlledCalendar />);

    expect(screen.getByRole("grid", { name: "May 2000" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Go to the Previous Month" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Go to the Next Month" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Wednesday, May 10th, 2000, selected",
      }),
    ).toBeTruthy();
    expect(container.querySelector(".calendar-contract")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Thursday, May 11th, 2000" }),
    );

    expect(
      screen.getByRole("button", {
        name: "Thursday, May 11th, 2000, selected",
      }),
    ).toBeTruthy();
  });
});
