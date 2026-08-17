import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import {
  selectDirectBookingActions,
  selectDirectBookingBlogGroups,
  type DirectBookingAction,
} from "../_lib/direct-booking-template";
import { selectProfileGallery } from "../_lib/profile-gallery";
import type { ProfileProduct } from "../_lib/profile-products";
import { selectProfileTreatmentServices } from "../_lib/profile-treatment-services";
import type { ProfileVideoGroup } from "../_lib/profile-videos";
import WorkLocation from "../components/WorkLocation";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import DirectBookingBlogSection from "./DirectBookingBlogSection";
import ProfileGallerySection from "./ProfileGallerySection";
import ProfileLinksSection from "./ProfileLinksSection";
import ProfileReviewsSection from "./ProfileReviewsSection";
import ProfileTreatmentServiceSections from "./ProfileTreatmentServiceSections";
import ProfileProductSection from "./ProfileProductSection";
import ProfileVideoSections from "./ProfileVideoSections";

function ActionLink({
  action,
  emphasis,
}: {
  action: DirectBookingAction;
  emphasis: "primary" | "secondary";
}) {
  return (
    <TrackedLink
      analytics={action.analytics}
      className={
        emphasis === "primary"
          ? "inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-6 py-3 text-center text-base font-bold text-[var(--profile-on-primary-action)] no-underline shadow-[var(--elevation-card)] transition-colors hover:bg-[var(--profile-primary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring active:bg-[var(--profile-primary-action-active)]"
          : "inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-full)] border border-border bg-[var(--profile-secondary-action)] px-6 py-3 text-center text-sm font-bold text-[var(--profile-on-secondary-action)] no-underline transition-colors hover:bg-[var(--profile-secondary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring active:bg-[var(--profile-secondary-action-active)]"
      }
      href={action.href}
      rel={action.external ? "noopener noreferrer" : undefined}
      target={action.external ? "_blank" : undefined}
    >
      {action.label}
      {action.external ? (
        <span className="sr-only"> (opens in a new tab)</span>
      ) : null}
    </TrackedLink>
  );
}

export default function DirectBookingProfileTemplate({
  username,
  profile,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const { user, dentistry } = profile;
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["direct-booking"];
  const { primary, secondary } = selectDirectBookingActions(
    answers,
    dentistry,
    profile.linkGroups,
  );
  const inventory = selectProfileTreatmentServices(profile.treatments);
  const blogGroups = selectDirectBookingBlogGroups(profile.blogGroups);
  const gallery = selectProfileGallery(
    profile.galleries,
    profile.generalGalleries,
  );
  const products = profile.products as ProfileProduct[];
  const videos = profile.videoGroups as ProfileVideoGroup[];
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const credentials = [user.position, user.qualification]
    .filter((part) => part?.trim())
    .join(" · ");

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[661px] bg-background px-4 pb-10 pt-6 text-foreground sm:px-8 sm:pb-14 sm:pt-10"
      data-profile-template="direct-booking"
    >
      <div className="space-y-8">
        <section
          aria-labelledby="direct-booking-name"
          className="text-center"
          id="profile"
        >
          <div className="relative mx-auto size-28 overflow-hidden rounded-[2rem] border-4 border-card bg-muted shadow-[var(--elevation-card)] sm:size-32">
            <SafeImage
              alt={
                displayName ? `Portrait of ${displayName}` : "Profile portrait"
              }
              className="object-cover"
              fill
              priority
              sizes="128px"
              src={profile.profileImageUrl}
            />
          </div>
          <h1
            className="mt-5 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            id="direct-booking-name"
          >
            {displayName || "Dental professional"}
          </h1>
          {credentials ? (
            <p className="mt-2 text-sm font-semibold text-muted-foreground sm:text-base">
              {credentials}
            </p>
          ) : null}
          {user.gdc_no?.trim() ? (
            <p className="mt-1 text-xs text-muted-foreground">
              GDC {user.gdc_no}
            </p>
          ) : null}
          {dentistry.about_title?.trim() ? (
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-7 text-foreground sm:text-lg">
              {dentistry.about_title}
            </p>
          ) : null}
          <div className="mt-4">
            <DirectBookingSocialLinks
              socials={profile.socials}
              website={dentistry.website}
            />
          </div>
        </section>

        <section
          aria-label="Appointment actions"
          className="mx-auto max-w-xl space-y-3"
          id="links"
        >
          {primary ? <ActionLink action={primary} emphasis="primary" /> : null}
          {secondary ? (
            <ActionLink action={secondary} emphasis="secondary" />
          ) : null}
          {!primary && !secondary ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-card p-4 text-center">
              <h2 className="text-base font-bold text-card-foreground">
                Booking details are being prepared
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Please check back soon for appointment and contact options.
              </p>
            </div>
          ) : null}
        </section>

        <ProfileTreatmentServiceSections
          inventory={inventory}
          moduleId="direct-booking"
          serviceTitle={dentistry.service_section_title}
          treatmentTitle={dentistry.treatment_section_title}
          variant="numbered"
        />
        <ProfileLinksSection
          anchorId={null}
          linkGroups={profile.linkGroups}
          moduleId="direct-booking"
        />
        <DirectBookingBlogSection groups={blogGroups} username={username} />
        <ProfileVideoSections groups={videos} />
        <ProfileGallerySection
          cases={gallery.cases}
          generalImages={gallery.generalImages}
          moduleId="direct-booking-gallery"
        />
        <ProfileProductSection products={products} />
        <WorkLocation
          dentistry={dentistry}
          serverLocations={profile.locations}
        />
        <ProfileReviewsSection
          externalReviewPages={profile.externalReviewPages}
          reviews={profile.reviews}
          templateId="direct-booking"
        />
      </div>
    </main>
  );
}
