"use client";
import Link from "next/link";
import {
  ArrowSquareOutIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import React, { useEffect, useReducer, useRef } from "react";
import BaseCard from "@/app/components/Card/BaseCard";

type VideoCardProps = VideoType & {
  onUpdate: (video: VideoType, image: null) => void;
  onEditItem: (id: string) => void;
  onDelete: (id: string) => void;
  proAvailable: boolean;
};

const VideoCard: React.FC<VideoCardProps> = ({
  onUpdate,
  onEditItem,
  onDelete,
  proAvailable = true,
  ...videoProps
}: VideoCardProps) => {
  const [isActive, toggleIsActive] = useReducer(
    (prevState) => !prevState,
    videoProps.enabled!,
  );
  const lastPublishedEnabled = useRef(isActive);

  useEffect(() => {
    if (lastPublishedEnabled.current === isActive) return;

    lastPublishedEnabled.current = isActive;
    onUpdate({ id: videoProps.id, enabled: isActive }, null);
  }, [isActive, onUpdate, videoProps.id]);

  const handleDelete = () => {
    onDelete(videoProps.id!);
  };

  return (
    <BaseCard
      movable
      handleType="caret"
      className="bg-white"
      disabled={!proAvailable}
      showDelete
      onConfirmDelete={handleDelete}
      deleteConfirmTitle="Delete video?"
      deleteConfirmDescription="Are you sure you want to delete the video?"
      deleteOkText="Delete"
      showEnable
      isEnabled={isActive}
      onToggleEnabled={toggleIsActive}
      rightExtras={
        <Link
          href={videoProps.link!}
          target="_blank"
          className="w-8 h-8 p-0.5 hover:bg-neutral-100 hover:text-neutral-700 text-neutral-900 flex items-center justify-center rounded-md transition-all"
        >
          <ArrowSquareOutIcon size={20} />
        </Link>
      }
    >
      <div className="flex flex-col gap-2 text-[14px] overflow-hidden">
        <div className="flex flex-1 items-center truncate gap-2">
          <div className="text-primary-1 font-bold truncate">
            {videoProps.title}
          </div>
          <button
            className="flex-shrink-0 enabled:hover:text-primary-1"
            onClick={() => onEditItem(videoProps.id!)}
            disabled={!proAvailable}
          >
            <PencilSimpleIcon size={18} />
          </button>
        </div>
        <div className="truncate">
          <p>{videoProps.link}</p>
        </div>
      </div>
    </BaseCard>
  );
};

export default VideoCard;
