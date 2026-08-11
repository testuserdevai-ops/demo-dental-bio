import type { PublicProfileViewModel } from "../_lib/public-profile";
import { ProfileThemeRoot } from "@/app/components/profile-presentation/ProfileThemeRoot";
import { selectAvailablePublicTemplate } from "../_lib/public-template-selector";
import BasicProfileTemplate from "./BasicProfileTemplate";
import ClinicCommerceProfileTemplate from "./ClinicCommerceProfileTemplate";
import CosmeticTransformationProfileTemplate from "./CosmeticTransformationProfileTemplate";
import DirectBookingProfileTemplate from "./DirectBookingProfileTemplate";
import LocationRouterProfileTemplate from "./LocationRouterProfileTemplate";
import ServicesCatalogueProfileTemplate from "./ServicesCatalogueProfileTemplate";
import SpecialistAssessmentProfileTemplate from "./SpecialistAssessmentProfileTemplate";
import TrustFirstFamilyProfileTemplate from "./TrustFirstFamilyProfileTemplate";

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
      {templateId === "services-catalogue" && (
        <ServicesCatalogueProfileTemplate {...props} />
      )}
      {templateId === "cosmetic-transformation" && (
        <CosmeticTransformationProfileTemplate {...props} />
      )}
      {templateId === "trust-first-family-practice" && (
        <TrustFirstFamilyProfileTemplate {...props} />
      )}
      {templateId === "specialist-assessment" && (
        <SpecialistAssessmentProfileTemplate {...props} />
      )}
      {templateId === "clinic-commerce" && (
        <ClinicCommerceProfileTemplate {...props} />
      )}
    </ProfileThemeRoot>
  );
}
