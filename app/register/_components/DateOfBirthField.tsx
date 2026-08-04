"use client";

import { CalendarBlank } from "@phosphor-icons/react";
import { useId, useMemo, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { getBirthdayBounds } from "@/lib/auth/birthday-policy";

import { normalizeBirthday } from "../_lib/date";

type DateOfBirthFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
};

function formatDate(date: Date) {
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function parseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}

export function DateOfBirthField({
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: DateOfBirthFieldProps) {
  const descriptionId = useId();
  const errorId = useId();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { adultCutoff, earliestBirthday } = useMemo(
    () => getBirthdayBounds(),
    [],
  );
  const selectedDate = parseDate(value);

  const normalize = (candidate: string) => {
    const normalized = normalizeBirthday(candidate);
    if (normalized) onChange(normalized);
  };

  return (
    <div className="space-y-1.5">
      <label
        className="text-sm font-semibold text-foreground"
        htmlFor="birthday"
      >
        Date of birth
      </label>
      <div className="flex items-center gap-2">
        <input
          id="birthday"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            normalize(value);
            onBlur();
          }}
          onPaste={(event) => {
            const normalized = normalizeBirthday(
              event.clipboardData.getData("text"),
            );
            if (normalized) {
              event.preventDefault();
              onChange(normalized);
            }
          }}
          placeholder="DD/MM/YYYY"
          inputMode="numeric"
          autoComplete="bday"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
          disabled={disabled}
          className="flex h-11 min-w-0 flex-1 rounded-[var(--radius-md)] border border-border bg-input px-3 py-2 text-base text-foreground placeholder:text-placeholder focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive"
        />
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              aria-label="Open date of birth calendar"
            >
              <CalendarBlank aria-hidden="true" size={20} />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-fit max-w-[calc(100%_-_2rem)]">
            <DialogHeader>
              <DialogTitle>Choose date of birth</DialogTitle>
              <DialogDescription className="text-foreground">
                Select a date between {formatLongDate(earliestBirthday)} and{" "}
                {formatLongDate(adultCutoff)}.
              </DialogDescription>
            </DialogHeader>
            <Calendar
              mode="single"
              captionLayout="dropdown"
              selected={selectedDate}
              defaultMonth={selectedDate ?? adultCutoff}
              startMonth={earliestBirthday}
              endMonth={adultCutoff}
              disabled={[{ before: earliestBirthday }, { after: adultCutoff }]}
              onSelect={(date) => {
                if (!date) return;
                onChange(formatDate(date));
                onBlur();
                setCalendarOpen(false);
              }}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <p id={descriptionId} className="text-sm text-muted-foreground">
        Use DD/MM/YYYY. You must be at least 18 years old.
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
