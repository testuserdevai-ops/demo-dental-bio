"use client";
import React from "react";
import ReviewItem from "./ReviewItem";
import Link from "next/link";

type ReviewsProps = {
  serverReviews: any[];
  serverExternalReviewPages: any[];
};

const Reviews: React.FC<ReviewsProps> = ({
  serverReviews,
  serverExternalReviewPages,
}: ReviewsProps) => {
  return (
    <>
      {serverReviews.length > 0 ? (
        <div className="text-center" id="review">
          <div className="section-heading-treatment text-[23px] md:text-[26px] font-semibold pb-4">
            {serverExternalReviewPages.length ? (
              <Link
                href={serverExternalReviewPages[0].link}
                className="text-black no-underline"
                target="_blank"
              >
                Reviews
              </Link>
            ) : (
              <span>Reviews</span>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {serverReviews.map((review) => (
              <ReviewItem key={review.id} {...review} />
            ))}
          </div>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

export default Reviews;
