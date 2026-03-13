import { useState, useRef, useEffect, useCallback } from "react";

interface ReviewProps {
  reviewData: {
    content: string;
  };
}

const ReviewContent: React.FC<ReviewProps> = ({ reviewData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLongContent, setIsLongContent] = useState(false);

  const checkContentLength = useCallback(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const lineHeight = parseFloat(getComputedStyle(contentRef.current).lineHeight);
      const maxHeight = lineHeight * 3; // 3 lines of text
      setIsLongContent(contentHeight > maxHeight);
    }
  }, []);

  useEffect(() => {
    checkContentLength();
  }, [reviewData.content]);

  return (
    <div className="my-2">
      <div
        ref={contentRef}
        className={`text-base leading-5 text-gray-text px-4 transition-all duration-300 ease-in-out transform overflow-hidden ${isExpanded ? "max-h-[500px]" : "max-h-[60px]"}`}
      >
        {reviewData.content}
      </div>

      {isLongContent && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-blue-500 text-sm mt-2"
        >
          More
        </button>
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
