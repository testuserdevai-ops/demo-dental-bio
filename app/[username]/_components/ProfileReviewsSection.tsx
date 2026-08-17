import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import SafeImage from "@/app/components/Image/SafeImage";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import { Card } from "@/app/components/ui/card";
import type { ProfileTemplateId } from "@/lib/profile-presentation/catalog";
import { resolveExternalReviewSectionTitle } from "@/lib/public-profile/external-review-title";
import { cn } from "@/lib/utils";

import {
  selectProfileReviews,
  type ProfileReview,
} from "../_lib/profile-reviews";
import ReadOnlyRating from "../components/ReadOnlyRating";

const reviewDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function ReviewCard({
  review,
  variant,
}: {
  review: ProfileReview;
  variant: "plain" | "card-grid";
}) {
  return (
    <Card
      className={cn("p-5", variant === "plain" && "shadow-none")}
      data-review-id={review.id}
      data-review-position={review.position}
    >
      <div className="flex items-center gap-3">
        {review.imageUrl ? (
          <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
            <SafeImage
              alt={review.reviewerName}
              className="object-cover"
              fill
              sizes="40px"
              src={review.imageUrl}
              unoptimized
            />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="font-semibold text-card-foreground">
            {review.reviewerName}
          </p>
          <time
            className="text-xs text-muted-foreground"
            dateTime={review.createdAt}
          >
            {reviewDate.format(new Date(review.createdAt))}
          </time>
        </div>
      </div>
      <div className="mt-3 w-fit">
        <ReadOnlyRating value={review.stars} />
      </div>
      <blockquote className="mt-3 text-sm leading-6 text-card-foreground">
        <p className="text-card-foreground">{review.content}</p>
      </blockquote>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {review.platform}
      </p>
    </Card>
  );
}

export default function ProfileReviewsSection({
  externalReviewPages,
  externalReviewSectionTitle,
  reviews,
  templateId,
  variant = "card-grid",
}: {
  externalReviewPages: unknown;
  externalReviewSectionTitle?: unknown;
  reviews: unknown;
  templateId: ProfileTemplateId;
  variant?: "plain" | "card-grid";
}) {
  const inventory = selectProfileReviews(reviews, externalReviewPages);
  const sectionTitle = resolveExternalReviewSectionTitle(
    externalReviewSectionTitle,
  );
  if (
    inventory.reviews.length === 0 &&
    inventory.externalReviewPages.length === 0
  ) {
    return null;
  }

  return (
    <section
      className="space-y-4"
      data-profile-module={`${templateId}-reviews`}
      id="review"
    >
      {inventory.reviews.length > 0 ? (
        <div
          className={cn(
            "grid gap-4",
            variant === "card-grid" && "sm:grid-cols-2",
          )}
          data-review-inventory
        >
          {inventory.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} variant={variant} />
          ))}
        </div>
      ) : null}

      {inventory.externalReviewPages.length > 0 ? (
        <div className="space-y-3">
          {sectionTitle ? (
            <h2
              className="text-xl font-semibold text-foreground"
              id={`${templateId}-external-review-title`}
            >
              {sectionTitle}
            </h2>
          ) : null}
          {sectionTitle ? (
            <nav
              aria-labelledby={`${templateId}-external-review-title`}
              className="flex flex-wrap gap-3"
              data-external-review-inventory
            >
              {inventory.externalReviewPages.map((page) => (
                <ExternalReviewLink key={page.id} page={page} />
              ))}
            </nav>
          ) : (
            <div
              className="flex flex-wrap gap-3"
              data-external-review-inventory
            >
              {inventory.externalReviewPages.map((page) => (
                <ExternalReviewLink key={page.id} page={page} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ExternalReviewLink({
  page,
}: {
  page: ReturnType<typeof selectProfileReviews>["externalReviewPages"][number];
}) {
  return (
    <TrackedLink
      analytics={{
        section: "reviews",
        position: page.position,
        action: {
          type: "external_review_click",
          reviewPageId: page.id,
        },
      }}
      aria-label={`Open ${page.label} reviews in a new tab`}
      className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-full)] border border-border bg-card px-4 py-2 text-sm font-semibold text-[var(--profile-link)] no-underline hover:text-[var(--profile-link-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      data-external-review-page-id={page.id}
      data-external-review-position={page.position}
      href={page.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {page.label}
      <ArrowSquareOut aria-hidden="true" className="size-4" />
    </TrackedLink>
  );
}
