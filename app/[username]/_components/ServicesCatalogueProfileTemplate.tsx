import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import { PublicProfileLinkCard } from "@/app/components/public-profile/PublicProfileLinkCard";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";
import { resolvePublicLinkPresentation } from "@/lib/public-profile/link-presentation";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import {
  orderCataloguePracticalSections,
  selectCataloguePrimaryAction,
  selectCatalogueResources,
  selectCatalogueTreatments,
  type CatalogueAction,
  type CatalogueResource,
  type CatalogueResourceKind,
} from "../_lib/services-catalogue-template";
import ReadOnlyRating from "../components/ReadOnlyRating";
import WorkLocation from "../components/WorkLocation";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import {
  ServiceCatalogueSections,
  type CatalogueSectionItem,
} from "./ServiceCatalogueSections";

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

function FeaturedCare({
  action,
  treatments,
}: {
  action: CatalogueAction | null;
  treatments: ReturnType<typeof selectCatalogueTreatments>["featured"];
}) {
  if (treatments.length === 0) return null;

  return (
    <section aria-labelledby="catalogue-featured-heading" className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Most requested
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          id="catalogue-featured-heading"
        >
          Featured care
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {treatments.map((treatment, index) => {
          const item = treatment.treatments;
          const isService = item?.isService === true;
          return (
            <article
              className="flex min-h-48 flex-col rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm"
              data-featured-treatment={treatment.treatment_id}
              key={treatment.treatment_id}
            >
              <span className="grid size-9 place-items-center rounded-full bg-[var(--profile-secondary-action)] text-sm font-bold text-[var(--profile-on-secondary-action)]">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold leading-snug text-card-foreground">
                {item?.title?.trim() || "Personalised dental care"}
              </h3>
              {item?.description?.trim() ? (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
              {action ? (
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
                  className="mt-auto inline-flex min-h-11 items-end pt-4 text-sm font-bold text-[var(--profile-link)] underline-offset-4 hover:text-[var(--profile-link-hover)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                  href={action.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Ask about this care
                  <span className="sr-only"> (opens in a new tab)</span>
                </TrackedLink>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PracticalResources({
  kind,
  resources,
}: {
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

function CatalogueReviews({ profile }: { profile: PublicProfileViewModel }) {
  const reviews = profile.reviews.slice(0, 3);
  if (reviews.length === 0) return null;
  const external = profile.externalReviewPages.find(({ link }) =>
    /^https?:\/\//i.test(link?.trim() ?? ""),
  );

  return (
    <section aria-labelledby="catalogue-reviews-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Patient perspectives
          </p>
          <h2
            className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            id="catalogue-reviews-heading"
          >
            Care, clearly explained
          </h2>
        </div>
        {external ? (
          <TrackedLink
            analytics={{
              section: "reviews",
              position: 1,
              action: {
                type: "external_review_click",
                reviewPageId: external.id,
              },
            }}
            className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--profile-link)] underline-offset-4 hover:text-[var(--profile-link-hover)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            href={external.link ?? ""}
            rel="noopener noreferrer"
            target="_blank"
          >
            Read all reviews
            <span className="sr-only"> (opens in a new tab)</span>
          </TrackedLink>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {reviews.map((review) => (
          <article
            className="rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm"
            key={review.id}
          >
            <ReadOnlyRating value={review.stars ?? undefined} />
            {review.content?.trim() ? (
              <p className="mt-4 text-sm leading-6 text-card-foreground">
                “{review.content}”
              </p>
            ) : null}
            {review.reviewer_name?.trim() ? (
              <p className="mt-3 text-xs font-bold text-muted-foreground">
                {review.reviewer_name}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ServicesCatalogueProfileTemplate({
  profile,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const { user, dentistry } = profile;
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["services-catalogue"];
  const catalogue = selectCatalogueTreatments(answers, profile.treatments);
  const resources = selectCatalogueResources(profile.linkGroups);
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
    entries.map((entry) => ({
      id: entry.treatment_id,
      title: entry.treatments?.title?.trim() || "Personalised care",
      description: entry.treatments?.description?.trim() || null,
      kind,
    }));

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[960px] bg-background px-4 pb-28 pt-5 text-foreground sm:px-8 sm:pb-16 sm:pt-10 lg:px-10"
      data-profile-template="services-catalogue"
    >
      <div className="space-y-10 sm:space-y-14">
        <section
          className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--elevation-card)]"
          aria-labelledby="catalogue-profile-name"
        >
          <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-stretch">
            <div className="relative min-h-64 overflow-hidden bg-muted sm:min-h-80 md:min-h-full">
              <SafeImage
                alt={
                  displayName
                    ? `Portrait of ${displayName}`
                    : "Profile portrait"
                }
                className="object-cover"
                fill
                priority
                sizes="(min-width: 768px) 420px, calc(100vw - 34px)"
                src={profile.profileImageUrl}
              />
            </div>
            <div className="flex flex-col justify-center p-5 sm:p-8 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Your guide to care
              </p>
              <h1
                className="mt-2 text-balance text-3xl font-bold tracking-tight text-card-foreground sm:text-4xl"
                id="catalogue-profile-name"
              >
                {dentistry.about_title?.trim() ||
                  displayName ||
                  "Dental care, made clearer"}
              </h1>
              {displayName ? (
                <p className="mt-4 text-base font-bold text-card-foreground">
                  {displayName}
                </p>
              ) : null}
              {credentials ? (
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {credentials}
                </p>
              ) : null}
              {dentistry.about_text?.trim() ? (
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                  {dentistry.about_text}
                </p>
              ) : null}
              <div className="mt-4 self-start">
                <DirectBookingSocialLinks
                  socials={profile.socials}
                  website={dentistry.website}
                />
              </div>
              {primaryAction ? (
                <PrimaryAction
                  action={primaryAction}
                  className="mt-6 hidden w-full sm:inline-flex sm:w-auto"
                />
              ) : null}
            </div>
          </div>
        </section>

        <FeaturedCare action={primaryAction} treatments={catalogue.featured} />
        <ServiceCatalogueSections
          heading="Treatments"
          items={sectionItems(catalogue.treatments, "treatment")}
        />
        <ServiceCatalogueSections
          heading="Support services"
          items={sectionItems(catalogue.services, "service")}
        />

        {orderCataloguePracticalSections(answers.showFinancingBeforeTeam).map(
          (kind) => (
            <PracticalResources
              key={kind}
              kind={kind}
              resources={resources.filter((resource) => resource.kind === kind)}
            />
          ),
        )}

        <CatalogueReviews profile={profile} />
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
