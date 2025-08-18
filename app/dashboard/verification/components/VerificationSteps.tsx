'use client'

import VerificationStep from "./VerificationStep";

interface VerificationStepsProps {
  isCompleted?: boolean;
}

const VerificationSteps: React.FC<VerificationStepsProps> = ({ isCompleted = false }) => {
  const steps = [
    {
      title: "Connect your phone",
      description: "Use your phone to access the verification flow."
    },
    {
      title: "Show us a ID card photo",
      description: "We'll check that your ID card's authenticity."
    },
    {
      title: "Appear on camera",
      description: "To show us it's really you, take a selfie."
    },
    {
      title: "Liveness Detection",
      description: "Follow the instructions to ensure you're completing this in real-time."
    }
  ];

  return (
    <div className="text-gray-500">
      {steps.map((step, index) => (
        <VerificationStep
          key={index}
          title={step.title}
          description={step.description}
          isCompleted={isCompleted}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
};

export default VerificationSteps; 