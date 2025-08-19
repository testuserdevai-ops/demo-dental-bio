'use client'
import ConfirmMessage from "@/app/components/Modal/ConfirmMessage";
import { CaretDown, CaretUp, PencilSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import React, { useEffect, useReducer, useState } from "react"
import Switcher from '@/app/components/Switcher'

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
}

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
  const [isOpenConfirmMessage, setIsOpenConfirmMessage] = useState<boolean>(false);
  const [isActive, toggleIsActive] = useReducer((prevState) => !prevState, enabled!);

  useEffect(() => {
    if (enabled !== isActive) {
      const review = {
        id, enabled: isActive
      }
      onUpdate(review, null);
    }
  }, [isActive]);

  const handleDelete = () => {
    onDelete(id!);
  }

  return (
    <>
      <div className="w-full p-6 shadow-lg rounded-[26px] flex items-center overflow-hidden gap-4 mb-4">
        {/* Caret Buttons */}
        <div className="cursor-pointer">
          <div><CaretUp /></div>
          <div><CaretDown /></div>
        </div>

        {/* Title and Content */}
        <div className="flex-grow text-[14px] overflow-hidden">
          {/* Title Row */}
          <div className="flex flex-1 items-center truncate gap-2">
            <div className="text-primary-1 font-bold truncate">{reviewer_name}</div>
            <button className="flex-shrink-0 enabled:hover:text-primary-1" onClick={() => onEditItem(id!)} disabled={!proAvailable}>
              <PencilSimple size={18} />
            </button>
          </div>

          {/* Content Row */}
          <div className="truncate">{content}</div>
        </div>

        {/* Trash Button */}
        <div className="flex items-center gap-2">
          <button onClick={() => setIsOpenConfirmMessage(true)} className="enabled:hover:text-red-700" disabled={!proAvailable}>
            <Trash size={20} />
          </button>
          <Switcher isChecked={isActive} onToggle={toggleIsActive} disabled={!proAvailable} />
        </div>
      </div>

      <ConfirmMessage
        title="Delete review?"
        description="Are you sure you want to delete the review?"
        okText="Delete"
        isOpen={isOpenConfirmMessage}
        onClose={() => setIsOpenConfirmMessage(false)}
        onOk={handleDelete}
      />
    </>
  )
}

export default ReviewCard;