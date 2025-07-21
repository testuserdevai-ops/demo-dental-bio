import React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface DatePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholderText?: string;
  disabledDate?: Date;
}

const CustomDatePicker: React.FC<DatePickerProps> = ({ selectedDate, onChange, className, placeholderText, disabledDate }) => {
  return (
    <div className={"relative " + (className || "") + " w-full"}>
      <DayPicker
        mode="single"
        selected={selectedDate || undefined}
        onSelect={onChange}
        fromDate={disabledDate}
        className="bg-white border-none shadow-lg rounded-[26px] px-4 py-2"
        modifiersClassNames={{
          selected: "bg-blue-500 text-white",
          today: "border-blue-500",
        }}
        showOutsideDays
      />
      {placeholderText && !selectedDate && (
        <span className="absolute left-4 top-2 text-gray-400 pointer-events-none">{placeholderText}</span>
      )}
    </div>
  );
};

export default CustomDatePicker;
