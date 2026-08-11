import type { PublicProfileViewModel } from "../_lib/public-profile";
import { ProfileThemeRoot } from "@/app/components/profile-presentation/ProfileThemeRoot";
import { selectAvailablePublicTemplate } from "../_lib/public-template-selector";
import BasicProfileTemplate from "./BasicProfileTemplate";
import DirectBookingProfileTemplate from "./DirectBookingProfileTemplate";
import LocationRouterProfileTemplate from "./LocationRouterProfileTemplate";

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
      {templateId === "direct-booking" && (
        <DirectBookingProfileTemplate {...props} />
      )}
      {templateId === "location-provider-router" && (
        <LocationRouterProfileTemplate {...props} />
      )}
    </ProfileThemeRoot>
  );
}
