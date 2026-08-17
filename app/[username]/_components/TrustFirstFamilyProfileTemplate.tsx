import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import {
  normalizeTrustFirstHttpUrl,
  selectTrustFirstBlogGroups,
  selectTrustFirstReviews,
  selectTrustFirstTreatments,
} from "../_lib/trust-first-template";
import LocationMapModal from "../components/LocationMapModal";
import LocationImage from "../components/LocationImage";
import ReadOnlyRating from "../components/ReadOnlyRating";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import TrustFirstBlogSection from "./TrustFirstBlogSection";
import TrustFirstResources from "./TrustFirstResources";

function BookingActions({ profile }: { profile: PublicProfileViewModel }) {
  const bookingHref = profile.dentistry.booking_link_enabled
    ? normalizeTrustFirstHttpUrl(profile.dentistry.booking_link)
    : null;
  const phone = profile.dentistry.phone?.trim();

  if (!bookingHref && !phone) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
      {bookingHref ? (
        <TrackedLink
          analytics={[
            { section: "profile", action: { type: "booking_click" } },
            {
              section: "profile",
              action: { type: "cta_click", ctaType: "booking" },
            },
          ]}
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-6 py-3 text-center text-base font-bold text-[var(--profile-on-primary-action)] no-underline shadow-[var(--elevation-card)] hover:bg-[var(--profile-primary-action-hover)]"
          href={bookingHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          Book a family appointment
          <span className="sr-only"> (opens in a new tab)</span>
        </TrackedLink>
      ) : null}
      {phone ? (
        <TrackedLink
          analytics={{
            section: "profile",
            action: { type: "phone_click" },
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-full)] border border-border bg-card px-6 py-3 text-center text-sm font-bold text-card-foreground no-underline hover:bg-muted"
          href={`tel:${phone}`}
        >
          Call the team
        </TrackedLink>
      ) : null}
    </div>
  );
}

function ReviewProof({
  profile,
  answers,
}: {
  profile: PublicProfileViewModel;
  answers: ProfileTemplateAnswers["trust-first-family-practice"];
}) {
  const reviews = selectTrustFirstReviews(answers, profile.reviews);
  if (reviews.length === 0) return null;

  const scored = profile.reviews.filter(
    ({ stars }) => typeof stars === "number" && Number.isFinite(stars),
  );
  const average =
    scored.length > 0
      ? scored.reduce((total, { stars }) => total + (stars ?? 0), 0) /
        scored.length
      : null;
  const externalReview = profile.externalReviewPages.find(({ link }) =>
    /^https?:\/\//i.test(link?.trim() ?? ""),
  );

  return (
    <section
      aria-labelledby="trust-first-reviews"
      className="rounded-[var(--radius-xl)] bg-[var(--profile-muted)] p-5 sm:p-7"
      id="review"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--profile-on-muted)]">
            Patient reassurance
          </p>
          <h2
            className="mt-1 text-2xl font-bold text-[var(--profile-on-muted)]"
            id="trust-first-reviews"
          >
            Families feel listened to
          </h2>
        </div>
        {average !== null ? (
          <div className="flex items-center gap-2 text-[var(--profile-on-muted)]">
            <span className="text-xl font-bold">{average.toFixed(1)}</span>
            <ReadOnlyRating value={average} />
          </div>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {reviews.map((review) => (
          <article
            className="rounded-[var(--radius-lg)] bg-card p-4 text-card-foreground shadow-sm sm:p-5"
            data-review-id={review.id}
            key={review.id}
          >
            <ReadOnlyRating value={review.stars ?? undefined} />
            {review.content?.trim() ? (
              <blockquote className="mt-3 text-sm leading-6">
                “{review.content}”
              </blockquote>
            ) : null}
            {review.reviewer_name?.trim() ? (
              <p className="mt-3 text-sm font-bold text-muted-foreground">
                {review.reviewer_name}
              </p>
            ) : null}
          </article>
        ))}
      </div>
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
          className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[var(--profile-on-muted)] underline underline-offset-4"
          href={externalReview.link ?? ""}
          rel="noopener noreferrer"
          target="_blank"
        >
          Read more patient reviews
          <span className="sr-only"> (opens in a new tab)</span>
        </TrackedLink>
      ) : null}
    </section>
  );
}

function TeamCard({ profile }: { profile: PublicProfileViewModel }) {
  const { user } = profile;
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");

  return (
    <section aria-label="Your dentist" className="space-y-4">
      <article className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 sm:p-5">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-muted sm:size-24">
          <SafeImage
            alt={
              displayName ? `Portrait of ${displayName}` : "Dentist portrait"
            }
            className="object-cover"
            fill
            sizes="96px"
            src={profile.profileImageUrl}
          />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-card-foreground">
            {displayName || "Your dentist"}
          </h3>
          {user.position?.trim() ? (
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {user.position}
            </p>
          ) : null}
          {user.qualification?.trim() ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {user.qualification}
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}

function FamilyServices({ profile }: { profile: PublicProfileViewModel }) {
  const treatments = selectTrustFirstTreatments(profile.treatments);
  if (treatments.length === 0) return null;

  return (
    <section
      aria-labelledby="trust-first-services"
      className="space-y-4"
      id="treatments"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Care for every stage
        </p>
        <h2 className="mt-1 text-2xl font-bold" id="trust-first-services">
          {profile.dentistry.treatment_section_title}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {treatments.map((treatment) => (
          <article
            className="rounded-[var(--radius-lg)] border border-border bg-card p-4"
            data-treatment-id={treatment.treatment_id}
            key={treatment.treatment_id}
          >
            <h3 className="font-bold text-card-foreground">
              {treatment.treatments?.title?.trim() || "Dental care"}
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

function PracticalInformation({
  profile,
}: {
  profile: PublicProfileViewModel;
}) {
  const location = profile.locations.find(
    (entry) => entry.location_id && entry.locations,
  );

  if (!location?.locations) return null;

  return (
    <section
      aria-labelledby="trust-first-practical"
      className="rounded-[var(--radius-xl)] border border-border bg-card p-5 sm:p-7"
      id="location"
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Plan your visit
      </p>
      <h2 className="mt-1 text-2xl font-bold" id="trust-first-practical">
        Practical information
      </h2>
      {location?.locations && location.location_id ? (
        <div className="mt-4">
          <LocationImage
            className="mb-4 w-full"
            location={location.locations}
            sizes="(min-width: 640px) 640px, calc(100vw - 64px)"
          />
          <h3 className="font-bold">
            {location.locations.business_name?.trim() || "Practice location"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {location.locations.full_address?.trim() ||
              [
                location.locations.area,
                location.locations.city,
                location.locations.country,
              ]
                .filter(Boolean)
                .join(", ")}
          </p>
          <div className="mt-4">
            <LocationMapModal
              contact={{
                bookingEnabled: profile.dentistry.booking_link_enabled,
                bookingLink: profile.dentistry.booking_link,
                email: profile.dentistry.contact_email,
                phone: profile.dentistry.phone,
              }}
              location={location.locations}
              locationId={location.location_id}
              position={1}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function TrustFirstFamilyProfileTemplate({
  profile,
  username,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const { dentistry, user } = profile;
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["trust-first-family-practice"];
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const heroImage = profile.generalGalleries.find(({ image_url }) =>
    Boolean(image_url?.trim()),
  );
  const blogGroups = selectTrustFirstBlogGroups(profile.blogGroups);

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[661px] bg-background px-4 pb-12 pt-4 text-foreground sm:px-8 sm:pb-16 sm:pt-8"
      data-profile-template="trust-first-family-practice"
    >
      <div className="space-y-7 sm:space-y-9">
        <section aria-labelledby="trust-first-name" id="profile">
          {heroImage ? (
            <div className="relative aspect-[5/3] overflow-hidden rounded-[var(--radius-xl)] bg-muted shadow-[var(--elevation-card)] sm:aspect-[16/9]">
              <SafeImage
                alt={heroImage.title?.trim() || "A calm family dental visit"}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 760px) 100vw, 696px"
                src={heroImage.image_url!}
              />
            </div>
          ) : null}
          <div className={heroImage ? "px-1 pt-5 sm:px-3" : "pt-3"}>
            {user.position?.trim() ? (
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {user.position}
              </p>
            ) : null}
            <h1
              className="mt-2 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl"
              id="trust-first-name"
            >
              {dentistry.about_title?.trim() || displayName || "Dental profile"}
            </h1>
            {dentistry.about_text?.trim() ? (
              <p className="mt-3 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {dentistry.about_text}
              </p>
            ) : null}
            <div className="mt-3 [&_a]:flex [&_a]:size-11 [&_a]:items-center [&_a]:justify-center [&_a]:p-0">
              <DirectBookingSocialLinks
                socials={profile.socials}
                website={dentistry.website}
              />
            </div>
            <div className="mt-5">
              <BookingActions profile={profile} />
            </div>
          </div>
        </section>

        <ReviewProof answers={answers} profile={profile} />
        <TeamCard profile={profile} />
        <FamilyServices profile={profile} />
        <PracticalInformation profile={profile} />
        <TrustFirstResources linkGroups={profile.linkGroups} />
        <TrustFirstBlogSection groups={blogGroups} username={username} />
        <div className="border-t border-border pt-5">
          <BookingActions profile={profile} />
        </div>
      </div>
    </main>
  );
}
