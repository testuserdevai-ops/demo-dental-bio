"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveProfile, saveSocialLinks } from "./actions";
import { fetchProfile } from "./api";
import { profileKeys } from "./keys";
import type { ProfileViewModel } from "./queries";
import type { ProfileInput, SocialLinksInput } from "./schemas";

export function useProfile(seed: {
  scopeId: string;
  targetHint: string | undefined;
  data: ProfileViewModel;
  updatedAt: number;
}) {
  return useQuery({
    queryKey: profileKeys.detail(seed.scopeId),
    queryFn: () => fetchProfile(seed.targetHint),
    initialData: seed.data,
    initialDataUpdatedAt: seed.updatedAt,
  });
}

export function useProfileMutations({
  scopeId,
  targetHint,
}: {
  scopeId: string;
  targetHint: string | undefined;
}) {
  const client = useQueryClient();
  const queryKey = profileKeys.detail(scopeId);
  return {
    profile: useMutation({
      retry: false,
      mutationFn: (input: ProfileInput) => saveProfile(targetHint, input),
      onSuccess: (result) => {
        if (result.ok) client.setQueryData(queryKey, result.data);
      },
    }),
    socials: useMutation({
      retry: false,
      mutationFn: (input: SocialLinksInput) =>
        saveSocialLinks(targetHint, input),
      onSuccess: (result) => {
        if (result.ok)
          client.setQueryData<ProfileViewModel>(queryKey, (current) =>
            current ? { ...current, socials: result.data } : current,
          );
      },
    }),
  };
}
