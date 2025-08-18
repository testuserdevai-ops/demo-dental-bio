'use client';

import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { showErrorToast } from "@/utils/Toast";
import { useState } from "react";

type VerifyButtonProps = {
  text?: string;
  enabled?: boolean;
}

const VerifyButton: React.FC<VerifyButtonProps> = ({ text, enabled }) => {
  const [isLoading, setIsLoading] = useState(false);

  const startVerification = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/veriff/create-session', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to start verification';
        showErrorToast(errorMessage);
        return;
      }

      const data = await response.json();

      if (!data.verification?.url) {
        showErrorToast('Invalid verification response from server');
        return;
      }

      window.location.href = data.verification.url; // Redirect to Veriff
    } catch (error) {
      console.error('Error starting verification:', error);
      showErrorToast('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return <FullRoundedButton isLoading={isLoading} onClick={startVerification} disabled={!enabled}>{text || "Start now"}</FullRoundedButton>;
}

export default VerifyButton;