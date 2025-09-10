'use client'
import { ArrowSquareOutIcon, PencilSimpleIcon, ChartBarIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import React, { useEffect, useReducer } from "react"
import BaseCard from "@/app/components/Card/BaseCard"

type BlogCardProps = {
  username: string;
  id: string;
  title?: string;
  content?: string;
  click_counter?: number;
  slug?: string;
  enabled?: boolean;
  proAvailable?: boolean;
  onUpdate: (blog: BlogType, image: null) => void;
  onEditItem: (id: string) => void;
  onDelete: (id: string) => void;
}

const BlogCard: React.FC<BlogCardProps> = ({
  username,
  id,
  title,
  content,
  click_counter,
  slug,
  enabled,
  proAvailable,
  onUpdate,
  onEditItem,
  onDelete,
}: BlogCardProps) => {
  const [isActive, toggleIsActive] = useReducer((prevState) => !prevState, enabled!);

  useEffect(() => {
    if (enabled !== isActive) {
      const blog = {
        id, enabled: isActive
      }
      onUpdate(blog, null);
    }
  }, [isActive]);

  const handleDelete = () => {
    onDelete(id);
  }

  return (
    <BaseCard
      movable
      handleType="caret"
      className="bg-white"
      disabled={!proAvailable}
      showDelete
      onConfirmDelete={handleDelete}
      deleteConfirmTitle="Delete blog?"
      deleteConfirmDescription="Are you sure you want to delete the blog?"
      deleteOkText="Delete"
      showEnable
      isEnabled={isActive}
      onToggleEnabled={toggleIsActive}
      rightExtras={(
        <Link
          href={`/${username}/blog/${slug}`}
          target="_blank"
          className="w-8 h-8 p-0.5 hover:bg-neutral-100 hover:text-neutral-700 text-neutral-900 flex items-center justify-center rounded-md transition-all"
        >
          <ArrowSquareOutIcon size={20} />
        </Link>
      )}
    >
      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="flex-grow text-[14px] overflow-hidden">
            <div className="flex flex-1 items-center truncate gap-2">
              <div className="text-primary-1 font-bold truncate">{title}</div>
              <button className="flex-shrink-0 enabled:hover:text-primary-1" onClick={() => onEditItem(id)} disabled={!proAvailable}>
                <PencilSimpleIcon size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <ChartBarIcon size={20} />
            <p className="text-sm text-neutral-500">
              {click_counter || 0} click{(click_counter || 0) > 1 && 's'}
            </p>
          </div>
        </div>
      </div>
    </BaseCard>
  )
}

export default BlogCard;