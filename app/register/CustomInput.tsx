"use client";

import { parseAnyDate } from "@/utils/functions/functions";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

type CustomInputProps = {
  value: string;
  onChange?: (value: string) => void;
  placeholder: string;
  type?: string;
  name?: string;
  labelBottom?: string;
  containerClassName?: string; // New prop for container div
  inputClassName?: string;     // New prop for input
  // New: visual variant and class overrides for date segments
  variant?: "default" | "unstyled";
  dateGroupClassName?: string;
  dateSegmentClassName?: string;
  dateSeparatorClassName?: string;
  calendarWrapperClassName?: string;
  showFormatHint?: boolean;
  errorMessage?: string;
  // New: optional Date value channel
  dateValue?: Date | null;
  onDateValueChange?: (date: Date | null) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>; // Exclude onChange from HTML attributes

export default function CustomInput({
  value,
  onChange,
  placeholder,
  type = "text",
  name,
  labelBottom,
  containerClassName = "",
  inputClassName = "",
  variant = "default",
  dateGroupClassName = "",
  dateSegmentClassName = "",
  dateSeparatorClassName = "",
  calendarWrapperClassName = "",
  showFormatHint = true,
  errorMessage = "",
  dateValue = null,
  onDateValueChange,
  ...rest
}: CustomInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  // Segmented inputs refs for date typing UX
  const dayRef = useRef<HTMLInputElement | null>(null);
  const monthRef = useRef<HTMLInputElement | null>(null);
  const yearRef = useRef<HTMLInputElement | null>(null);

  // Local segments for date type
  const [daySegment, setDaySegment] = useState("");
  const [monthSegment, setMonthSegment] = useState("");
  const [yearSegment, setYearSegment] = useState("");

  // Helper to parse dd/mm/yyyy string to Date
  const parseDate = (dateStr: string): Date | undefined => {
    const [day, month, year] = dateStr.split("/").map(Number);
    if (!day || !month || !year) return undefined;
    return new Date(year, month - 1, day);
  };

  const today = new Date();
  const pastDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

  // Helper to format Date to dd/mm/yyyy
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Keep local segments in sync with external value or dateValue
  useEffect(() => {
    if (type !== "date" || showCalendar === true) return;
    // Normalize incoming value to dd/mm/yyyy for segmented UI
    console.log(value);
    const normalized = dateValue
      ? formatDate(dateValue)
      : ((): string => {
          const parsed = parseAnyDate(value);
          return parsed ? formatDate(parsed) : (value || "").trim();
        })();

    const match = /^(\d{0,2})(?:\/(\d{0,2}))?(?:\/(\d{0,4}))?$/.exec(normalized);
    if (match) {
      const d = match[1] || "";
      const m = match[2] || "";
      const y = match[3] || "";
      setDaySegment(d);
      setMonthSegment(m);
      setYearSegment(y);
    } else if (!normalized) {
      setDaySegment("");
      setMonthSegment("");
      setYearSegment("");
    }
  }, [value, dateValue, type, showCalendar]);

  useEffect(() => {
    if (!showCalendar) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        // If click is outside segmented inputs
        !(dayRef.current && dayRef.current.contains(event.target as Node)) &&
        !(monthRef.current && monthRef.current.contains(event.target as Node)) &&
        !(yearRef.current && yearRef.current.contains(event.target as Node)) &&
        !(inputRef.current && inputRef.current.contains(event.target as Node))
      ) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalendar]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Standard input types
    if (type !== "date" && onChange) {
      onChange(e.target.value);
      return;
    }
  };

  const handleInputFocus = () => {
    if (type === "date") setShowCalendar(true);
  };

  const handleGroupBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (type !== "date") return;

    if (daySegment === "" && monthSegment === "" && yearSegment === "") {
      if (onChange)
        onChange("");
      return;
    }

    const nextTarget = e.relatedTarget as Node | null;
    const focusMovesIntoCalendar =
      nextTarget && calendarRef.current && calendarRef.current.contains(nextTarget);
    const focusStaysInGroup =
      nextTarget &&
      (dayRef.current?.contains(nextTarget) ||
        monthRef.current?.contains(nextTarget) ||
        yearRef.current?.contains(nextTarget));
    if (focusMovesIntoCalendar || focusStaysInGroup) return;

    // Coerce/pad to a valid full date on group blur
    const minYear = 1900;
    const maxYear = today.getFullYear();

    let d = onlyDigits(daySegment);
    let m = onlyDigits(monthSegment);
    let y = onlyDigits(yearSegment);

    if (d.length === 0) d = "01";
    if (m.length === 0) m = "01";
    if (y.length === 0) y = String(maxYear);

    if (d.length === 1) d = `0${d}`;
    if (m.length === 1) m = `0${m}`;
    if (y.length < 4) {
      const currentYearStr = String(maxYear);
      const needed = 4 - y.length;
      y = `${currentYearStr.slice(0, needed)}${y}`;
    }

    const mNum = clamp(Number(m), 1, 12);
    const yNum = clamp(Number(y), minYear, maxYear);
    const maxDay = getDaysInMonth(yNum, mNum);
    const dNum = clamp(Number(d), 1, maxDay);

    const newDay = String(dNum).padStart(2, "0");
    const newMonth = String(mNum).padStart(2, "0");
    const newYear = String(yNum).padStart(4, "0");

    setDaySegment(newDay);
    setMonthSegment(newMonth);
    setYearSegment(newYear);
    const composite = `${newDay}/${newMonth}/${newYear}`;

    if (onChange)
      onChange(composite);

    if (onDateValueChange)
      onDateValueChange(parseDate(composite) || null);

    setDateError(null);
  };

  const handleDaySelect = (date: Date | undefined) => {
    if (date) {
      const formatted = formatDate(date);
      const [d, m, y] = formatted.split("/");
      setDaySegment(d);
      setMonthSegment(m);
      setYearSegment(y);
      if (onChange)
        onChange(formatted);
      if (onDateValueChange) onDateValueChange(date);
      setDateError(null);
      setShowCalendar(false);
      // move focus to year after selection for accessibility
      yearRef.current?.focus();
    }
  };

  const buildCompositeValue = (d: string, m: string, y: string) => {
    if (!d) return "";
    if (!m) return `${d}/`;
    if (!y) return `${d}/${m}/`;
    return `${d}/${m}/${y}`;
  };

  const propagateCompositeChange = (d: string, m: string, y: string) => {
    const composite = buildCompositeValue(d, m, y);
    if (onChange)
      onChange(composite);
    if (dateError) setDateError(null);
    if (onDateValueChange) {
      const parsed = parseDate(composite);
      onDateValueChange(parsed || null);
    }
  };

  // Utilities for segment handlers
  const onlyDigits = (s: string) => (s || "").replace(/\D+/g, "");
  const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
  const getDaysInMonth = (year: number, month1to12: number) => new Date(year, month1to12, 0).getDate();

  const handleDayInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = onlyDigits(e.target.value).slice(0, 2);
    // Empty -> clear
    if (raw.length === 0) {
      setDaySegment("");
      return;
    }

    // One digit -> allow 0-3, otherwise normalize to 0X and advance
    if (raw.length === 1) {
      const first = raw[0];
      if (first === "0" || first === "1" || first === "2" || first === "3") {
        setDaySegment(first);
        return;
      }
      const normalized = `0${first}`;
      setDaySegment(normalized);
      monthRef.current?.focus();
      monthRef.current?.select();
      return;
    }

    // Two digits -> clamp based on current month/year (default to 31)
    let dNum = Number(raw);
    if (dNum === 0) dNum = 1;
    // Determine max based on known month/year
    const mNum = monthSegment.length === 2 ? clamp(Number(monthSegment), 1, 12) : 12;
    const yNum = yearSegment.length === 4 ? Number(yearSegment) : today.getFullYear();
    const maxDay = monthSegment.length === 2 ? getDaysInMonth(yNum, mNum) : 31;
    if (dNum > maxDay) dNum = maxDay;
    const normalized = String(dNum).padStart(2, "0");
    setDaySegment(normalized);
    monthRef.current?.focus();
    monthRef.current?.select();
  };

  const handleMonthInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = onlyDigits(e.target.value).slice(0, 2);
    // Enforce 01-12 as the user types
    if (raw.length === 0) {
      setMonthSegment("");
      return;
    }

    if (raw.length === 1) {
      const first = raw[0];
      if (first === "0" || first === "1") {
        setMonthSegment(first);
        return;
      }
      // For 2-9 typed first, normalize to 0X and advance
      const normalized = `0${first}`;
      setMonthSegment(normalized);
      yearRef.current?.focus();
      yearRef.current?.select();
      return;
    }

    // length === 2
    let num = Number(raw);
    if (num === 0) num = 1;
    if (num > 12) num = 12;
    const normalized = String(num).padStart(2, "0");
    setMonthSegment(normalized);
    // Re-validate day against new month/year
    if (daySegment.length === 2) {
      const yNum = yearSegment.length === 4 ? Number(yearSegment) : today.getFullYear();
      const maxDay = getDaysInMonth(yNum, Number(normalized));
      let dNum = clamp(Number(daySegment), 1, maxDay);
      const newDay = String(dNum).padStart(2, "0");
      if (newDay !== daySegment) setDaySegment(newDay);
    }
    yearRef.current?.focus();
    yearRef.current?.select();
  };

  const handleYearInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = onlyDigits(e.target.value).slice(0, 4);
    setYearSegment(digits);
    // If year completed and month/day present, re-validate day (leap years)
    if (digits.length === 4 && monthSegment.length === 2 && daySegment.length === 2) {
      const mNum = clamp(Number(monthSegment), 1, 12);
      const yNum = Number(digits);
      const maxDay = getDaysInMonth(yNum, mNum);
      let dNum = clamp(Number(daySegment), 1, maxDay);
      const newDay = String(dNum).padStart(2, "0");
      const newMonth = String(mNum).padStart(2, "0");
      const newYear = String(yNum).padStart(4, "0");
      if (newDay !== daySegment) setDaySegment(newDay);
      if (newMonth !== monthSegment) setMonthSegment(newMonth);
      if (newYear !== digits) setYearSegment(newYear);
      // Propagate to external value to update calendar selection
      propagateCompositeChange(newDay, newMonth, newYear);
    }
  };

  const handleDayPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const digits = onlyDigits(text).slice(0, 8); // ddmmyyyy
    if (digits.length >= 2) {
      const d = digits.slice(0, 2);
      const m = digits.slice(2, 4);
      const y = digits.slice(4, 8);
      setDaySegment(d);
      setMonthSegment(m);
      setYearSegment(y);
      propagateCompositeChange(d, m, y);
      // Focus last filled segment
      if (y.length === 4) yearRef.current?.focus();
      else if (m.length === 2) monthRef.current?.focus();
      else dayRef.current?.focus();
      e.preventDefault();
    }
  };

  const containerBaseStyles =
    "max-w-xl w-full rounded-[40px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg py-4 px-3 flex items-center justify-between transition-all duration-300 ease-in-out";

  const containerBorderStyles =
    type === "date" && dateError ? "border-red-500 ring-1 ring-red-400" : "border-neutral-300";

  // Date group renderer (shared across variants)
  const DateGroup = (
    <div
      className={`w-full flex items-center gap-0 ${inputClassName} ${dateGroupClassName}`}
      onClick={handleInputFocus}
      onBlur={handleGroupBlur}
    >
      <input
        ref={dayRef}
        value={daySegment}
        onChange={handleDayInput}
        onPaste={handleDayPaste}
        inputMode="numeric"
        placeholder="dd"
        aria-label="Day"
        className={`w-8 bg-transparent text-2xl text-dark font-semibold outline-none text-center ${dateSegmentClassName}`}
        maxLength={2}
      />
      <span className={`text-neutral-500 ${dateSeparatorClassName}`}>/</span>
      <input
        ref={monthRef}
        value={monthSegment}
        onChange={handleMonthInput}
        inputMode="numeric"
        placeholder="mm"
        aria-label="Month"
        className={`w-11 bg-transparent text-2xl text-dark font-semibold outline-none text-center ${dateSegmentClassName}`}
        maxLength={2}
      />
      <span className={`text-neutral-500 ${dateSeparatorClassName}`}>/</span>
      <input
        ref={yearRef}
        value={yearSegment}
        onChange={handleYearInput}
        inputMode="numeric"
        placeholder="yyyy"
        aria-label="Year"
        className={`w-16 bg-transparent text-2xl text-dark font-semibold outline-none text-center ${dateSegmentClassName}`}
        maxLength={4}
      />
      {showFormatHint && (
        <span className="text-gray-500 text-sm ml-auto">dd/mm/yyyy</span>
      )}
    </div>
  );

  // Render
  if (type === "date" && variant === "unstyled") {
    return (
      <div className={`${containerClassName}`}>
        {DateGroup}
        {showCalendar && (
          <div ref={calendarRef} className={`absolute z-50 mt-2 bg-white rounded-lg shadow-xl p-6 ${calendarWrapperClassName}`}>
            <DayPicker
              mode="single"
              selected={parseAnyDate(`${daySegment.padStart(2, "0")}/${monthSegment.padStart(2, "0")}/${yearSegment.padStart(4, "0")}`)}
              onSelect={handleDaySelect}
              defaultMonth={parseAnyDate(value) || pastDate}
              fromYear={1900}
              toYear={new Date().getFullYear()}
              disabled={{ after: new Date() }}
              captionLayout="dropdown"
              showOutsideDays
              className="mx-auto"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative left-1/2 top-5 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5 ${type === "date" ? "z-[100]" : ""} ${containerClassName}`}>
      <div className={`${errorMessage ? 'border-red-500' : ''} ${containerBaseStyles} ${containerBorderStyles}`}>
        {type !== "date" ? (
          <input
            type={type}
            name={name ? name : "text"}
            value={value}
            onChange={handleChange}
            required
            placeholder={`${placeholder}`}
            className={`w-full bg-transparent text-2xl text-dark font-semibold px-4 py-1.5 outline-none placeholder-neutral-500 placeholder:text-2xl ${inputClassName}`}
            ref={inputRef}
            onFocus={handleInputFocus}
            aria-invalid={false}
            {...rest}
          />
        ) : (
          <div
            className={`w-full bg-transparent text-2xl text-dark font-semibold px-4 py-1.5 outline-none placeholder-neutral-500 placeholder:text-2xl flex items-center gap-2 ${inputClassName}`}
            onClick={handleInputFocus}
            onBlur={handleGroupBlur}
          >
            {DateGroup}
          </div>
        )}
      </div>
      {type === "date" && dateError ? (
        <div id={`${name || "date"}-error`} className="text-red-600 font-medium text-sm mx-10 mt-2">
          {dateError}
        </div>
      ) : (
        labelBottom && (
          <div className="text-dark font-medium text-sm mx-10 mt-2">{labelBottom}</div>
        )
      )}
      {type === "date" && showCalendar && variant !== "unstyled" && (
        <div ref={calendarRef} className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl p-6">
          <DayPicker
            mode="single"
            selected={parseAnyDate(value)}
            onSelect={handleDaySelect}
            defaultMonth={parseAnyDate(value) || pastDate}
            fromYear={1900}
            toYear={new Date().getFullYear()}
            disabled={{ after: new Date() }}
            captionLayout="dropdown"
            showOutsideDays
            className="mx-auto"
          />
        </div>
      )}
    </div>
  );
}
