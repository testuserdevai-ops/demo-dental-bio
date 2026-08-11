import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import {
  createDirectionsHref,
  selectDirectBookingActions,
  selectFeaturedTreatments,
  type DirectBookingAction,
} from "../_lib/direct-booking-template";
import ReadOnlyRating from "../components/ReadOnlyRating";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";

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

function TreatmentCards({
  treatments,
}: {
  treatments: ReturnType<typeof selectFeaturedTreatments>;
}) {
  if (treatments.length === 0) return null;

  return (
    <section aria-labelledby="direct-booking-treatments" className="space-y-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Start here
        </p>
        <h2
          className="mt-1 text-2xl font-bold text-foreground"
          id="direct-booking-treatments"
        >
          Featured treatments
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {treatments.map((treatment, index) => (
          <article
            className="rounded-[var(--radius-md)] border border-border bg-card p-4 shadow-sm"
            data-treatment-id={treatment.treatment_id}
            key={treatment.treatment_id}
          >
            <span className="grid size-8 place-items-center rounded-full bg-[var(--profile-secondary-action)] text-sm font-bold text-[var(--profile-on-secondary-action)]">
              {index + 1}
            </span>
            <h3 className="mt-3 text-base font-bold leading-snug text-card-foreground">
              {treatment.treatments?.title?.trim() || "Treatment consultation"}
            </h3>
            {treatment.treatments?.description?.trim() ? (
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {treatment.treatments.description}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function LocationSummary({ profile }: { profile: PublicProfileViewModel }) {
  const location = profile.locations.find(({ locations }) =>
    Boolean(locations),
  );
  if (!location?.locations) return null;

  const details = location.locations;
  const directionsHref = createDirectionsHref(details);
  const locationLabel =
    details.business_name?.trim() ||
    profile.dentistry.location_title?.trim() ||
    "Practice location";
  const address =
    details.full_address?.trim() ||
    [details.area, details.city, details.country].filter(Boolean).join(", ");

  return (
    <section
      aria-labelledby="direct-booking-location"
      className="rounded-[var(--radius-lg)] border border-border bg-card p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Visit the practice
          </p>
          <h2
            className="mt-1 text-xl font-bold text-card-foreground"
            id="direct-booking-location"
          >
            {locationLabel}
          </h2>
          {address ? (
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {address}
            </p>
          ) : null}
        </div>
        {directionsHref && location.location_id ? (
          <TrackedLink
            analytics={[
              {
                section: "locations",
                position: 1,
                action: {
                  type: "directions_click",
                  locationId: location.location_id,
                },
              },
              {
                section: "locations",
                position: 1,
                action: {
                  type: "cta_click",
                  ctaType: "directions",
                  locationId: location.location_id,
                },
              },
            ]}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--radius-full)] border border-border px-5 py-2 text-sm font-bold text-[var(--profile-link)] no-underline hover:text-[var(--profile-link-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            href={directionsHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Get directions
            <span className="sr-only"> (opens in a new tab)</span>
          </TrackedLink>
        ) : null}
      </div>
    </section>
  );
}

function ReviewSummary({ profile }: { profile: PublicProfileViewModel }) {
  const scoredReviews = profile.reviews.filter(
    (review) =>
      typeof review.stars === "number" && Number.isFinite(review.stars),
  );
  if (scoredReviews.length === 0) return null;

  const score =
    scoredReviews.reduce((sum, review) => sum + (review.stars ?? 0), 0) /
    scoredReviews.length;
  const externalReview = profile.externalReviewPages.find(({ link }) =>
    /^https?:\/\//i.test(link?.trim() ?? ""),
  );
  const summary = (
    <>
      <span className="text-2xl font-bold text-card-foreground">
        {score.toFixed(1)}
      </span>
      <ReadOnlyRating value={score} />
      <span className="text-sm text-muted-foreground">
        From {scoredReviews.length} patient{" "}
        {scoredReviews.length === 1 ? "review" : "reviews"}
      </span>
    </>
  );

  return (
    <section aria-label="Patient review summary" className="text-center">
      {externalReview ? (
        <TrackedLink
          analytics={{
            section: "reviews",
            position: 1,
            action: {
              type: "external_review_click",
              reviewPageId: externalReview.id,
            },
          }}
          className="inline-flex min-h-11 flex-wrap items-center justify-center gap-2 rounded-[var(--radius-full)] px-4 py-2 no-underline hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          href={externalReview.link ?? ""}
          rel="noopener noreferrer"
          target="_blank"
        >
          {summary}
          <span className="sr-only">Open reviews in a new tab</span>
        </TrackedLink>
      ) : (
        <div className="flex min-h-11 flex-wrap items-center justify-center gap-2 px-4 py-2">
          {summary}
        </div>
      )}
    </section>
  );
}

export default function DirectBookingProfileTemplate({
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
  const featuredTreatments = selectFeaturedTreatments(
    answers,
    profile.treatments,
  );
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const credentials = [user.position, user.qualification]
    .filter((part) => part?.trim())
    .join(" · ");

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[720px] bg-background px-4 pb-10 pt-6 text-foreground sm:px-8 sm:pb-14 sm:pt-10"
      data-profile-template="direct-booking"
    >
      <div className="space-y-8">
        <section className="text-center" aria-labelledby="direct-booking-name">
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

        <TreatmentCards treatments={featuredTreatments} />
        <LocationSummary profile={profile} />
        <ReviewSummary profile={profile} />
      </div>
    </main>
  );
}
