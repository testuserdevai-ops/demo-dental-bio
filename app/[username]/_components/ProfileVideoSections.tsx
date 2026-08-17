"use client";

import { X } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { TrackedButton } from "@/app/components/analytics/TrackedAction";

import type { ProfileVideo, ProfileVideoGroup } from "../_lib/profile-videos";

type OpenVideo = {
  groupId: string;
  videoId: string;
};

function videoPanelId(groupId: string, videoId: string) {
  return `profile-video-${groupId}-${videoId}`;
}

function VideoPlayer({ video }: { video: ProfileVideo }) {
  if (video.presentation.kind === "native-video") {
    return (
      <video
        aria-label={video.title}
        className="aspect-video w-full rounded-[var(--radius-md)] bg-black"
        controls
        src={video.presentation.src}
        title={video.title}
      />
    );
  }

  return (
    <iframe
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="aspect-video w-full rounded-[var(--radius-md)] border-0"
      loading="lazy"
      src={video.presentation.src}
      title={`Video: ${video.title}`}
    />
  );
}

function VideoItem({
  group,
  isOpen,
  onClose,
  onOpen,
  video,
}: {
  group: ProfileVideoGroup;
  isOpen: boolean;
  onClose(): void;
  onOpen(): void;
  video: ProfileVideo;
}) {
  const panelId = videoPanelId(group.id, video.id);

  return (
    <li data-video-id={video.id} data-video-position={video.position}>
      <TrackedButton
        analytics={{
          section: "videos",
          position: video.position,
          action: {
            type: "video_open",
            videoId: Number(video.id),
            groupId: Number(group.id),
          },
        }}
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="flex min-h-12 w-full items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 text-left text-base font-bold text-card-foreground shadow-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        onClick={onOpen}
        type="button"
      >
        {video.title}
      </TrackedButton>
      {isOpen ? (
        <div
          aria-label={`${video.title} video player`}
          className="mt-3 rounded-[var(--radius-lg)] border border-border bg-card p-3 shadow-sm sm:p-4"
          id={panelId}
          role="region"
        >
          <VideoPlayer video={video} />
          <button
            aria-label={`Close ${video.title}`}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-full)] border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" weight="bold" />
            Close video
          </button>
        </div>
      ) : null}
    </li>
  );
}

function VideoGroupSection({
  group,
  openVideo,
  onSetOpenVideo,
}: {
  group: ProfileVideoGroup;
  openVideo: OpenVideo | null;
  onSetOpenVideo(video: OpenVideo | null): void;
}) {
  const headingId = `profile-video-group-${group.id}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3"
      data-video-group-id={group.id}
    >
      <h2
        className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        id={headingId}
      >
        {group.name}
      </h2>
      <ul className="space-y-3">
        {group.datas.map((video) => {
          const isOpen =
            openVideo?.groupId === group.id && openVideo.videoId === video.id;
          return (
            <VideoItem
              group={group}
              isOpen={isOpen}
              key={video.id}
              onClose={() => onSetOpenVideo(null)}
              onOpen={() =>
                onSetOpenVideo({ groupId: group.id, videoId: video.id })
              }
              video={video}
            />
          );
        })}
      </ul>
    </section>
  );
}

export default function ProfileVideoSections({
  groups,
}: {
  groups: readonly ProfileVideoGroup[];
}) {
  const [openVideo, setOpenVideo] = useState<OpenVideo | null>(null);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-8" data-profile-module="videos" id="video">
      {groups.map((group) => (
        <VideoGroupSection
          group={group}
          key={group.id}
          onSetOpenVideo={setOpenVideo}
          openVideo={openVideo}
        />
      ))}
    </div>
  );
}
