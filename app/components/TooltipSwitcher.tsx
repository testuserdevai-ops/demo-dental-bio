import React, { useState } from "react";
import Switcher from "./Switcher"; // Reuse the existing Switcher component

interface TooltipSwitcherProps {
  id: string;
  isChecked: boolean;
  onToggle: () => void;
  labelLeft: string;
  labelRight: string;
  tooltipText?: string; // Optional tooltip text
}

export default function TooltipSwitcher({
  id,
  isChecked,
  onToggle,
  labelLeft,
  labelRight,
  tooltipText,
}: TooltipSwitcherProps) {
  const [isTooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div
      className="relative flex items-center gap-2"
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <label>{labelLeft}</label>
      <Switcher id={id} isChecked={isChecked} onToggle={onToggle} />
      <label>{labelRight}</label>

      {tooltipText && isTooltipVisible && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-48 bg-gray-800 text-white text-sm rounded-md px-3 py-1 shadow-lg z-10">
          {tooltipText}
        </div>
      )}
    </div>
  );
}
