import BlogGroupList from "../components/BlogGroupList";
import Footer from "../components/Footer";
import Gallery from "../components/Gallery";
import Header from "../components/Header";
import Links from "../components/Links";
import ProfileDetail from "../components/ProfileDetail";
import Services from "../components/Services";
import Treatments from "../components/Treatments";
import VideoGroupList from "../components/VideoGroupList";
import WorkLocation from "../components/WorkLocation";
import type { PublicProfileViewModel } from "../_lib/public-profile";
import { createBasicNavigationState } from "../_lib/basic-template";
import ProfileReviewsSection from "./ProfileReviewsSection";

/**
 * Compatibility renderer for the public profile that predates selectable
 * templates. Keep its module order and child props stable: new templates must
 * be separate renderers rather than conditionals that reshape Basic.
 */
export default function BasicProfileTemplate({
  username,
  profile,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const { user, dentistry, profileImageUrl } = profile;
  const navState = createBasicNavigationState(profile);

  return (
    <div
      className="profile-wrapper flex flex-col gap-8"
      data-profile-template="basic"
    >
      <Header
        profileId={user.id}
        username={username}
        title={dentistry.about_title ?? ""}
        image_url={profileImageUrl}
        contact_email={dentistry.contact_email ?? ""}
        isVerified={Boolean(user.isVerified)}
        useDentalBrand={Boolean(user.use_dental_brand)}
      />
      {dentistry.about_title && (
        <ProfileDetail
          username={username}
          position={user.position ?? ""}
          gdc_no={user.gdc_no ?? ""}
          qualification={user.qualification ?? ""}
          title={dentistry.about_title ?? ""}
          image_url={profileImageUrl}
          description={dentistry.about_text ?? ""}
          dentistry_id={dentistry.dentistry_id}
          website_link={dentistry.website ?? undefined}
          isVerified={Boolean(user.isVerified)}
          isFreePlan={
            ["PRO", "PREMIUM PRO"].includes(user.subscription_status ?? "") ===
            false
          }
          navState={navState}
          serverLocations={profile.locations}
          serverSocials={profile.socials}
          serverProducts={profile.products}
        />
      )}
      <Treatments
        sectionTitle={dentistry.treatment_section_title}
        serverTreatments={profile.treatments}
      />
      <Services
        sectionTitle={dentistry.service_section_title}
        serverTreatments={profile.treatments}
      />
      <Links serverLinkGroups={profile.linkGroups} />
      <BlogGroupList
        username={username}
        serverBlogGroups={profile.blogGroups}
      />
      <VideoGroupList serverVideoGroups={profile.videoGroups} />
      <Gallery
        serverGalleries={profile.galleries}
        serverGeneralGalleries={profile.generalGalleries}
      />
      <ProfileReviewsSection
        externalReviewPages={profile.externalReviewPages}
        reviews={profile.reviews}
        templateId="basic"
        variant="plain"
      />
      <WorkLocation dentistry={dentistry} serverLocations={profile.locations} />
      <Footer
        bookingLink={dentistry.booking_link ?? ""}
        contact_email={dentistry.contact_email ?? ""}
        profileId={user.id}
        socialLinks={profile.socials}
        username={username}
        title={dentistry.about_title ?? ""}
        useDentalBrand={Boolean(user.use_dental_brand)}
        website_link={dentistry.website ?? undefined}
      />
    </div>
  );
}
