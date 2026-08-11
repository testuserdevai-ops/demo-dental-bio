import { TrackedLink } from "@/app/components/analytics/TrackedAction";

import type { PublicProfileViewModel } from "../_lib/public-profile";
import ReadOnlyRating from "../components/ReadOnlyRating";

export default function LocationRouterReviews({
  externalReviewPages,
  reviews,
}: Pick<PublicProfileViewModel, "externalReviewPages" | "reviews">) {
  const visibleReviews = reviews.filter(({ content, stars }) =>
    Boolean(content?.trim() || stars),
  );
  if (visibleReviews.length === 0) return null;

  const externalReview = externalReviewPages.find(({ link }) =>
    /^https?:\/\//i.test(link?.trim() ?? ""),
  );

  return (
    <section
      aria-labelledby="location-router-reviews-title"
      className="space-y-4"
      data-profile-module="location-reviews"
      id="review"
    >
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Across our practices
        </p>
        <h2
          className="mt-1 text-2xl font-bold text-foreground"
          id="location-router-reviews-title"
        >
          Patient feedback
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {visibleReviews.slice(0, 2).map((review) => (
          <article
            className="rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-sm"
            key={review.id}
          >
            <ReadOnlyRating value={review.stars ?? undefined} />
            {review.content?.trim() ? (
              <blockquote className="mt-3 text-sm leading-6 text-card-foreground">
                “{review.content}”
              </blockquote>
            ) : null}
            {review.reviewer_name?.trim() ? (
              <p className="mt-3 text-sm font-semibold text-muted-foreground">
                {review.reviewer_name}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      {externalReview ? (
        <div className="text-center">
          <TrackedLink
            analytics={{
              section: "reviews",
              position: 1,
              action: {
                type: "external_review_click",
                reviewPageId: externalReview.id,
              },
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-full)] px-5 py-2 text-sm font-bold text-[var(--profile-link)] no-underline hover:text-[var(--profile-link-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={externalReview.link ?? ""}
            rel="noopener noreferrer"
            target="_blank"
          >
            Read more patient reviews
            <span className="sr-only"> (opens in a new tab)</span>
          </TrackedLink>
        </div>
      ) : null}
    </section>
  );
}
