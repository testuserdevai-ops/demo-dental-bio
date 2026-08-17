import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import { PublicProfileLinkCard } from "@/app/components/public-profile/PublicProfileLinkCard";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";
import { resolvePublicLinkPresentation } from "@/lib/public-profile/link-presentation";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import { selectProfileGallery } from "../_lib/profile-gallery";
import {
  orderCataloguePracticalSections,
  selectCatalogueBlogGroups,
  selectCataloguePrimaryAction,
  selectCatalogueResources,
  selectCatalogueTreatments,
  type CatalogueAction,
  type CatalogueResource,
  type CatalogueResourceKind,
} from "../_lib/services-catalogue-template";
import WorkLocation from "../components/WorkLocation";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import ProfileGallerySection from "./ProfileGallerySection";
import ProfileReviewsSection from "./ProfileReviewsSection";
import {
  ServiceCatalogueItems,
  type CatalogueSectionItem,
} from "./ServiceCatalogueSections";
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

function CatalogueInventory({
  action,
  featured,
  heading,
  id,
  items,
  kind,
}: {
  action: CatalogueAction | null;
  featured: ReturnType<typeof selectCatalogueTreatments>["featured"];
  heading: string;
  id: "treatments" | "services";
  items: readonly CatalogueSectionItem[];
  kind: CatalogueSectionItem["kind"];
}) {
  if (featured.length === 0 && items.length === 0) return null;
  const headingId = `catalogue-${kind}-heading`;
  const isService = kind === "service";

  return (
    <section aria-labelledby={headingId} className="space-y-4" id={id}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {featured.length > 0 ? "Featured care" : "Browse by need"}
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          id={headingId}
        >
          {heading}
        </h2>
      </div>
      {featured.length > 0 ? (
        <div className="grid gap-3">
          {featured.map((treatment, index) => {
            const item = treatment.treatments;
            const content = (
              <>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--profile-secondary-action)] text-sm font-bold text-[var(--profile-on-secondary-action)]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold leading-snug text-card-foreground">
                    {item?.title?.trim()}
                  </span>
                  {item?.description?.trim() ? (
                    <span className="hidden text-sm leading-5 text-muted-foreground sm:mt-1 sm:line-clamp-2 sm:block">
                      {item.description}
                    </span>
                  ) : null}
                </span>
                {action ? (
                  <span className="shrink-0 text-sm font-bold text-[var(--profile-link)]">
                    Book
                  </span>
                ) : null}
              </>
            );

            return action ? (
              <TrackedLink
                analytics={[
                  {
                    section: isService ? "services" : "treatments",
                    position: index + 1,
                    action: isService
                      ? {
                          type: "service_cta_click",
                          treatmentId: treatment.treatment_id,
                        }
                      : {
                          type: "treatment_cta_click",
                          treatmentId: treatment.treatment_id,
                        },
                  },
                  {
                    section: isService ? "services" : "treatments",
                    position: index + 1,
                    action: { type: "cta_click", ctaType: "booking" },
                  },
                ]}
                className="flex min-h-20 items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 no-underline shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                data-featured-treatment={treatment.treatment_id}
                href={action.href}
                key={treatment.treatment_id}
                rel="noopener noreferrer"
                target="_blank"
              >
                {content}
                <span className="sr-only"> (opens in a new tab)</span>
              </TrackedLink>
            ) : (
              <article
                className="flex min-h-20 items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm"
                data-featured-treatment={treatment.treatment_id}
                key={treatment.treatment_id}
              >
                {content}
              </article>
            );
          })}
        </div>
      ) : null}
      <ServiceCatalogueItems items={items} positionOffset={featured.length} />
    </section>
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
  const catalogue = selectCatalogueTreatments(answers, profile.treatments);
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
  const sectionItems = (
    entries: typeof catalogue.treatments,
    kind: CatalogueSectionItem["kind"],
  ): CatalogueSectionItem[] =>
    entries.flatMap((entry) => {
      const title = entry.treatments?.title?.trim();
      return title
        ? [
            {
              id: entry.treatment_id,
              title,
              description: entry.treatments?.description?.trim() || null,
              kind,
            },
          ]
        : [];
    });
  const featuredTreatments = catalogue.featured.filter(
    ({ treatments: treatment }) => treatment?.isService !== true,
  );
  const featuredServices = catalogue.featured.filter(
    ({ treatments: treatment }) => treatment?.isService === true,
  );
  const treatmentItems = sectionItems(catalogue.treatments, "treatment");
  const serviceItems = sectionItems(catalogue.services, "service");
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

        <CatalogueInventory
          action={primaryAction}
          featured={featuredTreatments}
          heading={dentistry.treatment_section_title}
          id="treatments"
          items={treatmentItems}
          kind="treatment"
        />
        <CatalogueInventory
          action={primaryAction}
          featured={featuredServices}
          heading={dentistry.service_section_title}
          id="services"
          items={serviceItems}
          kind="service"
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
