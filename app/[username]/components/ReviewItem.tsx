import Avatar from "@/app/components/Image/Avatar";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";
import ReviewContent from "./Basic/ReviewContent";
import ReadOnlyRating from "./ReadOnlyRating";

const ReviewItem: React.FC<ReviewType & { position: number }> = ({
  ...reviewData
}) => {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-full flex justify-center">
        <div className={`flex items-center gap-2 text-left`}>
          <Avatar avatarUrl={reviewData.image_url!} size={40} />
          <div>
            <div className="text-sm font-semibold">
              {reviewData.reviewer_name}
            </div>
            <div className={`text-sm text-gray-text`}>
              {formatDateAsDDMMYYYY(reviewData.created_at)}
            </div>
          </div>
        </div>
      </div>
      <div>
        <ReadOnlyRating value={reviewData.stars} />
      </div>
      <ReviewContent
        reviewData={{ content: reviewData.content! }}
        reviewId={reviewData.id!}
        position={reviewData.position}
      />
      <div className="text-sm text-gray-text">
        Source: {reviewData.platform}
      </div>
    </div>
  );
};

export default ReviewItem;
