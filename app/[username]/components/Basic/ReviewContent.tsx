import { useState, useRef, useEffect, useCallback } from "react";
import { TrackedButton } from "@/features/analytics/tracked-action";

interface ReviewProps {
  reviewId: string;
  position: number;
  reviewData: {
    content: string;
  };
}

const COLLAPSED_LINES = 3;

const ReviewContent: React.FC<ReviewProps> = ({
  reviewData,
  reviewId,
  position,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLongContent, setIsLongContent] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState(60);
  const [fullHeight, setFullHeight] = useState(0);

  const measure = useCallback(() => {
    if (contentRef.current) {
      const el = contentRef.current;
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      const collapsed = lineHeight * COLLAPSED_LINES; // first 3 lines of text
      setCollapsedHeight(collapsed);
      setFullHeight(el.scrollHeight); // true content height, ignores max-height/overflow
      setIsLongContent(el.scrollHeight > collapsed);
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [reviewData.content, measure]);

  return (
    <div className="my-2">
      <div
        ref={contentRef}
        style={{ maxHeight: isExpanded ? fullHeight : collapsedHeight }}
        className="text-base leading-5 text-gray-text px-4 overflow-hidden transition-[max-height] duration-300 ease-in-out"
      >
        {reviewData.content}
      </div>

      {isLongContent && !isExpanded && (
        <TrackedButton
          analytics={{
            action: { type: "review_expand", reviewId },
            section: "reviews",
            position,
          }}
          onClick={() => setIsExpanded(true)}
          className="text-blue-500 text-sm mt-2"
        >
          More
        </TrackedButton>
      )}
      {isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="text-blue-500 text-sm mt-2"
        >
          Less
        </button>
      )}
    </div>
  );
};

export default ReviewContent;
