"use client";

import {
  CaretDown,
  CaretUp,
  Eye,
  EyeSlash,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Button } from "@/app/components/ui/button";

function GalleryCard({
  title,
  enabled,
  actionsEnabled,
  imageColumns,
  position,
  total,
  images,
  onMove,
  onEdit,
  onToggle,
  onDelete,
}: {
  title: string;
  enabled: boolean;
  actionsEnabled: boolean;
  imageColumns: 1 | 2;
  position: number;
  total: number;
  images: ReactNode;
  onMove(direction: -1 | 1): void;
  onEdit(): void;
  onToggle(): void;
  onDelete(): void;
}) {
  return (
    <article
      className="max-h-[30rem] overflow-hidden rounded-3xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
      data-testid="gallery-card"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={`Move ${title} up`}
              aria-label={`Move ${title} up`}
              disabled={!actionsEnabled || position === 1}
              onClick={() => onMove(-1)}
            >
              <CaretUp aria-hidden="true" className="size-5" weight="bold" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={`Move ${title} down`}
              aria-label={`Move ${title} down`}
              disabled={!actionsEnabled || position === total}
              onClick={() => onMove(1)}
            >
              <CaretDown aria-hidden="true" className="size-5" weight="bold" />
            </Button>
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-base font-semibold text-primary sm:text-lg">
              {title}
            </h4>
            <p className="text-xs text-muted-foreground">
              Position {position} of {total}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={`Edit ${title}`}
            aria-label={`Edit ${title}`}
            disabled={!actionsEnabled}
            onClick={onEdit}
          >
            <PencilSimple aria-hidden="true" className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            title={`Delete ${title}`}
            aria-label={`Delete ${title}`}
            disabled={!actionsEnabled}
            onClick={onDelete}
          >
            <Trash aria-hidden="true" className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-pressed={enabled}
            disabled={!actionsEnabled}
            aria-label={`${enabled ? "Hide" : "Show"} ${title}`}
            title={enabled ? "Hide from profile" : "Show on profile"}
            onClick={onToggle}
          >
            {enabled ? (
              <Eye aria-hidden="true" className="size-5 text-primary" />
            ) : (
              <EyeSlash
                aria-hidden="true"
                className="size-5 text-muted-foreground"
              />
            )}
          </Button>
        </div>
      </div>
      <div
        className={
          imageColumns === 2
            ? "grid grid-cols-2 gap-3 p-3 sm:gap-6 sm:p-6"
            : "mx-auto grid max-w-xl p-4 sm:p-6"
        }
      >
        {images}
      </div>
    </article>
  );
}

export { GalleryCard };
