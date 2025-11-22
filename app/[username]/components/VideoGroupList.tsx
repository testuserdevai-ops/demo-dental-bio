'use client'
import React from "react";
import VideoList from "./VideoList";

type VideoListProps = {
  serverVideoGroups: GroupType[]
}

const VideoGroupList: React.FC<VideoListProps> = ({
  serverVideoGroups
}) => {
  return (
    <>
      {(serverVideoGroups.length > 0) ?
        <div className="flex flex-col gap-4 text-center" id="video">
          {serverVideoGroups.map((group, index) => (
            <VideoList
              key={group.id}
              groupname={group.name!}
              fetchedVideos={group.datas!}
            />
          ))}
        </div> : <></>}
    </>
  )
}

export default VideoGroupList;