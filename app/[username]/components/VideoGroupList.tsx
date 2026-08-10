"use client";
import React from "react";
import VideoList from "./VideoList";

type VideoListProps = {
  serverVideoGroups: GroupType[];
};

const VideoGroupList: React.FC<VideoListProps> = ({ serverVideoGroups }) => {
  return (
    <div
      id="video"
      className={
        serverVideoGroups.length > 0
          ? "flex flex-col gap-4 text-center"
          : undefined
      }
    >
      {serverVideoGroups.length > 0 ? (
        <>
          {serverVideoGroups.map((group) => (
            <VideoList
              key={group.id}
              groupId={group.id}
              groupname={group.name!}
              fetchedVideos={group.datas!}
            />
          ))}
        </>
      ) : null}
    </div>
  );
};

export default VideoGroupList;
