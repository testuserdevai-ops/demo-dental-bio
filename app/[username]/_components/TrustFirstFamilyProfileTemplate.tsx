import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import { selectProfileGallery } from "../_lib/profile-gallery";
import { selectProfileProducts } from "../_lib/profile-products";
import { selectProfileTreatmentServices } from "../_lib/profile-treatment-services";
import { selectProfileVideos } from "../_lib/profile-videos";
import {
  normalizeTrustFirstHttpUrl,
  selectTrustFirstBlogGroups,
} from "../_lib/trust-first-template";
import WorkLocation from "../components/WorkLocation";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import ProfileGallerySection from "./ProfileGallerySection";
import ProfileLinksSection from "./ProfileLinksSection";
import ProfileProductSection from "./ProfileProductSection";
import ProfileReviewsSection from "./ProfileReviewsSection";
import ProfileTreatmentServiceSections from "./ProfileTreatmentServiceSections";
import ProfileVideoSections from "./ProfileVideoSections";
import TrustFirstBlogSection from "./TrustFirstBlogSection";

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

function PracticalInformation({
  profile,
}: {
  profile: PublicProfileViewModel;
}) {
  return (
    <div className="space-y-4" data-trust-first-section="practical">
      <section
        aria-labelledby="trust-first-practical"
        className="rounded-[var(--radius-xl)] border border-border bg-card p-5 sm:p-7"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Plan your visit
        </p>
        <h2 className="mt-1 text-2xl font-bold" id="trust-first-practical">
          Practical information
        </h2>
      </section>
      <WorkLocation
        dentistry={profile.dentistry}
        serverLocations={profile.locations}
      />
    </div>
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
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const gallery = selectProfileGallery(
    profile.galleries,
    profile.generalGalleries,
  );
  const heroImage = gallery.generalImages[0];
  const blogGroups = selectTrustFirstBlogGroups(profile.blogGroups);
  const inventory = selectProfileTreatmentServices(profile.treatments);
  const products = selectProfileProducts(profile.products);
  const videoGroups = selectProfileVideos(profile.videoGroups);

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
                alt={heroImage.title}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 760px) 100vw, 696px"
                src={heroImage.imageUrl}
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

        <ProfileReviewsSection
          externalReviewPages={profile.externalReviewPages}
          externalReviewSectionTitle={dentistry.external_review_section_title}
          reviews={profile.reviews}
          templateId="trust-first-family-practice"
        />
        <TeamCard profile={profile} />
        <ProfileTreatmentServiceSections
          inventory={inventory}
          moduleId="trust-first-family-practice"
          serviceTitle={dentistry.service_section_title}
          treatmentTitle={dentistry.treatment_section_title}
          variant="card-grid"
        />
        <ProfileGallerySection
          cases={gallery.cases}
          generalImages={gallery.generalImages}
          moduleId="trust-first-family-practice-gallery"
        />
        <ProfileVideoSections groups={videoGroups} />
        <ProfileProductSection products={products} />
        <PracticalInformation profile={profile} />
        <ProfileLinksSection
          linkGroups={profile.linkGroups}
          moduleId="trust-first-family-practice"
        />
        <TrustFirstBlogSection groups={blogGroups} username={username} />
        <div className="border-t border-border pt-5">
          <BookingActions profile={profile} />
        </div>
      </div>
    </main>
  );
}
