"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionResult } from "@/lib/forms/action-result";
import * as actions from "../actions";
import { fetchVideoAggregate } from "./api";
import { videoKeys } from "./keys";
import type { VideoAggregate } from "./queries";
import type * as input from "./schemas";
export function useVideoAggregate(seed: {
  scopeId: string;
  targetHint?: string;
  data: VideoAggregate;
  updatedAt: number;
}) {
  return useQuery({
    queryKey: videoKeys.aggregate(seed.scopeId),
    queryFn: () => fetchVideoAggregate(seed.targetHint),
    initialData: seed.data,
    initialDataUpdatedAt: seed.updatedAt,
  });
}
export function useVideoMutations({
  scopeId,
  targetHint,
}: {
  scopeId: string;
  targetHint?: string;
}) {
  const client = useQueryClient();
  const queryKey = videoKeys.aggregate(scopeId);
  const refresh = async <T>(result: ActionResult<T>) => {
    if (result.ok) {
      await client.invalidateQueries({ queryKey });
      await client.refetchQueries({ queryKey });
    }
  };
  return {
    createGroup: useMutation({
      mutationFn: (value: input.CreateVideoGroupInput) =>
        actions.createVideoGroup(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    updateGroup: useMutation({
      mutationFn: (value: input.UpdateVideoGroupInput) =>
        actions.updateVideoGroup(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    deleteGroup: useMutation({
      mutationFn: (value: input.DeleteVideoGroupInput) =>
        actions.deleteVideoGroup(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    reorderGroups: useMutation({
      mutationFn: (value: input.ReorderVideoGroupsInput) =>
        actions.reorderVideoGroups(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    createVideo: useMutation({
      mutationFn: (value: input.CreateVideoInput) =>
        actions.createVideo(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    updateVideo: useMutation({
      mutationFn: (value: input.UpdateVideoInput) =>
        actions.updateVideo(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    deleteVideo: useMutation({
      mutationFn: (value: input.DeleteVideoInput) =>
        actions.deleteVideo(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    reorderVideos: useMutation({
      mutationFn: (value: input.ReorderVideosInput) =>
        actions.reorderVideos(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
  };
}
