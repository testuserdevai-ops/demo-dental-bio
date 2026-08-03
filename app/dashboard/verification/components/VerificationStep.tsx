"use client";

import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

interface VerificationStepProps {
  title: string;
  description: string;
  isCompleted?: boolean;
  isLast?: boolean;
}

const VerificationStep: React.FC<VerificationStepProps> = ({
  title,
  description,
  isCompleted = false,
  isLast = false,
}) => {
  return (
    <div className="flex gap-2">
      <div className="flex flex-col items-center">
        {isCompleted ? (
          <CheckCircle size={36} weight="fill" color="#5046db" />
        ) : (
          <div className="w-8 h-8 aspect-square rounded-full border" />
        )}
        {!isLast && <div className="w-0 border-r flex-grow" />}
      </div>
      <div className={`mt-1 ${!isLast ? "mb-4" : ""}`}>
        <h6 className="text-gray-500 mb-1">{title}</h6>
        <p className="font-light text-gray-500">{description}</p>
      </div>
    </div>
  );
};

export default VerificationStep;
