import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import { selectProfileGallery } from "../_lib/profile-gallery";
import { selectProfileProducts } from "../_lib/profile-products";
import { selectProfileTreatmentServices } from "../_lib/profile-treatment-services";
import { selectProfileVideos } from "../_lib/profile-videos";
import {
  selectSpecialistActions,
  selectSpecialistBlogGroups,
  selectSpecialistContactActions,
  selectSpecialistResources,
  type SpecialistAction,
  type SpecialistResource,
} from "../_lib/specialist-assessment-template";
import WorkLocation from "../components/WorkLocation";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import ProfileGallerySection from "./ProfileGallerySection";
import ProfileLinksSection from "./ProfileLinksSection";
import ProfileProductSection from "./ProfileProductSection";
import ProfileReviewsSection from "./ProfileReviewsSection";
import ProfileTreatmentServiceSections from "./ProfileTreatmentServiceSections";
import ProfileVideoSections from "./ProfileVideoSections";
import SpecialistBlogSection from "./SpecialistBlogSection";

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
        {resource.title}
      </h2>
      <div className="mt-4">
        <ResourceLink resource={resource} />
      </div>
    </section>
  );
}

export default function SpecialistAssessmentProfileTemplate({
  profile,
  username,
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
  const blogGroups = selectSpecialistBlogGroups(profile.blogGroups);
  const gallery = selectProfileGallery(
    profile.galleries,
    profile.generalGalleries,
  );
  const urgent = resources.find(({ kind }) => kind === "emergency");
  const showUrgentFirst =
    answers.referralRequired === false && answers.showEmergencyFirst === true;
  const { user, dentistry } = profile;
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const credentials = [user.position, user.qualification]
    .filter((part) => part?.trim())
    .join(" · ");
  const inventory = selectProfileTreatmentServices(profile.treatments);
  const products = selectProfileProducts(profile.products);
  const videoGroups = selectProfileVideos(profile.videoGroups);

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[661px] bg-background px-4 pb-12 pt-5 text-foreground sm:px-8 sm:pb-16 sm:pt-9"
      data-profile-template="specialist-assessment"
    >
      <div className="space-y-7 sm:space-y-9">
        <section aria-labelledby="specialist-name" id="profile">
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
              <div className="mt-2 [&_a]:flex [&_a]:size-11 [&_a]:items-center [&_a]:justify-center [&_a]:p-0">
                <DirectBookingSocialLinks
                  socials={profile.socials}
                  website={dentistry.website}
                />
              </div>
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
                {answers.referralRequired
                  ? "Referral required"
                  : "No referral required"}
              </p>
            </div>
          </div>
        </section>

        {showUrgentFirst ? <UrgentGuidance resource={urgent} /> : null}
        <ProfileTreatmentServiceSections
          inventory={inventory}
          moduleId="specialist-assessment"
          serviceTitle={dentistry.service_section_title}
          treatmentTitle={dentistry.treatment_section_title}
          variant="compact-grid"
        />
        <ProfileReviewsSection
          externalReviewPages={profile.externalReviewPages}
          externalReviewSectionTitle={dentistry.external_review_section_title}
          reviews={profile.reviews}
          templateId="specialist-assessment"
        />
        {!showUrgentFirst ? <UrgentGuidance resource={urgent} /> : null}

        <ProfileGallerySection
          cases={gallery.cases}
          generalImages={gallery.generalImages}
          moduleId="specialist-assessment-gallery"
        />

        <ProfileLinksSection
          linkGroups={profile.linkGroups}
          moduleId="specialist-assessment"
          variant="grid"
        />

        <SpecialistBlogSection groups={blogGroups} username={username} />
        <ProfileVideoSections groups={videoGroups} />
        <ProfileProductSection products={products} />
        <WorkLocation
          dentistry={profile.dentistry}
          serverLocations={profile.locations}
        />

        <section
          aria-labelledby="specialist-contact-title"
          className="border-t border-border pt-7 text-center"
        >
          <h2
            className="text-xl font-bold text-foreground"
            id="specialist-contact-title"
          >
            Contact
          </h2>
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
