import { CheckCircle, Sparkle } from "@phosphor-icons/react/dist/ssr";

import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import {
  selectCosmeticConsultationAction,
  selectCosmeticBlogGroups,
  selectCosmeticGalleries,
  selectCosmeticGeneralGalleries,
  selectFeaturedCosmeticReviews,
  selectSignatureTreatment,
} from "../_lib/cosmetic-transformation-template";
import Links from "../components/Links";
import LocationMapModal from "../components/LocationMapModal";
import LocationImage from "../components/LocationImage";
import ReadOnlyRating from "../components/ReadOnlyRating";
import CosmeticCaseGallery from "./CosmeticCaseGallery";
import CosmeticBlogSection from "./CosmeticBlogSection";
import CosmeticGeneralGallery from "./CosmeticGeneralGallery";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";

function ConsultationAction({
  action,
}: {
  action: NonNullable<ReturnType<typeof selectCosmeticConsultationAction>>;
}) {
  return (
    <TrackedLink
      analytics={action.analytics}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-6 py-3 text-center text-base font-bold text-[var(--profile-on-primary-action)] no-underline shadow-[var(--elevation-card)] transition-colors hover:bg-[var(--profile-primary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring active:bg-[var(--profile-primary-action-active)]"
      href={action.href}
      rel={action.external ? "noopener noreferrer" : undefined}
      target={action.external ? "_blank" : undefined}
    >
      <Sparkle aria-hidden="true" size={20} weight="fill" />
      {action.label}
      {action.external ? (
        <span className="sr-only"> (opens in a new tab)</span>
      ) : null}
    </TrackedLink>
  );
}

function SignatureTreatment({
  sectionTitle,
  treatment,
}: {
  sectionTitle: string;
  treatment: NonNullable<ReturnType<typeof selectSignatureTreatment>>;
}) {
  const details = treatment.treatments;
  if (!details) return null;

  return (
    <section
      aria-labelledby="cosmetic-signature-treatment"
      className="rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm sm:p-7"
      id="treatments"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--profile-secondary-action)] text-[var(--profile-on-secondary-action)]">
          <Sparkle aria-hidden="true" size={23} weight="fill" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Signature treatment
          </p>
          <h2
            className="mt-1 text-balance text-2xl font-bold text-card-foreground"
            id="cosmetic-signature-treatment"
          >
            {sectionTitle}
          </h2>
          <h3 className="mt-3 text-lg font-bold text-card-foreground">
            {details.title?.trim() || "Personalised smile treatment"}
          </h3>
          {details.description?.trim() ? (
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {details.description}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ReviewCards({
  reviews,
}: {
  reviews: ReturnType<typeof selectFeaturedCosmeticReviews>;
}) {
  if (reviews.length === 0) return null;

  return (
    <section
      aria-labelledby="cosmetic-reviews"
      className="space-y-4"
      id="review"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Patient experiences
        </p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          id="cosmetic-reviews"
        >
          Feel confident in your next step
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {reviews.map((review) => (
          <article
            className="rounded-[var(--radius-md)] border border-border bg-card p-5"
            key={review.id}
          >
            {review.stars ? <ReadOnlyRating value={review.stars} /> : null}
            <blockquote className="mt-3 text-sm leading-6 text-card-foreground">
              “{review.content}”
            </blockquote>
            <p className="mt-4 text-xs font-bold text-muted-foreground">
              {review.reviewer_name?.trim() || "Verified patient"}
              {review.platform?.trim() ? ` · ${review.platform}` : ""}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TreatmentOptions({
  profile,
  signatureId,
}: {
  profile: PublicProfileViewModel;
  signatureId: string | null;
}) {
  const treatments = profile.treatments
    .filter(
      ({ treatment_id, treatments }) =>
        treatment_id !== signatureId &&
        treatments &&
        treatments.isService !== true,
    )
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 4);

  if (treatments.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {treatments.map(({ treatment_id, treatments }) => (
          <article
            className="flex gap-3 rounded-[var(--radius-md)] border border-border bg-card p-4"
            key={treatment_id}
          >
            <CheckCircle
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[var(--profile-primary-action)]"
              size={22}
              weight="fill"
            />
            <div>
              <h3 className="font-bold text-card-foreground">
                {treatments?.title?.trim() || "Cosmetic consultation"}
              </h3>
              {treatments?.description?.trim() ? (
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {treatments.description}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LocationFinish({ profile }: { profile: PublicProfileViewModel }) {
  const location = profile.locations.find(({ locations }) =>
    Boolean(locations),
  );
  if (!location?.locations || !location.location_id) return null;
  const details = location.locations;
  const label =
    details.business_name?.trim() ||
    profile.dentistry.location_title?.trim() ||
    "Practice location";
  const address =
    details.full_address?.trim() ||
    [details.area, details.city, details.country].filter(Boolean).join(", ");

  return (
    <section
      aria-labelledby="cosmetic-location"
      className="rounded-[var(--radius-lg)] border border-border bg-card p-5 sm:p-7"
      id="location"
    >
      <LocationImage
        className="mb-5 w-full"
        location={details}
        sizes="(min-width: 640px) 640px, calc(100vw - 64px)"
      />
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Visit the practice
          </p>
          <h2
            className="mt-1 text-xl font-bold text-card-foreground"
            id="cosmetic-location"
          >
            {label}
          </h2>
          {address ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {address}
            </p>
          ) : null}
        </div>
        <LocationMapModal
          contact={{
            bookingEnabled: profile.dentistry.booking_link_enabled,
            bookingLink: profile.dentistry.booking_link,
            email: profile.dentistry.contact_email,
            phone: profile.dentistry.phone,
          }}
          location={details}
          locationId={location.location_id}
          position={1}
        />
      </div>
    </section>
  );
}

export default function CosmeticTransformationProfileTemplate({
  profile,
  username,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const { user, dentistry } = profile;
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["cosmetic-transformation"];
  const action = selectCosmeticConsultationAction(
    answers,
    dentistry,
    profile.linkGroups,
  );
  const signature = selectSignatureTreatment(answers, profile.treatments);
  const galleries = selectCosmeticGalleries(answers, profile.galleries);
  const generalGalleries = selectCosmeticGeneralGalleries(
    profile.generalGalleries,
  );
  const reviews = selectFeaturedCosmeticReviews(answers, profile.reviews);
  const blogGroups = selectCosmeticBlogGroups(profile.blogGroups);
  const hero = generalGalleries[0];
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const authority = [user.position, user.qualification]
    .filter((part) => part?.trim())
    .join(" · ");
  const isHeroOverlap =
    profile.presentation.configuration.layoutVariant === "hero-overlap";

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[661px] overflow-x-clip bg-background pb-12 text-foreground sm:px-8 sm:py-10"
      data-profile-template="cosmetic-transformation"
    >
      <div className="space-y-8 sm:space-y-10">
        <section
          aria-labelledby="cosmetic-name"
          className={isHeroOverlap ? undefined : "px-4 pt-4 sm:px-0 sm:pt-0"}
          data-cosmetic-hero={isHeroOverlap ? "overlap" : "card"}
          id="profile"
        >
          {hero?.image_url ? (
            <div
              className={`relative aspect-[16/9] max-h-[270px] overflow-hidden bg-muted ${
                isHeroOverlap
                  ? "sm:rounded-[var(--radius-xl)]"
                  : "rounded-[var(--radius-lg)]"
              }`}
            >
              <SafeImage
                alt={hero.title?.trim() || "A welcoming cosmetic dental studio"}
                className="object-cover"
                fill
                priority
                sizes="(min-width: 661px) 597px, 100vw"
                src={hero.image_url}
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
            </div>
          ) : null}

          <div className={isHeroOverlap ? "px-4 sm:px-0" : undefined}>
            <div
              className={
                hero?.image_url && isHeroOverlap
                  ? "relative -mt-12 flex items-end gap-4 sm:-mt-14 sm:px-6"
                  : "flex items-end gap-4 pt-6"
              }
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-[1.75rem] border-4 border-background bg-muted shadow-[var(--elevation-card)] sm:size-28">
                <SafeImage
                  alt={
                    displayName
                      ? `Portrait of ${displayName}`
                      : "Profile portrait"
                  }
                  className="object-cover"
                  fill
                  priority
                  sizes="112px"
                  src={profile.profileImageUrl}
                />
              </div>
              <div className="min-w-0 pb-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Cosmetic dentistry
                </p>
                <h1
                  className="mt-1 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-4xl"
                  id="cosmetic-name"
                >
                  {displayName || "Dental professional"}
                </h1>
              </div>
            </div>

            <div className="mt-4 sm:px-6">
              {authority ? (
                <p className="text-sm font-semibold text-muted-foreground sm:text-base">
                  {authority}
                </p>
              ) : null}
              {dentistry.about_title?.trim() ? (
                <p className="mt-2 max-w-2xl text-pretty text-base leading-7 text-foreground sm:text-lg">
                  {dentistry.about_title}
                </p>
              ) : null}
              {dentistry.about_text?.trim() ? (
                <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
                  {dentistry.about_text}
                </p>
              ) : null}
              <div className="mt-3 [&_a]:flex [&_a]:size-11 [&_a]:items-center [&_a]:justify-center [&_a]:p-0">
                <DirectBookingSocialLinks
                  socials={profile.socials}
                  website={dentistry.website}
                />
              </div>
              {action ? (
                <div className="mt-4 max-w-xl">
                  <ConsultationAction action={action} />
                </div>
              ) : (
                <div className="mt-4 max-w-xl rounded-[var(--radius-md)] border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
                  Consultation details are being prepared. Please check back
                  soon.
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="space-y-8 px-4 sm:space-y-10 sm:px-0">
          {signature ? (
            <SignatureTreatment
              sectionTitle={dentistry.treatment_section_title}
              treatment={signature}
            />
          ) : null}
          <CosmeticCaseGallery cases={galleries} />
          <CosmeticGeneralGallery
            caseCount={galleries.length}
            images={generalGalleries}
          />
          <ReviewCards reviews={reviews} />
          <TreatmentOptions
            profile={profile}
            signatureId={signature?.treatment_id ?? null}
          />
          <div className="text-foreground [&_h1]:!text-foreground">
            <Links serverLinkGroups={profile.linkGroups} />
          </div>

          <CosmeticBlogSection groups={blogGroups} username={username} />

          <LocationFinish profile={profile} />
        </div>
      </div>
    </main>
  );
}
