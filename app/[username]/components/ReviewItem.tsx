import Avatar from "@/app/components/Image/Avatar";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";
import ReactStars from "react-stars";
import ReviewContent from "./Basic/ReviewContent";

const ReviewItem: React.FC<ReviewType> = ({ ...reviewData }) => {
  return (
    <div className="flex flex-col items-center text-center">
      <div className='w-full flex justify-center'>
        <div className={`flex items-center gap-2 text-left`}>
          <Avatar
            avatarUrl={reviewData.image_url!}
            size={40}
          />
          <div>
            <div className='text-sm font-semibold'>{reviewData.reviewer_name}</div>
            <div className={`text-sm text-[#9D9D9D]`}>{formatDateAsDDMMYYYY(reviewData.created_at)}</div>
          </div>
        </div>
      </div>
      <div>
        <ReactStars
          count={5}
          size={20}
          color1="gray"
          color2="#FFD700"
          edit={false}
          half={false}
          value={reviewData.stars}
          className="flex justify-around"
        />
      </div>
      <ReviewContent reviewData={{ content: reviewData.content! }} />
      <div className="text-sm text-[#9D9D9D]">Source: {reviewData.platform}</div>
    </div>
  )
}

export default ReviewItem;