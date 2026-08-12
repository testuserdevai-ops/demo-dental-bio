"use client";
import { useQueryClient } from "@tanstack/react-query";
import { usePreview } from "@/app/contexts/PreviewContext";
import ProfileEditorForm from "./ProfileEditorForm";
import ProfilePictureEditor from "./ProfilePictureEditor";
import SocialLinksEditorForm from "./SocialLinksEditorForm";
import { useProfile, useProfileMutations } from "../_lib/profile/hooks";
import { profileKeys } from "../_lib/profile/keys";
import type { ProfileViewModel } from "../_lib/profile/queries";
import type { ProfileTemplateId } from "@/lib/profile-presentation/catalog";
import ProfileSetupWidget from "./ProfileSetupWidget";

export default function ProfileDashboardClient({
  scopeId,
  dentistryId,
  targetHint,
  data,
  updatedAt,
  templateId,
  completedStepIds,
  hasAppearanceDraft,
}: {
  scopeId: string;
  dentistryId: string;
  targetHint: string | undefined;
  data: ProfileViewModel;
  updatedAt: number;
  templateId: ProfileTemplateId;
  completedStepIds: string[];
  hasAppearanceDraft: boolean;
}) {
  const query = useProfile({ scopeId, targetHint, data, updatedAt });
  const mutations = useProfileMutations({ scopeId, targetHint });
  const client = useQueryClient();
  const { triggerReload } = usePreview();
  const value = query.data ?? data;
  return (
    <div className="flex-col-gap py-10" data-testid="profile-manager">
      <ProfileSetupWidget
        completedStepIds={completedStepIds}
        hasAppearanceDraft={hasAppearanceDraft}
        templateId={templateId}
      />
      <ProfilePictureEditor
        dentistryId={dentistryId}
        targetHint={targetHint}
        value={value.profilePicture}
        onChanged={(profilePicture) => {
          client.setQueryData<ProfileViewModel>(
            profileKeys.detail(scopeId),
            (current) => (current ? { ...current, profilePicture } : current),
          );
          triggerReload();
        }}
      />
      <ProfileEditorForm
        value={value}
        save={(input) => mutations.profile.mutateAsync(input)}
        afterSuccess={triggerReload}
      />
      <SocialLinksEditorForm
        value={value.socials}
        save={(input) => mutations.socials.mutateAsync(input)}
        afterSuccess={triggerReload}
      />
    </div>
  );
}
