export type PublicProfileFeature =
  | "profile"
  | "socials"
  | "treatments"
  | "links"
  | "galleries"
  | "reviews"
  | "external-review-page"
  | "blogs"
  | "videos"
  | "products"
  | "locations";

export type PublicProfileEntityKind =
  | "treatment"
  | "link-group"
  | "link"
  | "gallery"
  | "review"
  | "blog-group"
  | "blog"
  | "video-group"
  | "video"
  | "product"
  | "location";

export type PublicProfileMutation = {
  profileId: string;
  feature: PublicProfileFeature;
  entities?: readonly {
    kind: PublicProfileEntityKind;
    id: string;
  }[];
};

export function publicProfileMutationTags({
  profileId,
  feature,
  entities = [],
}: PublicProfileMutation): string[] {
  return Array.from(
    new Set([
      `public-profile:${profileId}`,
      `${feature}:${profileId}`,
      ...entities.map(({ kind, id }) => `${kind}:${id}`),
    ]),
  );
}
