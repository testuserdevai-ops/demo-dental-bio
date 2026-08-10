"use client";

import { CaretDown, CaretUp, PencilSimple, Trash } from "@phosphor-icons/react";
import { useDrag, useDrop } from "react-dnd";
import { Button } from "@/app/components/ui/button";
import type { TreatmentItemViewModel } from "./_lib/queries";

const ITEM_TYPE = "treatment-card";

export function TreatmentCard({
  item,
  index,
  onMove,
  onEdit,
  onDelete,
}: {
  item: TreatmentItemViewModel;
  index: number;
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
        drag(node);
        drop(node);
      }}
      className="membar-cards mb-2 max-h-48 overflow-hidden rounded-3xl border bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="cursor-move rounded-md p-1 hover:bg-purple-100 hover:text-deep-purple"
        >
          <CaretUp className="-mb-0.5" weight="bold" />
          <CaretDown className="-mt-0.5" weight="bold" />
        </div>
        <div className="w-full">
          <div className="member-cards-actions flex items-start justify-between gap-2">
            <div className="max-w-[500px]">
              <h3 className="member-heading break-words break-all font-semibold text-blue-600">
                {item.title}
              </h3>
              <p className="mb-0 line-clamp-3 max-w-[500px] break-words break-all">
                {item.description}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Edit ${item.title}`}
                onClick={(event) => onEdit(item, event.currentTarget)}
              >
                <PencilSimple aria-hidden="true" className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${item.title}`}
                onClick={(event) => onDelete(item, event.currentTarget)}
              >
                <Trash aria-hidden="true" className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
