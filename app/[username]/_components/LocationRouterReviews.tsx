import type { PublicProfileViewModel } from "../_lib/public-profile";
import ProfileReviewsSection from "./ProfileReviewsSection";

export default function LocationRouterReviews({
  externalReviewPages,
  externalReviewSectionTitle,
  reviews,
}: Pick<PublicProfileViewModel, "externalReviewPages" | "reviews"> & {
  externalReviewSectionTitle?: unknown;
}) {
  return (
    <ProfileReviewsSection
      externalReviewPages={externalReviewPages}
      externalReviewSectionTitle={externalReviewSectionTitle}
      reviews={reviews}
      templateId="location-provider-router"
    />
  );
}
