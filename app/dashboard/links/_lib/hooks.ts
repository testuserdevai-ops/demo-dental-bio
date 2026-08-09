"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { linkKeys } from "./keys";
import { fetchLinkAggregate } from "./api";
import type { LinkAggregate } from "./queries";
import {
  createLink,
  createLinkGroup,
  deleteLink,
  deleteLinkGroup,
  reorderLinkGroups,
  reorderLinks,
  updateLink,
  updateLinkGroup,
} from "../actions";
import type {
  CreateLinkGroupInput,
  CreateLinkInput,
  DeleteLinkGroupInput,
  DeleteLinkInput,
  ReorderLinkGroupsInput,
  ReorderLinksInput,
  UpdateLinkGroupInput,
  UpdateLinkInput,
} from "./schemas";
export function useLinkAggregate(seed: {
  scopeId: string;
  targetHint: string | undefined;
  data: LinkAggregate;
  updatedAt: number;
}) {
  return useQuery({
    queryKey: linkKeys.aggregate(seed.scopeId),
    queryFn: () => fetchLinkAggregate(seed.targetHint),
    initialData: seed.data,
    initialDataUpdatedAt: seed.updatedAt,
  });
}

export function useLinkMutations({
  scopeId,
  targetHint,
}: {
  scopeId: string;
  targetHint: string | undefined;
}) {
  const queryClient = useQueryClient();
  const queryKey = linkKeys.aggregate(scopeId);
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.refetchQueries({ queryKey });
  };
  const options = {
    retry: false,
    onSuccess: async (result: { ok: boolean }) => {
      if (result.ok) await refresh();
    },
  };
  return {
    createGroup: useMutation({
      mutationFn: (input: CreateLinkGroupInput) =>
        createLinkGroup(targetHint, input),
      ...options,
    }),
    updateGroup: useMutation({
      mutationFn: (input: UpdateLinkGroupInput) =>
        updateLinkGroup(targetHint, input),
      ...options,
    }),
    deleteGroup: useMutation({
      mutationFn: (input: DeleteLinkGroupInput) =>
        deleteLinkGroup(targetHint, input),
      ...options,
    }),
    reorderGroups: useMutation({
      mutationFn: (input: ReorderLinkGroupsInput) =>
        reorderLinkGroups(targetHint, input),
      ...options,
    }),
    createLink: useMutation({
      mutationFn: (input: CreateLinkInput) => createLink(targetHint, input),
      ...options,
    }),
    updateLink: useMutation({
      mutationFn: (input: UpdateLinkInput) => updateLink(targetHint, input),
      ...options,
    }),
    deleteLink: useMutation({
      mutationFn: (input: DeleteLinkInput) => deleteLink(targetHint, input),
      ...options,
    }),
    reorderLinks: useMutation({
      mutationFn: (input: ReorderLinksInput) => reorderLinks(targetHint, input),
      ...options,
    }),
  };
}
