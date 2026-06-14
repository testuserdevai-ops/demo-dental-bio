'use client'

import { normalizeVideoUrl } from "@/utils/normalizeVideoUrl";
import { X } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

type VideoItemType = {
  title: string;
  link: string;
}

const VideoItem: React.FC<VideoItemType> = ({
  title,
  link
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <div className={`w-full`}>
      <div className="toplinks-main">
        <div
          className={`w-full block cursor-pointer text-center toplinks-wrapper toplinks-without-image justify-center transition-opacity duration-500 ${isOpen ? "opacity-0 invisible h-0 p-0 m-0 border-none" : "h-auto visible opacity-100"}`}
          onClick={() => setIsOpen(true)}
        >
          {title}
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="w-full pb-[56.25%] relative">
            {isOpen &&
              <iframe
                src={normalizeVideoUrl(link)!}
                className="absolute top-0 left-0 w-full h-full rounded-xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>}
          </div>
          <div className={`w-full flex justify-center transition-opacity duration-500 ${isOpen ? "h-auto visible py-4 opacity-100" : "opacity-0 invisible h-0 p-0 m-0 border-none"}`}>
            <div
              className="w-8 h-8 bg-overlay cursor-pointer rounded-full flex justify-center items-center"
              onClick={() => setIsOpen(false)}
            >
              <X size={24} color="#000" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoItem;