"use client";

import {
  CaretDown,
  CaretUp,
  DotsSixVertical,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { useDrag, useDrop } from "react-dnd";
import { Button } from "@/app/components/ui/button";
import type { TreatmentItemViewModel } from "./_lib/queries";

const ITEM_TYPE = "treatment-card";

export function TreatmentCard({
  item,
  index,
  total,
  onMove,
  onEdit,
  onDelete,
}: {
  item: TreatmentItemViewModel;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onEdit: (item: TreatmentItemViewModel, trigger: HTMLButtonElement) => void;
  onDelete: (item: TreatmentItemViewModel, trigger: HTMLButtonElement) => void;
}) {
  const [, drag] = useDrag({ type: ITEM_TYPE, item: { index } });
  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (dragged: { index: number }) => {
      if (dragged.index !== index) {
        onMove(dragged.index, index);
        dragged.index = index;
      }
    },
  });

  return (
    <article
      ref={(node) => {
        drop(node);
      }}
      className="flex max-h-40 min-h-28 items-center gap-3 overflow-hidden rounded-3xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:p-5"
    >
      <div className="flex shrink-0 items-center">
        <Button
          ref={(node) => {
            drag(node);
          }}
          type="button"
          variant="ghost"
          size="icon"
          className="hidden cursor-grab text-muted-foreground active:cursor-grabbing sm:inline-flex"
          title={`Drag ${item.title} to reorder`}
          aria-label={`Drag ${item.title} to reorder`}
        >
          <DotsSixVertical
            aria-hidden="true"
            className="size-5"
            weight="bold"
          />
        </Button>
        <div className="flex flex-col">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={`Move ${item.title} up`}
            aria-label={`Move ${item.title} up`}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <CaretUp aria-hidden="true" className="size-5" weight="bold" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={`Move ${item.title} down`}
            aria-label={`Move ${item.title} down`}
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <CaretDown aria-hidden="true" className="size-5" weight="bold" />
          </Button>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-primary sm:text-lg">
          {item.title}
        </h3>
        <p className="line-clamp-2 break-words text-sm text-foreground sm:text-base">
          {item.description}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Position {index + 1} of {total}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={`Edit ${item.title}`}
          aria-label={`Edit ${item.title}`}
          onClick={(event) => onEdit(item, event.currentTarget)}
        >
          <PencilSimple aria-hidden="true" className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          title={`Delete ${item.title}`}
          aria-label={`Delete ${item.title}`}
          onClick={(event) => onDelete(item, event.currentTarget)}
        >
          <Trash aria-hidden="true" className="size-5" />
        </Button>
      </div>
    </article>
  );
}
