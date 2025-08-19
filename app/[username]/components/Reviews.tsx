'use client'
import React, { useEffect, useState } from "react";
import ReviewItem from "./ReviewItem";
import { useNavbar } from "@/app/contexts/NavbarContext";

type ReviewsProps = {
  userId: string;
}

const Reviews: React.FC<ReviewsProps> = ({
  userId,
}: ReviewsProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [externalLink, setExternalLink] = useState<string | null>(null);
  const { setNavItemState } = useNavbar();

  useEffect(() => {
    const fetchReviews = async () => {
      const query = userId ? `?userId=${userId}` : '';
      const response = await fetch(`/api/reviews${query}`, {
        method: 'GET'
      });
      const data = await response.json();
      setReviews(data);
    };

    fetchReviews();
  }, []);

  useEffect(() => {
    const fetchReviewLink = async () => {
      const query = userId ? `?userId=${userId}` : '';
      const response = await fetch(`/api/external-review-pages${query}`, {
        method: 'GET'
      });
      const data = await response.json();
      if (data.length)
        setExternalLink(data[0].link);
    };

    fetchReviewLink();
  }, []);

  useEffect(() => {
    if (reviews.length > 0) {
      setNavItemState("Reviews", true);
    }
  }, [reviews]);

  return (
    <>
      {(reviews.length > 0) ?
        <div className="text-center" id="review">
          <div className="section-heading-treatment text-[23px] md:text-[26px] font-semibold pb-4">
            {externalLink ?
              <a href={externalLink} className="text-black no-underline" target="_blank">Reviews</a> :
              <span>Reviews</span>}
          </div>
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <ReviewItem
                key={review.id}
                {...review}
              />
            ))}
          </div>
        </div> : <></>}
    </>
  )
}

export default Reviews;