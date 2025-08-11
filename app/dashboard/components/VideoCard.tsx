'use client'
import ConfirmMessage from "@/app/components/Modal/ConfirmMessage";
import { CaretDown, CaretUp, PencilSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import React, { useEffect, useReducer, useState } from "react"
import Switcher from "@/app/components/Switcher"

type VideoCardProps = VideoType & {
  onUpdate: (video: VideoType, image: null) => void;
  onEditItem: (id: string) => void;
  onDelete: (id: string) => void;
  proAvailable: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({
  onUpdate,
  onEditItem,
  onDelete,
  proAvailable = true,
  ...videoProps
}: VideoCardProps) => {
  const [isOpenConfirmMessage, setIsOpenConfirmMessage] = useState<boolean>(false);
  const [isActive, toggleIsActive] = useReducer((prevState) => !prevState, videoProps.enabled!);

  useEffect(() => {
    if (videoProps.enabled !== isActive) {
      const video = {
        id: videoProps.id, enabled: isActive
      }
      onUpdate(video, null);
    }
  }, [isActive]);

  const handleDelete = () => {
    onDelete(videoProps.id!);
  }

  return (
    <>
      <div className="w-full px-6 py-3 shadow-lg rounded-[26px] flex items-center overflow-hidden gap-4 mb-4">
        {/* Caret Buttons */}
        <div className="cursor-pointer">
          <div><CaretUp /></div>
          <div><CaretDown /></div>
        </div>

        {/* Title and Content */}
        <div className="flex-grow text-[14px] overflow-hidden">
          {/* Title Row */}
          <div className="flex flex-1 items-center truncate gap-2">
            <div className="text-primary-1 font-bold truncate">{videoProps.title}</div>
            <button className="flex-shrink-0 enabled:hover:text-primary-1" onClick={() => onEditItem(videoProps.id!)} disabled={!proAvailable}>
              <PencilSimple size={18} />
            </button>
          </div>
        </div>

        {/* Trash Button */}
        <div className="flex items-center gap-2">
          <button onClick={() => setIsOpenConfirmMessage(true)} className="cursor-pointer hover:text-red-700" disabled={!proAvailable}>
            <Trash size={20} />
          </button>
          <Switcher isChecked={isActive} onToggle={toggleIsActive} disabled={!proAvailable} />
        </div>
      </div>

      <ConfirmMessage
        title="Delete video?"
        description="Are you sure you want to delete the video?"
        okText="Delete"
        isOpen={isOpenConfirmMessage}
        onClose={() => setIsOpenConfirmMessage(false)}
        onOk={handleDelete}
      />
    </>
  )
}

export default VideoCard;