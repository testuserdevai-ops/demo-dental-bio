import SafeImage from "@/app/components/Image/SafeImage";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import { selectProfileGallery } from "../_lib/profile-gallery";
import { selectProfileTreatmentServices } from "../_lib/profile-treatment-services";
import {
  createLocationRouterBookingHref,
  createLocationRouterEmailHref,
  createLocationRouterBlogSections,
  createLocationRouterPhoneHref,
  createLocationRouterState,
  getLocationRouterCopy,
} from "../_lib/location-router-template";
import LocationRouterExperience from "./LocationRouterExperience";
import LocationRouterBlogs from "./LocationRouterBlogs";
import LocationRouterReviews from "./LocationRouterReviews";
import LocationRouterSocialLinks from "./LocationRouterSocialLinks";
import ProfileGallerySection from "./ProfileGallerySection";
import ProfileLinksSection from "./ProfileLinksSection";
import ProfileTreatmentServiceSections from "./ProfileTreatmentServiceSections";

export default function LocationRouterProfileTemplate({
  username,
  profile,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const { dentistry, user } = profile;
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["location-provider-router"];
  const routerState = createLocationRouterState(answers, profile.locations);
  const blogSections = createLocationRouterBlogSections(profile.blogGroups);
  const gallery = selectProfileGallery(
    profile.galleries,
    profile.generalGalleries,
  );
  const inventory = selectProfileTreatmentServices(profile.treatments);
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const credentials = [user.position, user.qualification]
    .filter((part) => part?.trim())
    .join(" · ");
  const contact = {
    bookingHref: createLocationRouterBookingHref(dentistry),
    phoneHref: createLocationRouterPhoneHref(dentistry.phone),
    emailHref: createLocationRouterEmailHref(dentistry.contact_email),
  };

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[661px] bg-background px-4 pb-12 pt-5 text-foreground sm:px-8 sm:pb-16 sm:pt-9"
      data-profile-template="location-provider-router"
    >
      <div className="space-y-6 sm:space-y-8">
        <section
          aria-labelledby="location-router-name"
          className="text-center"
          id="profile"
        >
          <div className="relative mx-auto size-24 overflow-hidden rounded-[1.75rem] border-4 border-card bg-muted shadow-[var(--elevation-card)] sm:size-28">
            <SafeImage
              alt={
                displayName ? `Portrait of ${displayName}` : "Profile portrait"
              }
              className="object-cover"
              fill
              priority
              sizes="112px"
              src={profile.profileImageUrl}
            />
          </div>
          <h1
            className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            id="location-router-name"
          >
            {displayName || "Dental professional"}
          </h1>
          {credentials ? (
            <p className="mt-2 text-sm font-semibold text-muted-foreground sm:text-base">
              {credentials}
            </p>
          ) : null}
          {dentistry.location_title?.trim() ? (
            <p className="mx-auto mt-4 max-w-xl rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground">
              {dentistry.location_title}
            </p>
          ) : null}
        </section>

        {dentistry.about_title?.trim() ? (
          <section
            aria-labelledby="location-router-introduction"
            className="text-center"
          >
            <h2
              className="text-xl font-bold text-foreground"
              id="location-router-introduction"
            >
              {dentistry.about_title.trim()}
            </h2>
          </section>
        ) : null}

        <LocationRouterExperience
          contact={contact}
          copy={getLocationRouterCopy(answers)}
          defaultOptionId={routerState.defaultOptionId}
          options={routerState.options}
          recoveredDefault={routerState.recoveredDefault}
        />

        {dentistry.about_text?.trim() ? (
          <section
            aria-label="About the practice"
            className="rounded-[var(--radius-lg)] border border-border bg-card px-5 py-4 text-sm leading-6 text-muted-foreground shadow-sm sm:text-base"
          >
            {dentistry.about_text}
          </section>
        ) : null}

        <ProfileTreatmentServiceSections
          inventory={inventory}
          moduleId="location-provider-router"
          serviceTitle={dentistry.service_section_title}
          treatmentTitle={dentistry.treatment_section_title}
          variant="compact-grid"
        />
        <ProfileLinksSection
          anchorId={null}
          linkGroups={profile.linkGroups}
          moduleId="location-provider-router"
        />

        <LocationRouterBlogs sections={blogSections} username={username} />

        <ProfileGallerySection
          cases={gallery.cases}
          generalImages={gallery.generalImages}
          moduleId="location-provider-router-gallery"
        />

        <LocationRouterReviews
          externalReviewPages={profile.externalReviewPages}
          reviews={profile.reviews}
        />

        <section
          aria-labelledby="location-router-contact-title"
          className="border-t border-border pt-7 text-center"
          id="links"
        >
          <h2
            className="text-base font-bold text-foreground"
            id="location-router-contact-title"
          >
            Follow and contact the practice
          </h2>
          <div className="mt-3">
            <LocationRouterSocialLinks socials={profile.socials} />
          </div>
        </section>
      </div>
    </main>
  );
}
