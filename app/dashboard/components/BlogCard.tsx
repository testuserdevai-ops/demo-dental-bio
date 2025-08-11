'use client'
import ConfirmMessage from "@/app/components/Modal/ConfirmMessage";
import { ArrowSquareOut, CaretDown, CaretUp, PencilSimple, Trash, ChartBar } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import React, { useEffect, useReducer, useState } from "react"
import Switcher from "@/app/components/Switcher"

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
  const [isOpenConfirmMessage, setIsOpenConfirmMessage] = useState<boolean>(false);
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
    <>
      <div className="w-full px-6 py-3 shadow rounded-[26px] overflow-hidden flex items-center gap-4">
        <div className="cursor-move">
          <div><CaretUp /></div>
          <div><CaretDown /></div>
        </div>
        <div className="w-full flex flex-col gap-4">
          <div className="flex items-center gap-4">

            {/* Title and Content */}
            <div className="flex-grow text-[14px] overflow-hidden">
              {/* Title Row */}
              <div className="flex flex-1 items-center truncate gap-2">
                <div className="text-primary-1 font-bold truncate">{title}</div>
                <button className="flex-shrink-0 enabled:hover:text-primary-1" onClick={() => onEditItem(id)} disabled={!proAvailable}>
                  <PencilSimple
                    size={18}
                  />
                </button>
              </div>

              {/* Content Row */}
              {/* <div className="truncate" dangerouslySetInnerHTML={{__html: content!}} /> */}
            </div>

            {/* Trash Button */}
            <div className="flex items-center">
              <Link
                href={`/${username}/blog/${slug}`}
                target="_blank"
                className="w-8 h-8 p-0.5 hover:bg-neutral-100 hover:text-neutral-700 text-neutral-900 flex items-center justify-center rounded-md transition-all"
              >
                <ArrowSquareOut size={20} />
              </Link>
              <Switcher isChecked={isActive} onToggle={toggleIsActive} disabled={!proAvailable} />
            </div>
          </div>

          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <ChartBar size={20} />
              <p className="text-sm text-neutral-500">
                {click_counter || 0} click{(click_counter || 0) > 1 && 's'}
              </p>
            </div>
            <button onClick={() => setIsOpenConfirmMessage(true)} disabled={!proAvailable} className="enabled:hover:text-red-700">
              <Trash size={20} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmMessage
        title="Delete blog?"
        description="Are you sure you want to delete the blog?"
        okText="Delete"
        isOpen={isOpenConfirmMessage}
        onClose={() => setIsOpenConfirmMessage(false)}
        onOk={handleDelete}
      />
    </>
  )
}

export default BlogCard;