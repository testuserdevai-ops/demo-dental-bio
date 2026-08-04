"use client";

import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { Button } from "@/app/components/ui/button";

export function MoveButtons({
  label,
  index,
  total,
  onMove,
  disabled,
}: {
  label: string;
  index: number;
  total: number;
  onMove(direction: -1 | 1): void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Move ${label} up`}
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
      >
        <CaretUp aria-hidden="true" className="size-5" weight="bold" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Move ${label} down`}
        disabled={disabled || index === total - 1}
        onClick={() => onMove(1)}
      >
        <CaretDown aria-hidden="true" className="size-5" weight="bold" />
      </Button>
    </div>
  );
}
