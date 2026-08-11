import SafeImage from "@/app/components/Image/SafeImage";
import type { ProfileTemplateAnswers } from "@/lib/profile-presentation/contract";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import {
  createLocationRouterBookingHref,
  createLocationRouterEmailHref,
  createLocationRouterPhoneHref,
  createLocationRouterState,
  getLocationRouterCopy,
} from "../_lib/location-router-template";
import LocationRouterExperience from "./LocationRouterExperience";
import LocationRouterReviews from "./LocationRouterReviews";
import LocationRouterSocialLinks from "./LocationRouterSocialLinks";

function PracticeImageStrip({
  images,
}: {
  images: PublicProfileViewModel["generalGalleries"];
}) {
  const visibleImages = images
    .filter(({ image_url }) => Boolean(image_url))
    .slice(0, 3);
  if (visibleImages.length === 0) return null;

  return (
    <div
      aria-label="Practice gallery"
      className="grid grid-cols-3 gap-2"
      role="group"
    >
      {visibleImages.map((image, index) => (
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-muted"
          key={image.id}
        >
          <SafeImage
            alt={image.title?.trim() || `Practice view ${index + 1}`}
            className="object-cover"
            fill
            sizes="(max-width: 720px) 30vw, 210px"
            src={image.image_url!}
          />
        </div>
      ))}
    </div>
  );
}

export default function LocationRouterProfileTemplate({
  profile,
}: {
  username: string;
  profile: PublicProfileViewModel;
}) {
  const { dentistry, user } = profile;
  const answers = profile.presentation.configuration
    .answers as ProfileTemplateAnswers["location-provider-router"];
  const routerState = createLocationRouterState(answers, profile.locations);
  const displayName = [user.title, user.first_name, user.last_name]
    .filter((part) => part?.trim())
    .join(" ");
  const credentials = [user.position, user.qualification]
    .filter((part) => part?.trim())
    .join(" · ");
  const contact = {
    bookingHref: createLocationRouterBookingHref(dentistry),
    phoneHref: createLocationRouterPhoneHref(dentistry.phone),
    emailHref: createLocationRouterEmailHref(dentistry.contact_email),
  };

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-[780px] bg-background px-4 pb-12 pt-6 text-foreground sm:px-8 sm:pb-16 sm:pt-10"
      data-profile-template="location-provider-router"
    >
      <div className="space-y-8 sm:space-y-10">
        <section aria-labelledby="location-router-name" className="text-center">
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
            id="location-router-name"
          >
            {displayName || "Dental professional"}
          </h1>
          {credentials ? (
            <p className="mt-2 text-sm font-semibold text-muted-foreground sm:text-base">
              {credentials}
            </p>
          ) : null}
          {dentistry.location_title?.trim() ? (
            <p className="mx-auto mt-4 max-w-xl rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground">
              {dentistry.location_title}
            </p>
          ) : null}
        </section>

        <PracticeImageStrip images={profile.generalGalleries} />

        {(dentistry.about_title?.trim() || dentistry.about_text?.trim()) && (
          <section
            aria-labelledby="location-router-introduction"
            className="text-center"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Appointments made clearer
            </p>
            <h2
              className="mt-2 text-2xl font-bold text-foreground"
              id="location-router-introduction"
            >
              {dentistry.about_title?.trim() || "Choose the right care path"}
            </h2>
            {dentistry.about_text?.trim() ? (
              <p className="mx-auto mt-3 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
                {dentistry.about_text}
              </p>
            ) : null}
          </section>
        )}

        <LocationRouterExperience
          contact={contact}
          copy={getLocationRouterCopy(answers)}
          defaultOptionId={routerState.defaultOptionId}
          options={routerState.options}
          recoveredDefault={routerState.recoveredDefault}
        />

        <LocationRouterReviews
          externalReviewPages={profile.externalReviewPages}
          reviews={profile.reviews}
        />

        <section
          aria-labelledby="location-router-contact-title"
          className="border-t border-border pt-7 text-center"
        >
          <h2
            className="text-base font-bold text-foreground"
            id="location-router-contact-title"
          >
            Follow and contact the practice
          </h2>
          <div className="mt-3">
            <LocationRouterSocialLinks socials={profile.socials} />
          </div>
        </section>
      </div>
    </main>
  );
}
