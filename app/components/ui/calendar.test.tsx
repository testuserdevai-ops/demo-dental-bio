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
      disabled={new Date(2000, 4, 12)}
      classNames={{
        day_button: "consumer-day-button",
        button_previous: "consumer-previous-button",
      }}
    />
  );
}

describe("Calendar", () => {
  it("preserves accessible calendar navigation and selection semantics", async () => {
    const user = userEvent.setup();
    const { container } = render(<ControlledCalendar />);

    expect(screen.getByRole("grid", { name: "May 2000" })).toBeTruthy();
    const previous = screen.getByRole("button", {
      name: "Go to the Previous Month",
    });
    expect(previous.classList.contains("consumer-previous-button")).toBe(true);
    expect(previous.classList.contains("rdp-button_previous")).toBe(true);
    expect(previous.classList.contains("size-8")).toBe(true);
    expect(
      screen.getByRole("button", { name: "Go to the Next Month" }),
    ).toBeTruthy();
    const selectedDay = screen.getByRole("button", {
      name: "Wednesday, May 10th, 2000, selected",
    });
    expect(selectedDay.classList.contains("consumer-day-button")).toBe(true);
    expect(selectedDay.classList.contains("rdp-day_button")).toBe(true);
    expect(selectedDay.classList.contains("size-9")).toBe(true);
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

  it("keeps meaningful calendar text high contrast while distinguishing disabled dates", () => {
    const { container } = render(<ControlledCalendar />);

    const weekday = container.querySelector('th[aria-label="Sunday"]');
    expect(weekday?.classList.contains("text-foreground")).toBe(true);
    expect(weekday?.classList.contains("text-muted-foreground")).toBe(false);

    const outsideDate = screen
      .getByRole("button", { name: "Sunday, April 30th, 2000" })
      .closest("td");
    expect(outsideDate?.classList.contains("text-foreground")).toBe(true);
    expect(outsideDate?.classList.contains("opacity-70")).toBe(false);
    expect(outsideDate?.classList.contains("opacity-50")).toBe(false);

    const disabledDate = screen
      .getByRole("button", { name: "Friday, May 12th, 2000" })
      .closest("td");
    expect(disabledDate?.classList.contains("opacity-40")).toBe(true);
  });
});
