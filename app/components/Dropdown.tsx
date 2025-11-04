"use client";
import { useState, useEffect, useRef } from "react";

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
  showLabel?: boolean;
  searchable?: boolean;
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
  showLabel = true,
  searchable = false,
  isLabelBottom,
  labelBottom,
  size = "md",
  errorMessage = "",
  className = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(selected);
  const [isLabelBottomState, setIsLableBottomState] = useState(false)
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLableBottomState(true)
  }, [isLabelBottom])

  const toggleMenu = () => {
    if (!dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    // space below the element
    const spaceBelow = viewportHeight - rect.bottom;

    // example: if dropdown height is 200px
    const dropdownHeight = 470;
    
    // decide whether to open upward
    if (spaceBelow < dropdownHeight && isOpen === false) {
      const scrollAmount = dropdownHeight - spaceBelow + 10; // add 10px padding
      window.scrollBy({ top: scrollAmount, behavior: "smooth" });
    }

    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: string) => {
    if (onSelect)
      onSelect(option); // Pass selected option to parent
    setSelectedValue(option);
    setIsOpen(false); // Close dropdown after selecting an option
  };

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const heightClass = size === "sm" ? "h-[40px]" : size === "md" ? "h-[50px]" : "h-[77px]"
  const handlerClass = size === "lg" ? "rounded-[40px] px-3 py-4 border-[0.6px]" : "rounded-[25px] pl-3 py-2"
  const headerClass = size === "sm" ? "py-0" : size === "md" ? "py-1.5" : "text-2xl font-semibold text-dark px-4 py-1.5"
  const baseClass = size === 'lg' ? 'relative z-50 left-1/2 top-5 transform -translate-x-1/2 max-w-xl w-full px-5 mt-5 text-2xl' : ''
  const itemClass = size === 'lg' ? " text-2xl font-semibold" : ""

  return (
    <div className={`${baseClass} ${className}`} ref={dropdownRef}>
      {showLabel &&
        <h2 className={`text-base text-dark ${size !== "sm" ? "font-semibold mb-3" : "mb-2"}`}>{label}</h2>}
      <div
        className={`w-full shadow-sm bg-white bg-opacity-90 backdrop-blur-lg border-neutral-300 flex flex-col items-center justify-between transition-all duration-300 ease-in-out ${handlerClass} 
          ${isOpen ? "h-auto" : heightClass}
          ${errorMessage ? "border-red-500" : ""}
          `}
      >
        {/* Header (Selected Option and ChevDown/ChevUp) */}
        <div
          className="w-full flex justify-between items-center cursor-pointer"
          onClick={toggleMenu}
        >
          <span className={`text-dark ${headerClass}`}>
            {selectedValue || `Select ${label}`}
          </span>
          <div className=" px-4">{isOpen ? <ChevUp /> : <ChevDown />}</div>
        </div>

        {/* Dropdown content */}
        <div
          className={`flex-col items-center justify-center gap-2 w-full overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            }`}
          style={{
            transitionProperty: "max-height, opacity",
            transitionDuration: isOpen ? "400ms" : "300ms",
          }}
        >
          <div className={`flex flex-col justify-start items-centerw-full mt-2 max-h-96 overflow-y-scroll ${size === 'lg' ? 'gap-4' : 'gap-1'}`}>
            {searchable &&
              <input
                type="text"
                placeholder="Search ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 px-4 rounded-full border-[0.6px] font-medium border-neutral-300 text-xl mt-3 focus:outline-none focus:border-primary-1"
              />}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleOptionClick(option)}
                  type="button"
                  className={`py-3 px-4 rounded-full text-dark w-full transition-all hover:bg-primary-4 text-center duration-300 ease-in-out ${itemClass}`}
                >
                  {option}
                </button>
              ))
            ) : (
              <p className={`text-center pl-4 pb-2 text-neutral-500  ${itemClass}`}>
                No options found
              </p>
            )}
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
