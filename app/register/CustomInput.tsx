"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

type CustomInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  name?: string;
  labelBottom?: string;
  containerClassName?: string; // New prop for container div
  inputClassName?: string;     // New prop for input
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
  ...rest
}: CustomInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Helper to parse dd/mm/yyyy string to Date
  const parseDate = (dateStr: string): Date | undefined => {
    const [day, month, year] = dateStr.split("/").map(Number);
    if (!day || !month || !year) return undefined;
    return new Date(year, month - 1, day);
  };

  // Helper to format Date to dd/mm/yyyy
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (!showCalendar) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalendar]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleInputFocus = () => {
    if (type === "date") setShowCalendar(true);
  };

  const handleDaySelect = (date: Date | undefined) => {
    if (date) {
      onChange(formatDate(date));
      setShowCalendar(false);
    }
  };

  return (
    <div className={`relative left-1/2 top-5 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5 ${type === "date" ? "z-[100]" : ""} ${containerClassName}`}>
      <div className="max-w-xl w-full rounded-[40px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-4 px-3 flex items-center justify-between transition-all duration-300 ease-in-out">
        <input
          type={type !== "date" ? type : "text"}
          name={name ? name : "text"}
          value={value}
          onChange={handleChange}
          required
          placeholder={placeholder}
          className={`w-full bg-transparent text-2xl text-dark font-semibold px-4 py-1.5 outline-none placeholder-neutral-500 placeholder:text-2xl ${inputClassName}`}
          ref={inputRef}
          onFocus={handleInputFocus}
          readOnly={type === "date"}
          {...rest}
        />
        {type === "date" && (
          <span className="text-gray-500 text-sm ml-2">dd/mm/yyyy</span>
        )}
      </div>
      {type === "date" && showCalendar && (
        <div ref={calendarRef} className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl p-6">
          <DayPicker
            mode="single"
            selected={parseDate(value)}
            onSelect={handleDaySelect}
            defaultMonth={parseDate(value) || undefined}
            fromYear={1900}
            toYear={new Date().getFullYear()}
            captionLayout="dropdown"
            showOutsideDays
            className="mx-auto"
          />
        </div>
      )}
      {labelBottom && (
        <div className="text-dark font-medium text-sm mx-10 mt-2">{labelBottom}</div>
      )}
    </div>
  );
}
