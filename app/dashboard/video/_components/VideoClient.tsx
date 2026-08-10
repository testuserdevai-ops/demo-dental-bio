"use client";

import { useVideoAggregate, useVideoMutations } from "../_lib/hooks";
import type { VideoAggregate } from "../_lib/queries";
import VideoManager from "./VideoManager";

export function VideoClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
  enabled,
}: {
  scopeId: string;
  targetHint?: string;
  data: VideoAggregate;
  updatedAt: number;
  enabled: boolean;
}) {
  const query = useVideoAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useVideoMutations({ scopeId, targetHint });
  return (
    <VideoManager
      groups={query.data?.groups ?? data.groups}
      loading={query.isLoading}
      enabled={enabled}
      mutations={mutations}
    />
  );
}
