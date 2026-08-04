import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
} from "@phosphor-icons/react";
import type { ChevronProps } from "react-day-picker";

export function CalendarChevron({
  orientation = "left",
  className,
  size = 16,
  disabled,
}: ChevronProps) {
  const iconProps = {
    "aria-hidden": true,
    className,
    size,
    weight: "bold" as const,
    opacity: disabled ? 0.5 : undefined,
  };

  if (orientation === "right") return <CaretRight {...iconProps} />;
  if (orientation === "up") return <CaretUp {...iconProps} />;
  if (orientation === "down") return <CaretDown {...iconProps} />;
  return <CaretLeft {...iconProps} />;
}
