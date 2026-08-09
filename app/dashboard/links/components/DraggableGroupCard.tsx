"use client";

import { useDrag, useDrop } from "react-dnd";
import type { LinkGroupViewModel } from "../_lib/queries";
import { GroupCard } from "./GroupCard";
import { GROUP_ITEM_TYPE, type LinkMutations } from "./links-manager-shared";

export function DraggableGroupCard({
  group,
  index,
  mutations,
  onMove,
  total,
  afterSuccess,
}: {
  group: LinkGroupViewModel;
  index: number;
  mutations: LinkMutations;
  onMove(from: number, to: number): void;
  total: number;
  afterSuccess(): void;
}) {
  const [, drag] = useDrag({ type: GROUP_ITEM_TYPE, item: { index } });
  const [, drop] = useDrop({
    accept: GROUP_ITEM_TYPE,
    hover: (dragged: { index: number }) => {
      if (dragged.index !== index) {
        onMove(dragged.index, index);
        dragged.index = index;
      }
    },
  });
  return (
    <div
      data-testid="link-group-card"
      ref={(node) => {
        drop(node);
      }}
    >
      <GroupCard
        group={group}
        mutations={mutations}
        dragRef={(node) => drag(node)}
        index={index}
        total={total}
        onMove={onMove}
        afterSuccess={afterSuccess}
      />
    </div>
  );
}
