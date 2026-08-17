import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import type { PublicProfileViewModel } from "../_lib/public-profile";
import { selectProfileGallery } from "../_lib/profile-gallery";
import { selectProfileTreatmentServices } from "../_lib/profile-treatment-services";
import {
  normalizeExpertHttpUrl,
  selectExpertBlogGroups,
} from "../_lib/expert-educator-template";
import LocationMapModal from "../components/LocationMapModal";
import LocationImage from "../components/LocationImage";
import { DirectBookingSocialLinks } from "./DirectBookingSocialLinks";
import ExpertBlogSection from "./ExpertBlogSection";
import ProfileGallerySection from "./ProfileGallerySection";
import ProfileLinksSection from "./ProfileLinksSection";
import ProfileReviewsSection from "./ProfileReviewsSection";
import ProfileTreatmentServiceSections from "./ProfileTreatmentServiceSections";

function ConsultationAction({ profile }: { profile: PublicProfileViewModel }) {
  const bookingHref = profile.dentistry.booking_link_enabled
    ? normalizeExpertHttpUrl(profile.dentistry.booking_link)
    : null;
  const email = profile.dentistry.contact_email?.trim();
  const href = bookingHref ?? (email ? `mailto:${email}` : null);

  if (!href) return null;

  const isBooking = Boolean(bookingHref);
  return (
    <TrackedLink
      analytics={
        isBooking
          ? [
              { section: "profile", action: { type: "booking_click" } },
              {
                section: "profile",
                action: { type: "cta_click", ctaType: "booking" },
              },
            ]
          : [
              { section: "profile", action: { type: "email_click" } },
              {
                section: "profile",
                action: { type: "cta_click", ctaType: "email" },
              },
            ]
      }
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-full)] bg-[var(--profile-primary-action)] px-6 py-3 text-center text-base font-bold text-[var(--profile-on-primary-action)] no-underline shadow-[var(--elevation-card)] hover:bg-[var(--profile-primary-action-hover)] sm:w-auto"
      href={href}
      rel={isBooking ? "noopener noreferrer" : undefined}
      target={isBooking ? "_blank" : undefined}
    >
      Request a consultation
      <ArrowRight aria-hidden="true" size={19} weight="bold" />
      {isBooking ? (
        <span className="sr-only"> (opens in a new tab)</span>
      ) : null}
    </TrackedLink>
  );
}

function ProfessionalEnquiryAction({
  profile,
}: {
  profile: PublicProfileViewModel;
}) {
  const email = profile.dentistry.contact_email?.trim();
  if (!email) return null;

  return (
    <TrackedLink
      analytics={[
        { section: "profile", action: { type: "email_click" } },
        {
          section: "profile",
          action: { type: "cta_click", ctaType: "email" },
        },
      ]}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-full)] border border-border bg-[var(--profile-secondary-action)] px-5 py-3 text-center text-sm font-bold text-[var(--profile-on-secondary-action)] no-underline hover:bg-[var(--profile-secondary-action-hover)] sm:w-auto"
      href={`mailto:${email}?subject=Speaking%20or%20collaboration%20enquiry`}
    >
      Speaking &amp; collaboration
    </TrackedLink>
  );
}

export default function ExpertEducatorProfileTemplate({
  username,
  profile,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const { dentistry, user } = profile;
  const blogGroups = selectExpertBlogGroups(profile.blogGroups);
  const gallery = selectProfileGallery(
    profile.galleries,
    profile.generalGalleries,
  );
  const inventory = selectProfileTreatmentServices(profile.treatments);
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const credentials = user.qualification?.trim();
  const location = profile.locations.find(({ locations }) =>
    Boolean(locations),
  );

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[661px] overflow-x-clip bg-background px-4 pb-12 pt-2 text-foreground sm:px-8 sm:pb-16 sm:pt-8"
      data-profile-template="expert-educator"
    >
      <div className="space-y-8 sm:space-y-10">
        <section
          aria-labelledby="expert-name"
          className="rounded-[var(--radius-xl)] border border-border bg-card p-4 shadow-[var(--elevation-card)] sm:p-8"
          id="profile"
        >
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-5">
            <div className="relative mx-auto aspect-square w-24 overflow-hidden rounded-[var(--radius-lg)] bg-muted sm:w-36">
              <SafeImage
                alt={
                  displayName
                    ? `Portrait of ${displayName}`
                    : "Clinical educator portrait"
                }
                className="object-cover"
                fill
                priority
                sizes="144px"
                src={profile.profileImageUrl}
              />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {user.position?.trim() || "Professional profile"}
              </p>
              <h1
                className="mt-1 text-balance text-3xl font-bold tracking-tight sm:mt-2 sm:text-4xl"
                id="expert-name"
              >
                {displayName || "Dental educator"}
              </h1>
              {credentials ? (
                <p className="mt-1 text-sm font-semibold text-muted-foreground sm:mt-2 sm:text-base">
                  {credentials}
                </p>
              ) : null}
              {user.gdc_no?.trim() ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  GDC {user.gdc_no}
                </p>
              ) : null}
              <div className="mt-2 flex justify-center [&_a]:!inline-flex [&_a]:!size-11 [&_a]:items-center [&_a]:justify-center [&_a]:!p-0 sm:mt-3 sm:justify-start">
                <DirectBookingSocialLinks
                  socials={profile.socials}
                  website={dentistry.website}
                />
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-border pt-4 sm:mt-5 sm:pt-5">
            {dentistry.about_title?.trim() ? (
              <h2 className="text-balance text-2xl font-bold leading-tight sm:text-3xl">
                {dentistry.about_title}
              </h2>
            ) : null}
            {dentistry.about_text?.trim() ? (
              <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-base sm:leading-7">
                {dentistry.about_text}
              </p>
            ) : null}
            <div className="mt-3 grid gap-2 sm:mt-5 sm:flex sm:flex-wrap">
              <ConsultationAction profile={profile} />
              <ProfessionalEnquiryAction profile={profile} />
            </div>
          </div>
        </section>

        <ProfileTreatmentServiceSections
          inventory={inventory}
          moduleId="expert-educator"
          serviceTitle={dentistry.service_section_title}
          treatmentTitle={dentistry.treatment_section_title}
          variant="editorial-grid"
        />

        <ProfileLinksSection
          linkGroups={profile.linkGroups}
          moduleId="expert-educator"
          variant="grid"
        />

        <ExpertBlogSection groups={blogGroups} username={username} />

        <ProfileGallerySection
          cases={gallery.cases}
          generalImages={gallery.generalImages}
          moduleId="expert-educator-gallery"
        />

        <ProfileReviewsSection
          externalReviewPages={profile.externalReviewPages}
          reviews={profile.reviews}
          templateId="expert-educator"
          variant="plain"
        />

        <section
          aria-labelledby="expert-credentials"
          className="rounded-[var(--radius-lg)] bg-[var(--profile-muted)] p-5 text-[var(--profile-on-muted)] sm:p-7"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em]">
            Clinical authority
          </p>
          <h2 className="mt-1 text-2xl font-bold" id="expert-credentials">
            Credentials you can verify
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {user.qualification?.trim() ? (
              <div className="rounded-[var(--radius-md)] bg-card p-4 text-card-foreground">
                <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Qualifications
                </dt>
                <dd className="mt-1 font-bold">{user.qualification}</dd>
              </div>
            ) : null}
            {user.gdc_no?.trim() ? (
              <div className="rounded-[var(--radius-md)] bg-card p-4 text-card-foreground">
                <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Registration
                </dt>
                <dd className="mt-1 font-bold">GDC {user.gdc_no}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {location?.locations && location.location_id ? (
          <section
            aria-labelledby="expert-contact"
            className="rounded-[var(--radius-lg)] border border-border bg-card p-5 sm:p-7"
            id="location"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Consultation and speaking enquiries
            </p>
            <h2 className="mt-1 text-2xl font-bold" id="expert-contact">
              Contact and location
            </h2>
            <LocationImage
              className="mt-4 w-full"
              location={location.locations}
              sizes="(min-width: 640px) 640px, calc(100vw - 64px)"
            />
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {location.locations.business_name?.trim() ||
                dentistry.location_title?.trim() ||
                "Practice location"}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <ConsultationAction profile={profile} />
              <LocationMapModal
                contact={{
                  bookingEnabled: dentistry.booking_link_enabled,
                  bookingLink: dentistry.booking_link,
                  email: dentistry.contact_email,
                  phone: dentistry.phone,
                }}
                location={location.locations}
                locationId={location.location_id}
                position={1}
              />
            </div>
          </section>
        ) : (
          <ConsultationAction profile={profile} />
        )}
      </div>
    </main>
  );
}
