"use client";
import { useState, useEffect } from "react";

function ChevDown() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className="size-6 text-primary-orange-2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

function ChevUp() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className="size-6 text-primary-orange-2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 15.75 7.5-7.5 7.5 7.5"
      />
    </svg>
  );
}

type DropdownProps = {
  name?: string;
  selected: string;
  onSelect?: (value: string) => void;
  options: string[];
  label: string;
  isLabelBottom?: boolean;
  labelBottom?: string;
  errorMessage?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export default function Dropdown({
  name,
  selected,
  onSelect,
  options,
  label,
  isLabelBottom,
  labelBottom,
  size = "md",
  errorMessage = "",
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(selected);
  const [isLabelBottomState, setIsLableBottomState] = useState(false)

  useEffect(() => {
    setIsLableBottomState(true)
  }, [isLabelBottom])

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: string) => {
    if (onSelect)
      onSelect(option); // Pass selected option to parent
    setSelectedValue(option);
    setIsOpen(false); // Close dropdown after selecting an option
  };

  const heightClass = size === "sm" ? "h-[40px]" : size === "md" ? "h-[50px]" : "h-[77px]"
  const paddingYClass = size === "sm" ? "py-0" : "py-1.5"

  return (
    <div className={className}>
      <h2 className={`text-base text-dark ${size !== "sm" ? "font-semibold mb-3" : "mb-2"}`}>{label}</h2>
      <div
        className={`w-full rounded-[20px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-2 pl-3 flex flex-col items-center justify-between transition-all duration-300 ease-in-out 
          ${isOpen ? "h-auto" : heightClass}
          ${errorMessage ? "border-red-500" : ""}
          `}
      >
        {/* Header (Selected Option and ChevDown/ChevUp) */}
        <div
          className="w-full flex justify-between items-center cursor-pointer"
          onClick={toggleMenu}
        >
          <span className={`text-dark transition-all duration-300 ease-in-out ${paddingYClass}`}>
            {selectedValue || `Select ${label}`}
          </span>
          <div className=" px-4">{isOpen ? <ChevUp /> : <ChevDown />}</div>
        </div>

        {/* Dropdown content */}
        <div
          className={`flex-col items-center justify-center gap-2 w-full overflow-hidden transition-all  duration-300 ease-in-out ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            }`}
          style={{
            transitionProperty: "max-height, opacity",
            transitionDuration: isOpen ? "400ms" : "300ms",
          }}
        >
          <div className="flex flex-col justify-start items-center gap-1 w-full mt-2 max-h-96 overflow-y-scroll">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => handleOptionClick(option)}
                type="button"
                className="py-3 px-4 rounded-full text-dark w-full transition-all hover:bg-primary-4 text-center duration-300 ease-in-out"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
      {isLabelBottom && labelBottom &&
        <div className="text-dark font-medium text-sm mx-10 mt-2">
          {labelBottom}
        </div>}
      {name && <input type="hidden" name={name} value={selectedValue} />}
    </div>
  );
}
