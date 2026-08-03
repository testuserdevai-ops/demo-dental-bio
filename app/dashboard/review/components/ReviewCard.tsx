"use client";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import React, { useEffect, useReducer } from "react";
import BaseCard from "@/app/components/Card/BaseCard";

type ReviewCardProps = {
  id?: string;
  reviewer_name?: string;
  content?: string;
  slug?: string;
  enabled?: boolean;
  proAvailable: boolean;
  onUpdate: (review: ReviewType, image: null) => void;
  onEditItem: (id: string) => void;
  onDelete: (id: string) => void;
};

const ReviewCard: React.FC<ReviewCardProps> = ({
  id,
  reviewer_name,
  content,
  slug,
  enabled,
  proAvailable,
  onUpdate,
  onEditItem,
  onDelete,
}: ReviewCardProps) => {
  const [isActive, toggleIsActive] = useReducer(
    (prevState) => !prevState,
    enabled!,
  );

  useEffect(() => {
    if (enabled !== isActive) {
      const review = {
        id,
        enabled: isActive,
      };
      onUpdate(review, null);
    }
  }, [isActive]);

  const handleDelete = () => {
    onDelete(id!);
  };

  return (
    <BaseCard
      movable
      handleType="caret"
      className="bg-white !p-6"
      disabled={!proAvailable}
      showDelete
      onConfirmDelete={handleDelete}
      deleteConfirmTitle="Delete review?"
      deleteConfirmDescription="Are you sure you want to delete the review?"
      deleteOkText="Delete"
      showEnable
      isEnabled={isActive}
      onToggleEnabled={toggleIsActive}
    >
      <div className="text-[14px] overflow-hidden">
        <div className="flex flex-1 items-center truncate gap-2">
          <div className="text-primary-1 font-bold truncate">
            {reviewer_name}
          </div>
          <button
            className="flex-shrink-0 enabled:hover:text-primary-1"
            onClick={() => onEditItem(id!)}
            disabled={!proAvailable}
          >
            <PencilSimpleIcon size={18} />
          </button>
        </div>
        <div className="truncate">{content}</div>
      </div>
    </BaseCard>
  );
};

export default ReviewCard;
