import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import { PublicProfileLinkCard } from "@/app/components/public-profile/PublicProfileLinkCard";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";
import { resolvePublicLinkPresentation } from "@/lib/public-profile/link-presentation";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import { selectProfileGallery } from "../_lib/profile-gallery";
import { selectProfileTreatmentServices } from "../_lib/profile-treatment-services";
import {
  orderCataloguePracticalSections,
  selectCatalogueBlogGroups,
  selectCataloguePrimaryAction,
  selectCatalogueResources,
  type CatalogueAction,
  type CatalogueResource,
  type CatalogueResourceKind,
} from "../_lib/services-catalogue-template";
import WorkLocation from "../components/WorkLocation";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import ProfileGallerySection from "./ProfileGallerySection";
import ProfileReviewsSection from "./ProfileReviewsSection";
import ProfileTreatmentServiceSections from "./ProfileTreatmentServiceSections";
import ServicesCatalogueBlogSection from "./ServicesCatalogueBlogSection";

const practicalLabels = {
  financing: {
    eyebrow: "Plan with confidence",
    heading: "Fees and finance",
  },
  team: { eyebrow: "Know who you will meet", heading: "Our clinical team" },
  faq: { eyebrow: "Prepare for your visit", heading: "Guides and answers" },
} as const satisfies Record<
  CatalogueResourceKind,
  { eyebrow: string; heading: string }
>;

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

function PracticalResources({
  anchorId,
  kind,
  resources,
}: {
  anchorId?: string;
  kind: CatalogueResourceKind;
  resources: readonly CatalogueResource[];
}) {
  if (resources.length === 0) return null;
  const labels = practicalLabels[kind];
  const headingId = `catalogue-${kind}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4"
      data-practical-section={kind}
      id={anchorId}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {labels.eyebrow}
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          id={headingId}
        >
          {labels.heading}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {resources.map((resource) => (
          <PublicProfileLinkCard
            analytics={{
              section: "links",
              position: resource.position,
              action: {
                type: "link_click",
                linkId: resource.id,
                groupId: resource.groupId,
              },
            }}
            href={resource.href}
            key={resource.id}
            label={resource.label}
            presentation={resolvePublicLinkPresentation({
              variant: resource.presentation.imageVariant,
              imageUrl: resource.presentation.imageUrl,
              imageAlt: resource.presentation.imageAlt,
              decorative: resource.presentation.imageDecorative,
              featured: resource.presentation.isFeatured,
            })}
          />
        ))}
      </div>
    </section>
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
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["services-catalogue"];
  const inventory = selectProfileTreatmentServices(profile.treatments);
  const resources = selectCatalogueResources(profile.linkGroups);
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
  const practicalKinds = orderCataloguePracticalSections(
    answers.showFinancingBeforeTeam,
  ).filter((kind) => resources.some((resource) => resource.kind === kind));

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

        {practicalKinds.map((kind, index) => (
          <PracticalResources
            anchorId={index === 0 ? "links" : undefined}
            key={kind}
            kind={kind}
            resources={resources.filter((resource) => resource.kind === kind)}
          />
        ))}

        <ProfileGallerySection
          cases={gallery.cases}
          generalImages={gallery.generalImages}
          moduleId="services-catalogue-gallery"
        />

        <ServicesCatalogueBlogSection groups={blogGroups} username={username} />

        <ProfileReviewsSection
          externalReviewPages={profile.externalReviewPages}
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
