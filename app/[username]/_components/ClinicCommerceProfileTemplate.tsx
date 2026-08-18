import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import { selectProfileProducts } from "../_lib/profile-products";
import { selectProfileTreatmentServices } from "../_lib/profile-treatment-services";
import { selectProfileVideos } from "../_lib/profile-videos";
import {
  orderCommerceSections,
  selectCommerceClinicAction,
  selectCommerceBlogGroups,
  selectCommerceGallery,
  type CommerceAction,
} from "../_lib/clinic-commerce-template";
import WorkLocation from "../components/WorkLocation";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import ClinicCommerceBlogSection from "./ClinicCommerceBlogSection";
import ClinicCommerceGallerySection from "./ClinicCommerceGallerySection";
import ProfileLinksSection from "./ProfileLinksSection";
import ProfileProductSection from "./ProfileProductSection";
import ProfileReviewsSection from "./ProfileReviewsSection";
import ProfileTreatmentServiceSections from "./ProfileTreatmentServiceSections";
import ProfileVideoSections from "./ProfileVideoSections";

function ClinicAction({ action }: { action: CommerceAction }) {
  return (
    <TrackedLink
      analytics={action.analytics}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-6 py-3 text-center text-base font-bold text-[var(--profile-on-primary-action)] no-underline shadow-[var(--elevation-card)] hover:bg-[var(--profile-primary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:w-auto"
      href={action.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {action.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </TrackedLink>
  );
}

function ClinicSection({
  action,
  profile,
}: {
  action: CommerceAction | null;
  profile: PublicProfileViewModel;
}) {
  const inventory = selectProfileTreatmentServices(profile.treatments);
  const hasInventory =
    inventory.treatments.length > 0 || inventory.services.length > 0;

  if (!hasInventory && !action) return null;

  return (
    <div className="space-y-5" id="clinic">
      <ProfileTreatmentServiceSections
        inventory={inventory}
        moduleId="clinic-commerce"
        serviceTitle={profile.dentistry.service_section_title}
        treatmentTitle={profile.dentistry.treatment_section_title}
        variant="card-grid"
      />
      {action ? <ClinicAction action={action} /> : null}
    </div>
  );
}

function CommunitySection({ profile }: { profile: PublicProfileViewModel }) {
  const hasSocials = Boolean(
    profile.dentistry.website?.trim() ||
    (profile.socials && Object.values(profile.socials).some(Boolean)),
  );

  if (!hasSocials) return null;

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Links and social profiles
      </p>
      {hasSocials ? (
        <div className="mt-4 [&_a]:!inline-flex [&_a]:!size-11 [&_a]:items-center [&_a]:justify-center [&_a]:!p-0">
          <DirectBookingSocialLinks
            socials={profile.socials}
            website={profile.dentistry.website}
          />
        </div>
      ) : null}
    </section>
  );
}

export default function ClinicCommerceProfileTemplate({
  profile,
  username,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["clinic-commerce"];
  const products = selectProfileProducts(
    profile.products,
    answers.featuredProductId,
  );
  const videoGroups = selectProfileVideos(profile.videoGroups);
  const blogGroups = selectCommerceBlogGroups(profile.blogGroups);
  const gallery = selectCommerceGallery(
    profile.galleries,
    profile.generalGalleries,
  );
  const clinicAction = selectCommerceClinicAction(profile.dentistry);
  const displayName = [
    profile.user.title,
    profile.user.first_name,
    profile.user.last_name,
  ]
    .filter((part) => part?.trim())
    .join(" ");

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[661px] overflow-x-clip bg-background px-4 pb-12 pt-3 text-foreground sm:px-8 sm:py-10"
      data-profile-template="clinic-commerce"
    >
      <div className="space-y-8 sm:space-y-10">
        <section
          aria-labelledby="commerce-name"
          className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--elevation-card)]"
          id="profile"
        >
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5 sm:p-6">
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-muted">
              <SafeImage
                alt={
                  displayName
                    ? `Portrait of ${displayName}`
                    : "Profile portrait"
                }
                className="object-cover object-top"
                fill
                priority
                sizes="(min-width: 640px) 144px, 96px"
                src={profile.profileImageUrl}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {profile.user.position?.trim() || "Dental professional"}
              </p>
              <h1
                className="mt-1 text-balance text-2xl font-bold tracking-tight text-card-foreground sm:text-3xl"
                id="commerce-name"
              >
                {displayName || "Dental professional"}
              </h1>
              {profile.user.qualification?.trim() ? (
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {profile.user.qualification}
                </p>
              ) : null}
            </div>
          </div>
          <div className="border-t border-border p-4 sm:p-6">
            {profile.dentistry.about_title?.trim() ? (
              <h2 className="text-balance text-xl font-bold text-card-foreground sm:text-2xl">
                {profile.dentistry.about_title}
              </h2>
            ) : null}
            {profile.dentistry.about_text?.trim() ? (
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {profile.dentistry.about_text}
              </p>
            ) : null}
            <nav
              aria-label="Choose clinic or shop"
              className="mt-4 grid grid-cols-2 gap-2"
            >
              {clinicAction ? (
                <ClinicAction action={clinicAction} />
              ) : (
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-4 font-bold text-foreground"
                  href="#clinic"
                >
                  Explore clinic
                </a>
              )}
              {products.length > 0 ? (
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-full)] border border-border bg-[var(--profile-secondary-action)] px-4 text-center font-bold text-[var(--profile-on-secondary-action)] no-underline"
                  href="#shop"
                >
                  Browse the shop
                </a>
              ) : null}
            </nav>
          </div>
        </section>

        {orderCommerceSections(answers.defaultAudience).map((section) =>
          section === "shop" ? (
            <ProfileProductSection key={section} products={products} />
          ) : (
            <ClinicSection
              action={clinicAction}
              key={section}
              profile={profile}
            />
          ),
        )}
        <ProfileVideoSections groups={videoGroups} />
        <WorkLocation
          dentistry={profile.dentistry}
          serverLocations={profile.locations}
        />
        <ClinicCommerceGallerySection
          cases={gallery.cases}
          generalImages={gallery.generalImages}
        />
        <ClinicCommerceBlogSection groups={blogGroups} username={username} />
        <ProfileReviewsSection
          externalReviewPages={profile.externalReviewPages}
          externalReviewSectionTitle={
            profile.dentistry.external_review_section_title
          }
          reviews={profile.reviews}
          templateId="clinic-commerce"
        />
        <ProfileLinksSection
          linkGroups={profile.linkGroups}
          moduleId="clinic-commerce"
          variant="grid"
        />
        <CommunitySection profile={profile} />
      </div>
    </main>
  );
}
