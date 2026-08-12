import type { PublicProfileViewModel } from "../_lib/public-profile";
import { ProfileThemeRoot } from "@/app/components/profile-presentation/ProfileThemeRoot";
import { selectAvailablePublicTemplate } from "../_lib/public-template-selector";
import BasicProfileTemplate from "./BasicProfileTemplate";
import ClinicCommerceProfileTemplate from "./ClinicCommerceProfileTemplate";
import CosmeticTransformationProfileTemplate from "./CosmeticTransformationProfileTemplate";
import DirectBookingProfileTemplate from "./DirectBookingProfileTemplate";
import ExpertEducatorProfileTemplate from "./ExpertEducatorProfileTemplate";
import LocationRouterProfileTemplate from "./LocationRouterProfileTemplate";
import ServicesCatalogueProfileTemplate from "./ServicesCatalogueProfileTemplate";
import SpecialistAssessmentProfileTemplate from "./SpecialistAssessmentProfileTemplate";
import TrustFirstFamilyProfileTemplate from "./TrustFirstFamilyProfileTemplate";
import PublicProfileHeader from "./PublicProfileHeader";
import Footer from "../components/Footer";

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
  const { dentistry, profileImageUrl, user } = props.profile;
  const displayName = [user?.title, user?.first_name, user?.last_name]
    .filter((part) => part?.trim())
    .join(" ");

  return (
    <ProfileThemeRoot
      themeId={props.profile.presentation.configuration.themeId}
    >
      {templateId !== "basic" && (
        <PublicProfileHeader
          profileId={user.id}
          bookingEnabled={dentistry?.booking_link_enabled === true}
          bookingLink={dentistry?.booking_link ?? null}
          displayName={displayName}
          email={dentistry?.contact_email ?? null}
          imageUrl={profileImageUrl ?? ""}
          isVerified={Boolean(user?.isVerified)}
          phone={dentistry?.phone ?? null}
          templateId={templateId}
          username={props.username}
        />
      )}
      <div data-profile-template-content={templateId}>
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
        {templateId === "expert-educator" && (
          <ExpertEducatorProfileTemplate {...props} />
        )}
      </div>
      {templateId !== "basic" && (
        <Footer
          bookingLink={dentistry?.booking_link ?? ""}
          contact_email={dentistry?.contact_email ?? ""}
          profileId={user.id}
          socialLinks={props.profile.socials}
          title={dentistry?.about_title ?? displayName}
          username={props.username}
          useDentalBrand={Boolean(user?.use_dental_brand)}
          website_link={dentistry?.website ?? undefined}
          presentation="template"
        />
      )}
    </ProfileThemeRoot>
  );
}
