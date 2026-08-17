import type { PublicProfileViewModel } from "./public-profile";
import { selectProfileReviews } from "./profile-reviews";

export function createBasicNavigationState(
  profile: PublicProfileViewModel,
): NavBarStatusType {
  const reviewInventory = selectProfileReviews(
    profile.reviews,
    profile.externalReviewPages,
  );
  return {
    Links: profile.linkGroups.length > 0,
    Blog: profile.blogGroups.some((group) => group.blogs?.length > 0),
    Gallery:
      profile.galleries.length > 0 || profile.generalGalleries.length > 0,
    Videos: profile.videoGroups.some((group) => (group.datas?.length ?? 0) > 0),
    Reviews:
      reviewInventory.reviews.length > 0 ||
      reviewInventory.externalReviewPages.length > 0,
    Shop: profile.products.length > 0,
    Location: profile.locations.length > 0,
  };
}
