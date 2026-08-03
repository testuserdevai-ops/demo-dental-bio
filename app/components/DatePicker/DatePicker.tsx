"use client";
import LabeledInput from "@/app/dashboard/components/LabeledInput";
import React, { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface DatePickerProps {
  selectedDate: Date | null;
  name: string;
  onChange: (date: Date | null) => void;
  className?: string;
  label: string;
}

const CustomDatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  name,
  onChange,
  className,
  label,
}) => {
  const [showCalendar, setShowCalendar] = useState<Boolean>(false);

  const handleSelect = (date: Date) => {
    setShowCalendar(false);
    onChange(date);
  };

  const today = new Date();
  const currentYear = today.getFullYear();

  // Ensure defaultMonth is always within range
  const safeDefaultMonth =
    selectedDate && typeof selectedDate !== "string" ? selectedDate : today;

  return (
    <div className={`${className}`}>
      <LabeledInput
        label={label}
        name={name}
        value={
          selectedDate
            ? typeof selectedDate === "string"
              ? selectedDate
              : `${String(selectedDate.getDate()).padStart(2, "0")}/${String(selectedDate.getMonth() + 1).padStart(2, "0")}/${selectedDate.getFullYear()}`
            : ""
        }
        onFocus={() => setShowCalendar(true)}
        readOnly
      />
      {showCalendar && (
        <div
          className="absolute z-50 left-1/2 -translate-x-1/2 -translate-y-[360px] bg-white rounded-lg shadow-xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <DayPicker
            mode="single"
            selected={
              selectedDate && typeof selectedDate !== "string"
                ? selectedDate
                : undefined
            }
            onSelect={handleSelect}
            defaultMonth={safeDefaultMonth}
            captionLayout="dropdown"
            startMonth={new Date(currentYear, 0)}
            endMonth={new Date(2099, 11)}
            showOutsideDays
            required
            className="mx-auto"
          />
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
