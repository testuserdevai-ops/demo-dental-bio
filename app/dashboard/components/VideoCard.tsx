'use client'
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import React, { useEffect, useReducer } from "react"
import BaseCard from "@/app/components/Card/BaseCard"

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
    <BaseCard
      movable
      handleType="caret"
      disabled={!proAvailable}
      showDelete
      onConfirmDelete={handleDelete}
      deleteConfirmTitle="Delete video?"
      deleteConfirmDescription="Are you sure you want to delete the video?"
      deleteOkText="Delete"
      showEnable
      isEnabled={isActive}
      onToggleEnabled={toggleIsActive}
    >
      <div className="text-[14px] overflow-hidden">
        <div className="flex flex-1 items-center truncate gap-2">
          <div className="text-primary-1 font-bold truncate">{videoProps.title}</div>
          <button className="flex-shrink-0 enabled:hover:text-primary-1" onClick={() => onEditItem(videoProps.id!)} disabled={!proAvailable}>
            <PencilSimpleIcon size={18} />
          </button>
        </div>
      </div>
    </BaseCard>
  )
}

export default VideoCard;