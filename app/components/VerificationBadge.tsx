"use client";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

type VerificationBadgeProps = {
  tooltipText?: string;
  size?: number;
  direction?: "top" | "right" | "bottom" | "left";
};

export default function VerificationBadge({
  tooltipText,
  size = 17,
  direction = "top",
}: VerificationBadgeProps) {
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);

  const showTooltip = () => {
    setTooltipVisible(true);
  };

  const hideTooltip = () => {
    setTooltipVisible(false);
  };

  const tooltipPositionClass =
    direction === "top"
      ? "bottom-6 left-1/2 -translate-x-1/2"
      : direction === "right"
        ? "left-0 top-6 -translate-x-12 xs:translate-x-0 xs:left-6 xs:top-1/2 xs:-translate-y-1/2"
        : direction === "bottom"
          ? "top-6 left-1/2 -translate-x-1/2"
          : "left-6 top-1/2 -translate-y-1/2";

  return (
    <div
      className="group relative"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <SealCheck
        className="verified-icon text-accent-blue"
        size={size}
        weight="fill"
      />
      <div
        className={`absolute text-sm w-[260px] text-center ${tooltipPositionClass} bg-gray-600 text-white p-2 z-50 rounded-lg transition-opacity duration-300 ${tooltipVisible ? "opacity-100 visible" : "opacity-0 invisible"}`}
      >
        {tooltipText || "This account has been ID verified"}
      </div>
    </div>
  );
}
