"use client";
import React from "react";
import ReviewItem from "./ReviewItem";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";

type ReviewsProps = {
  serverReviews: any[];
  serverExternalReviewPages: any[];
};

const Reviews: React.FC<ReviewsProps> = ({
  serverReviews,
  serverExternalReviewPages,
}: ReviewsProps) => {
  return (
    <div
      id="review"
      className={serverReviews.length > 0 ? "text-center" : undefined}
    >
      {serverReviews.length > 0 ? (
        <>
          <div className="section-heading-treatment text-[23px] md:text-[26px] font-semibold pb-4">
            {serverExternalReviewPages.length ? (
              <TrackedLink
                href={serverExternalReviewPages[0].link}
                className="text-black no-underline"
                target="_blank"
                rel="noopener noreferrer"
                analytics={{
                  section: "reviews",
                  position: 1,
                  action: {
                    type: "external_review_click",
                    reviewPageId: serverExternalReviewPages[0].id,
                  },
                }}
              >
                Reviews
              </TrackedLink>
            ) : (
              <span>Reviews</span>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {serverReviews.map((review, index) => (
              <ReviewItem key={review.id} {...review} position={index + 1} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Reviews;
