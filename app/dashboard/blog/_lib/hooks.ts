"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionResult } from "@/lib/forms/action-result";
import * as actions from "../actions";
import { fetchBlogAggregate } from "./api";
import { blogKeys } from "./keys";
import type { BlogAggregate } from "./queries";
import type * as input from "./schemas";

export function useBlogAggregate(seed: {
  scopeId: string;
  targetHint?: string;
  data: BlogAggregate;
  updatedAt: number;
}) {
  return useQuery({
    queryKey: blogKeys.aggregate(seed.scopeId),
    queryFn: () => fetchBlogAggregate(seed.targetHint),
    initialData: seed.data,
    initialDataUpdatedAt: seed.updatedAt,
  });
}
export function useBlogMutations({
  scopeId,
  targetHint,
}: {
  scopeId: string;
  targetHint?: string;
}) {
  const client = useQueryClient();
  const queryKey = blogKeys.aggregate(scopeId);
  const refresh = async <T>(result: ActionResult<T>) => {
    if (result.ok) {
      await client.invalidateQueries({ queryKey });
      await client.refetchQueries({ queryKey });
    }
  };
  return {
    createGroup: useMutation({
      mutationFn: (value: input.CreateBlogGroupInput) =>
        actions.createBlogGroup(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    updateGroup: useMutation({
      mutationFn: (value: input.UpdateBlogGroupInput) =>
        actions.updateBlogGroup(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    deleteGroup: useMutation({
      mutationFn: (value: input.DeleteBlogGroupInput) =>
        actions.deleteBlogGroup(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    reorderGroups: useMutation({
      mutationFn: (value: input.ReorderBlogGroupsInput) =>
        actions.reorderBlogGroups(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    createBlog: useMutation({
      mutationFn: (value: input.CreateBlogInput) =>
        actions.createBlog(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    updateBlog: useMutation({
      mutationFn: (value: input.UpdateBlogInput) =>
        actions.updateBlog(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    deleteBlog: useMutation({
      mutationFn: (value: input.DeleteBlogInput) =>
        actions.deleteBlog(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    reorderBlogs: useMutation({
      mutationFn: (value: input.ReorderBlogsInput) =>
        actions.reorderBlogs(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
  };
}
