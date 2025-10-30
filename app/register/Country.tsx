"use client";
import { useState } from "react";

function ChevDown() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
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
      strokeWidth={1.5}
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

type CountryProps = {
  selected: string;
  onSelect: (value: string) => void;
  options: string[];
  label: string;
  errorMessage?: string;
};

export default function Country({
  selected,
  onSelect,
  options,
  label,
  errorMessage = "",
}: CountryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: string) => {
    onSelect(option); // Pass selected option to parent
    setIsOpen(false); // Close Country after selecting an option
  };

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative z-50 left-1/2 top-5 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5 font-semibold">
      <div
        className={`max-w-xl w-full rounded-[40px] border-[0.6px] shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 py-4 px-3 flex flex-col items-center justify-between transition-all duration-300 ease-in-out 
          ${isOpen ? "h-auto" : "h-[77px]"} 
          ${errorMessage ? "border-red-500" : ""}`}
      >
        {/* Header (Selected Option and ChevDown/ChevUp) */}
        <div
          className="w-full flex justify-between items-center cursor-pointer"
          onClick={toggleMenu}
        >
          <span className="text-2xl text-dark px-4 py-1.5">
            {selected || `Select ${label}`}
          </span>
          <div className="px-4">{isOpen ? <ChevUp /> : <ChevDown />}</div>
        </div>

        {/* Country content */}
        {isOpen && (
          <div
            className={`flex-col items-center justify-center gap-2 px-2 w-full transition-all duration-300 ease-in-out`}
          >
            {/* Search Field */}
            <input
              type="text"
              placeholder="Search ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 px-4 rounded-full border-[0.6px] font-medium border-neutral-300 text-xl mt-3 focus:outline-none focus:border-primary-1"
            />

            <div className="flex flex-col justify-start items-start gap-2 w-full mt-5 overflow-y-auto max-h-[300px]">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleOptionClick(option)}
                    className="py-3 px-4 rounded-full text-dark w-full transition-all text-2xl hover:bg-primary-4 text-center duration-300 ease-in-out"
                  >
                    {option}
                  </button>
                ))
              ) : (
                <p className="text-center pl-4 pb-2 text-2xl text-neutral-500">
                  No options found
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
