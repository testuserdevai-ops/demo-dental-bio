import type { PublicProfileViewModel } from "../_lib/public-profile";
import { ProfileThemeRoot } from "@/app/components/profile-presentation/ProfileThemeRoot";
import { selectAvailablePublicTemplate } from "../_lib/public-template-selector";
import BasicProfileTemplate from "./BasicProfileTemplate";

type PublicProfileTemplateProps = {
  username: string;
  profile: PublicProfileViewModel;
};

export default function PublicProfileTemplate(
  props: PublicProfileTemplateProps,
) {
  const templateId = selectAvailablePublicTemplate(
    props.profile.presentation.configuration.templateId,
  );

  return (
    <ProfileThemeRoot
      themeId={props.profile.presentation.configuration.themeId}
    >
      {templateId === "basic" && <BasicProfileTemplate {...props} />}
    </ProfileThemeRoot>
  );
}
