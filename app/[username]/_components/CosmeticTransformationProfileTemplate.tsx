import { Sparkle } from "@phosphor-icons/react/dist/ssr";

import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import {
  selectCosmeticConsultationAction,
  selectCosmeticBlogGroups,
  selectCosmeticGalleries,
  selectCosmeticGeneralGalleries,
} from "../_lib/cosmetic-transformation-template";
import { selectProfileTreatmentServices } from "../_lib/profile-treatment-services";
import type { ProfileProduct } from "../_lib/profile-products";
import type { ProfileVideoGroup } from "../_lib/profile-videos";
import Links from "../components/Links";
import WorkLocation from "../components/WorkLocation";
import CosmeticCaseGallery from "./CosmeticCaseGallery";
import CosmeticBlogSection from "./CosmeticBlogSection";
import CosmeticGeneralGallery from "./CosmeticGeneralGallery";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import ProfileReviewsSection from "./ProfileReviewsSection";
import ProfileTreatmentServiceSections from "./ProfileTreatmentServiceSections";
import ProfileProductSection from "./ProfileProductSection";
import ProfileVideoSections from "./ProfileVideoSections";

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
  const inventory = selectProfileTreatmentServices(profile.treatments);
  const galleries = selectCosmeticGalleries(answers, profile.galleries);
  const generalGalleries = selectCosmeticGeneralGalleries(
    profile.generalGalleries,
  );
  const blogGroups = selectCosmeticBlogGroups(profile.blogGroups);
  const products = profile.products as ProfileProduct[];
  const videos = profile.videoGroups as ProfileVideoGroup[];
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
          <ProfileTreatmentServiceSections
            inventory={inventory}
            moduleId="cosmetic-transformation"
            serviceTitle={dentistry.service_section_title}
            treatmentTitle={dentistry.treatment_section_title}
            variant="accent-grid"
          />
          <CosmeticCaseGallery cases={galleries} />
          <CosmeticGeneralGallery
            caseCount={galleries.length}
            images={generalGalleries}
          />
          <ProfileReviewsSection
            externalReviewPages={profile.externalReviewPages}
            reviews={profile.reviews}
            templateId="cosmetic-transformation"
          />
          <div className="text-foreground [&_h1]:!text-foreground">
            <Links serverLinkGroups={profile.linkGroups} />
          </div>

          <CosmeticBlogSection groups={blogGroups} username={username} />
          <ProfileVideoSections groups={videos} />
          <ProfileProductSection products={products} />
          <WorkLocation
            dentistry={dentistry}
            serverLocations={profile.locations}
          />
        </div>
      </div>
    </main>
  );
}
