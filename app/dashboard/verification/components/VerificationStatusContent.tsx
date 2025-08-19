'use client'

import VerificationCard from "./VerificationCard";
import VerificationSteps from "./VerificationSteps";
import VerifyButton from "./VerifyButton";

interface VerificationStatusContentProps {
  sessionStatus: string;
  enabled: boolean;
}

const VerificationStatusContent: React.FC<VerificationStatusContentProps> = ({ 
  sessionStatus, 
  enabled 
}) => {
  switch (sessionStatus) {
    case "approved":
      return (
        <VerificationCard title="You verified your identity">
          <p className="text-gray-500 mb-4">
            You've completed an important part of establishing trust in our community.
          </p>
          <VerificationSteps isCompleted={true} />
        </VerificationCard>
      );

    case "pending":
      return (
        <VerificationCard title="Verification in Progress">
          <p className="text-gray-500 mb-1">
            Thank you for submitting your verification details.
          </p>
          <p className="text-gray-500 mb-1">
            Our team is currently reviewing your information to ensure everything meets the required standards.
          </p>
          <p className="text-gray-500 mb-1">
            You will receive a notification via email as soon as the verification process is completed. If additional information is needed, we will reach out to you directly.
          </p>
          <p className="text-gray-500 mb-1">
            We appreciate your patience and understanding during this process.
          </p>
        </VerificationCard>
      );

    case "declined":
      return (
        <>
          <VerificationCard title="Verification failed">
            <p className="text-gray-500 mb-4">Please try again:</p>
            <VerificationSteps isCompleted={false} />
          </VerificationCard>
          <div className="flex justify-end my-4">
            <VerifyButton
              text="Try again"
              enabled={enabled}
            />
          </div>
        </>
      );

    case "not_started":
      return (
        <>
          <VerificationCard title="You haven't verified your identity yet">
            <p className="text-gray-500 mb-4">
              How to verify your identity to keep the community safe for everyone:
            </p>
            <VerificationSteps isCompleted={false} />
          </VerificationCard>
          <div className="flex justify-end my-4">
            <VerifyButton enabled={enabled} />
          </div>
        </>
      );

    default:
      return null;
  }
};

export default VerificationStatusContent; 