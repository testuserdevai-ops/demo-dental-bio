"use client";

import * as React from "react";
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
} from "@phosphor-icons/react";
import {
  DayPicker,
  getDefaultClassNames,
  type ChevronProps,
} from "react-day-picker";

import { buttonVariants } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-fit bg-popover p-3 text-popover-foreground", className)}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-8 p-0",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-8 p-0",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-8 items-center justify-center px-10",
          defaultClassNames.month_caption,
        ),
        caption_label: cn(
          "text-sm font-semibold",
          defaultClassNames.caption_label,
        ),
        dropdowns: cn(
          "flex h-8 items-center justify-center gap-1 text-sm font-semibold",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-[var(--radius-sm)] border border-border bg-input px-2 py-1 focus-within:ring-[var(--focus-ring-width)] focus-within:ring-ring",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 cursor-pointer opacity-0",
          defaultClassNames.dropdown,
        ),
        chevron: cn("size-4", defaultClassNames.chevron),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "w-9 rounded-[var(--radius-sm)] text-center text-xs font-medium text-muted-foreground",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        day: cn(
          "relative size-9 p-0 text-center text-sm",
          defaultClassNames.day,
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-9 p-0 font-normal aria-selected:opacity-100",
          defaultClassNames.day_button,
        ),
        selected: cn(
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
          defaultClassNames.selected,
        ),
        today: cn(
          "[&>button]:bg-accent [&>button]:text-accent-foreground",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-40",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarChevron({
  orientation = "left",
  className,
  size = 16,
  disabled,
}: ChevronProps) {
  const iconProps = {
    "aria-hidden": true,
    className,
    size,
    weight: "bold" as const,
    opacity: disabled ? 0.5 : undefined,
  };

  if (orientation === "right") return <CaretRight {...iconProps} />;
  if (orientation === "up") return <CaretUp {...iconProps} />;
  if (orientation === "down") return <CaretDown {...iconProps} />;
  return <CaretLeft {...iconProps} />;
}

Calendar.displayName = "Calendar";

export { Calendar, type CalendarProps };
