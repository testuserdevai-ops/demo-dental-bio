import type { PublicProfileViewModel } from "../_lib/public-profile";
import ProfileReviewsSection from "./ProfileReviewsSection";

export default function LocationRouterReviews({
  externalReviewPages,
  reviews,
}: Pick<PublicProfileViewModel, "externalReviewPages" | "reviews">) {
  return (
    <ProfileReviewsSection
      externalReviewPages={externalReviewPages}
      reviews={reviews}
      templateId="location-provider-router"
    />
  );
}
