import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import {
  getSpecialistReferralMessage,
  selectSpecialistActions,
  selectSpecialistContactActions,
  selectSpecialistResources,
  type SpecialistAction,
  type SpecialistResource,
} from "../_lib/specialist-assessment-template";
import LocationMapModal from "../components/LocationMapModal";
import ReadOnlyRating from "../components/ReadOnlyRating";

function ActionLink({
  action,
  emphasis,
}: {
  action: SpecialistAction;
  emphasis: "primary" | "secondary" | "quiet";
}) {
  const className = {
    primary:
      "inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-5 py-3 text-center text-base font-bold text-[var(--profile-on-primary-action)] no-underline shadow-[var(--elevation-card)] transition-colors hover:bg-[var(--profile-primary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
    secondary:
      "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-full)] border border-border bg-[var(--profile-secondary-action)] px-5 py-2.5 text-center text-sm font-bold text-[var(--profile-on-secondary-action)] no-underline transition-colors hover:bg-[var(--profile-secondary-action-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
    quiet:
      "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-full)] border border-border bg-card px-4 py-2.5 text-center text-sm font-semibold text-card-foreground no-underline transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:w-auto",
  }[emphasis];

  return (
    <TrackedLink
      analytics={action.analytics}
      className={className}
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

function ResourceLink({ resource }: { resource: SpecialistResource }) {
  return (
    <TrackedLink
      analytics={{
        section: "links",
        position: resource.position,
        action: {
          type: "link_click",
          linkId: resource.id,
          groupId: resource.groupId,
        },
      }}
      className="group grid min-h-11 grid-cols-[1fr_auto] items-center gap-3 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-card-foreground no-underline transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      href={resource.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span>{resource.title}</span>
      <span aria-hidden="true" className="text-muted-foreground">
        ↗
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </TrackedLink>
  );
}

function UrgentGuidance({ resource }: { resource?: SpecialistResource }) {
  if (!resource) return null;

  return (
    <section
      aria-labelledby="specialist-urgent-title"
      className="rounded-[var(--radius-lg)] border border-amber-300 bg-amber-50 p-5 text-slate-950"
      data-specialist-section="urgent"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
        Need help sooner?
      </p>
      <h2 className="mt-1 text-xl font-bold" id="specialist-urgent-title">
        Urgent and aftercare guidance
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Use the specialist team&apos;s current guidance for symptoms, aftercare,
        and who to contact. For a life-threatening emergency, use your local
        emergency service.
      </p>
      <div className="mt-4">
        <ResourceLink resource={resource} />
      </div>
    </section>
  );
}

function TreatmentSummary({ profile }: { profile: PublicProfileViewModel }) {
  const treatments = profile.treatments
    .filter(({ treatments }) => treatments && treatments.isService !== true)
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);
  if (treatments.length === 0) return null;

  return (
    <section aria-labelledby="specialist-treatments-title">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        Specialist focus
      </p>
      <h2
        className="mt-1 text-2xl font-bold text-foreground"
        id="specialist-treatments-title"
      >
        Reasons patients seek an assessment
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {treatments.map((treatment) => (
          <article
            className="rounded-[var(--radius-md)] border border-border bg-card p-4"
            data-treatment-id={treatment.treatment_id}
            key={treatment.treatment_id}
          >
            <h3 className="text-base font-bold text-card-foreground">
              {treatment.treatments?.title?.trim() || "Specialist care"}
            </h3>
            {treatment.treatments?.description?.trim() ? (
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
                {treatment.treatments.description}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function AssessmentSteps() {
  const steps = [
    ["1", "Share your concern", "Tell the team what is troubling you."],
    ["2", "Send useful records", "Add referral notes or recent imaging."],
    ["3", "Get the right next step", "The team confirms how to proceed."],
  ] as const;

  return (
    <section
      aria-labelledby="specialist-process-title"
      className="rounded-[var(--radius-lg)] bg-muted p-5 sm:p-6"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        What happens next
      </p>
      <h2
        className="mt-1 text-2xl font-bold text-foreground"
        id="specialist-process-title"
      >
        A clear route to specialist advice
      </h2>
      <ol className="mt-5 grid gap-4 sm:grid-cols-3">
        {steps.map(([number, title, detail]) => (
          <li className="grid grid-cols-[2.25rem_1fr] gap-3" key={number}>
            <span className="grid size-9 place-items-center rounded-full bg-[var(--profile-primary-action)] text-sm font-bold text-[var(--profile-on-primary-action)]">
              {number}
            </span>
            <span>
              <strong className="block text-sm text-foreground">{title}</strong>
              <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                {detail}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ClinicalImage({ profile }: { profile: PublicProfileViewModel }) {
  const image = profile.generalGalleries.find(({ image_url }) =>
    Boolean(image_url?.trim()),
  );
  if (!image?.image_url) return null;

  return (
    <figure className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card">
      <div className="relative aspect-[16/9] bg-muted">
        <SafeImage
          alt={image.title?.trim() || "Specialist consultation setting"}
          className="object-cover"
          fill
          sizes="(max-width: 720px) calc(100vw - 32px), 688px"
          src={image.image_url}
        />
      </div>
      {image.title?.trim() ? (
        <figcaption className="px-4 py-3 text-sm text-muted-foreground">
          {image.title}
        </figcaption>
      ) : null}
    </figure>
  );
}

function ReviewSummary({ profile }: { profile: PublicProfileViewModel }) {
  const scored = profile.reviews.filter(
    ({ stars }) => typeof stars === "number" && Number.isFinite(stars),
  );
  if (scored.length === 0) return null;

  const score =
    scored.reduce((sum, review) => sum + (review.stars ?? 0), 0) /
    scored.length;
  const quote = scored.find(({ content }) => content?.trim());

  return (
    <section
      aria-labelledby="specialist-reviews-title"
      className="rounded-[var(--radius-lg)] border border-border bg-card p-5 text-center sm:p-6"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        Patient confidence
      </p>
      <h2
        className="mt-1 text-xl font-bold text-card-foreground"
        id="specialist-reviews-title"
      >
        Clear explanations from the first step
      </h2>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xl font-bold text-card-foreground">
          {score.toFixed(1)}
        </span>
        <ReadOnlyRating value={score} />
        <span className="text-sm text-muted-foreground">
          {scored.length} {scored.length === 1 ? "review" : "reviews"}
        </span>
      </div>
      {quote?.content?.trim() ? (
        <blockquote className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-6 text-muted-foreground">
          “{quote.content.trim()}”
        </blockquote>
      ) : null}
    </section>
  );
}

function LocationSummary({ profile }: { profile: PublicProfileViewModel }) {
  const location = profile.locations.find(
    ({ location_id, locations }) => location_id && locations,
  );
  if (!location?.location_id || !location.locations) return null;

  const label =
    location.locations.business_name?.trim() || "Specialist practice";
  const address =
    location.locations.full_address?.trim() ||
    [
      location.locations.area,
      location.locations.city,
      location.locations.country,
    ]
      .filter(Boolean)
      .join(", ");

  return (
    <section
      aria-labelledby="specialist-location-title"
      className="rounded-[var(--radius-lg)] border border-border bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-6"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Your consultation
        </p>
        <h2
          className="mt-1 text-xl font-bold text-card-foreground"
          id="specialist-location-title"
        >
          {label}
        </h2>
        {address ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {address}
          </p>
        ) : null}
      </div>
      <div className="mt-4 sm:mt-0 sm:shrink-0">
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
    </section>
  );
}

export default function SpecialistAssessmentProfileTemplate({
  profile,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["specialist-assessment"];
  const resources = selectSpecialistResources(profile.linkGroups);
  const actions = selectSpecialistActions(
    answers,
    profile.dentistry,
    resources,
  );
  const contacts = selectSpecialistContactActions(profile.dentistry);
  const referral = getSpecialistReferralMessage(answers);
  const urgent = resources.find(({ kind }) => kind === "emergency");
  const routineResources = resources.filter(({ kind }) =>
    ["insurance", "referral", "faq"].includes(kind),
  );
  const showUrgentFirst =
    answers.referralRequired === false && answers.showEmergencyFirst === true;
  const { user, dentistry } = profile;
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const credentials = [user.position, user.qualification]
    .filter((part) => part?.trim())
    .join(" · ");

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[760px] bg-background px-4 pb-12 pt-5 text-foreground sm:px-8 sm:pb-16 sm:pt-9"
      data-profile-template="specialist-assessment"
    >
      <div className="space-y-7 sm:space-y-9">
        <section aria-labelledby="specialist-name">
          <div className="grid grid-cols-[5.5rem_1fr] items-center gap-4 sm:grid-cols-[7rem_1fr] sm:gap-6">
            <div className="relative aspect-square overflow-hidden rounded-[1.5rem] border-4 border-card bg-muted shadow-[var(--elevation-card)]">
              <SafeImage
                alt={
                  displayName
                    ? `Portrait of ${displayName}`
                    : "Specialist portrait"
                }
                className="object-cover"
                fill
                priority
                sizes="112px"
                src={profile.profileImageUrl}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Specialist assessment
              </p>
              <h1
                className="mt-1 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-4xl"
                id="specialist-name"
              >
                {displayName || "Dental specialist"}
              </h1>
              {credentials ? (
                <p className="mt-1 text-sm font-semibold leading-5 text-muted-foreground sm:text-base">
                  {credentials}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm sm:p-6">
            <h2 className="text-balance text-xl font-bold text-card-foreground sm:text-2xl">
              {dentistry.about_title?.trim() ||
                "Find the right next step for specialist care"}
            </h2>
            {dentistry.about_text?.trim() ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                {dentistry.about_text}
              </p>
            ) : null}
            <div
              aria-label="Specialist assessment actions"
              className="mt-4 space-y-2.5"
            >
              {actions.primary ? (
                <ActionLink action={actions.primary} emphasis="primary" />
              ) : null}
              {actions.secondary ? (
                <ActionLink action={actions.secondary} emphasis="secondary" />
              ) : null}
            </div>
            <div className="mt-4 rounded-[var(--radius-md)] bg-muted px-4 py-3">
              <p className="text-sm font-bold text-foreground">
                {referral.title}
              </p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {referral.detail}
              </p>
            </div>
          </div>
        </section>

        {showUrgentFirst ? <UrgentGuidance resource={urgent} /> : null}
        <TreatmentSummary profile={profile} />
        <AssessmentSteps />
        <ClinicalImage profile={profile} />
        <ReviewSummary profile={profile} />
        {!showUrgentFirst ? <UrgentGuidance resource={urgent} /> : null}

        {routineResources.length > 0 ? (
          <section aria-labelledby="specialist-resources-title">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Prepare with confidence
            </p>
            <h2
              className="mt-1 text-2xl font-bold text-foreground"
              id="specialist-resources-title"
            >
              Referral, fees, and common questions
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {routineResources.map((resource) => (
                <ResourceLink key={resource.id} resource={resource} />
              ))}
            </div>
          </section>
        ) : null}

        <LocationSummary profile={profile} />

        <section
          aria-labelledby="specialist-contact-title"
          className="border-t border-border pt-7 text-center"
        >
          <h2
            className="text-xl font-bold text-foreground"
            id="specialist-contact-title"
          >
            Still unsure where to start?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Contact the specialist team and they will help you choose the right
            route.
          </p>
          <div className="mx-auto mt-4 flex max-w-lg flex-col gap-2 sm:flex-row sm:justify-center">
            {contacts.map((action) => (
              <ActionLink action={action} emphasis="quiet" key={action.kind} />
            ))}
          </div>
          {actions.primary ? (
            <div className="mx-auto mt-4 max-w-lg">
              <ActionLink action={actions.primary} emphasis="primary" />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
