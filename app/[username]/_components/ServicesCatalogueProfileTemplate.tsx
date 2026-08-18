import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import { selectProfileGallery } from "../_lib/profile-gallery";
import { selectProfileProducts } from "../_lib/profile-products";
import { selectProfileTreatmentServices } from "../_lib/profile-treatment-services";
import { selectProfileVideos } from "../_lib/profile-videos";
import {
  selectCatalogueBlogGroups,
  selectCataloguePrimaryAction,
  type CatalogueAction,
} from "../_lib/services-catalogue-template";
import WorkLocation from "../components/WorkLocation";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import ProfileGallerySection from "./ProfileGallerySection";
import ProfileLinksSection from "./ProfileLinksSection";
import ProfileProductSection from "./ProfileProductSection";
import ProfileReviewsSection from "./ProfileReviewsSection";
import ProfileTreatmentServiceSections from "./ProfileTreatmentServiceSections";
import ProfileVideoSections from "./ProfileVideoSections";
import ServicesCatalogueBlogSection from "./ServicesCatalogueBlogSection";

function PrimaryAction({
  action,
  className,
}: {
  action: CatalogueAction;
  className?: string;
}) {
  return (
    <TrackedLink
      analytics={action.analytics}
      className={`inline-flex min-h-12 items-center justify-center rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-6 py-3 text-center text-base font-bold text-[var(--profile-on-primary-action)] no-underline shadow-[var(--elevation-card)] transition-colors hover:bg-[var(--profile-primary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring active:bg-[var(--profile-primary-action-active)] ${className ?? ""}`}
      href={action.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {action.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </TrackedLink>
  );
}

export default function ServicesCatalogueProfileTemplate({
  profile,
  username,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const { user, dentistry } = profile;
  const inventory = selectProfileTreatmentServices(profile.treatments);
  const products = selectProfileProducts(profile.products);
  const videoGroups = selectProfileVideos(profile.videoGroups);
  const blogGroups = selectCatalogueBlogGroups(profile.blogGroups);
  const gallery = selectProfileGallery(
    profile.galleries,
    profile.generalGalleries,
  );
  const primaryAction = selectCataloguePrimaryAction(dentistry);
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const credentials = [user.position, user.qualification]
    .filter((part) => part?.trim())
    .join(" · ");

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[661px] bg-background px-4 pb-28 pt-5 text-foreground sm:px-8 sm:pb-16 sm:pt-9"
      data-profile-template="services-catalogue"
    >
      <div className="space-y-8 sm:space-y-10">
        <section
          className="rounded-[var(--radius-xl)] border border-border bg-card p-5 text-center shadow-[var(--elevation-card)] sm:p-7"
          aria-labelledby="catalogue-profile-name"
          id="profile"
        >
          <div className="relative mx-auto size-28 overflow-hidden rounded-[2rem] border-4 border-background bg-muted shadow-sm">
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
          <div className="mt-4 flex flex-col items-center">
            <h1
              className="text-balance text-3xl font-bold tracking-tight text-card-foreground sm:text-4xl"
              id="catalogue-profile-name"
            >
              {dentistry.about_title?.trim() ||
                displayName ||
                "Dental care, made clearer"}
            </h1>
            {displayName ? (
              <p className="mt-3 text-base font-bold text-card-foreground">
                {displayName}
              </p>
            ) : null}
            {credentials ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {credentials}
              </p>
            ) : null}
            {dentistry.about_text?.trim() ? (
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {dentistry.about_text}
              </p>
            ) : null}
            <div className="mt-4 self-center">
              <DirectBookingSocialLinks
                socials={profile.socials}
                website={dentistry.website}
              />
            </div>
            {primaryAction ? (
              <PrimaryAction
                action={primaryAction}
                className="mt-5 hidden w-full sm:inline-flex sm:w-auto"
              />
            ) : null}
          </div>
        </section>

        <ProfileTreatmentServiceSections
          inventory={inventory}
          moduleId="services-catalogue"
          serviceTitle={dentistry.service_section_title}
          treatmentTitle={dentistry.treatment_section_title}
          variant="numbered"
        />

        <ProfileLinksSection
          linkGroups={profile.linkGroups}
          moduleId="services-catalogue"
          variant="grid"
        />

        <ProfileGallerySection
          cases={gallery.cases}
          generalImages={gallery.generalImages}
          moduleId="services-catalogue-gallery"
        />

        <ServicesCatalogueBlogSection groups={blogGroups} username={username} />

        <ProfileVideoSections groups={videoGroups} />
        <ProfileProductSection products={products} />

        <ProfileReviewsSection
          externalReviewPages={profile.externalReviewPages}
          externalReviewSectionTitle={dentistry.external_review_section_title}
          reviews={profile.reviews}
          templateId="services-catalogue"
        />
        <WorkLocation
          dentistry={dentistry}
          serverLocations={profile.locations}
        />
      </div>

      {primaryAction ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:hidden">
          <PrimaryAction action={primaryAction} className="w-full" />
        </div>
      ) : null}
    </main>
  );
}
