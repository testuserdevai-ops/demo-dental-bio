'use client';

import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { showErrorToast } from "@/utils/Toast";
import { useState } from "react";
import { apiClient } from "@/services/apiClient";

type VerifyButtonProps = {
  text?: string;
  enabled?: boolean;
}

const VerifyButton: React.FC<VerifyButtonProps> = ({ text, enabled }) => {
  const [isLoading, setIsLoading] = useState(false);

  const startVerification = async () => {
    setIsLoading(true);

    try {
      const data = await apiClient.post('/api/veriff/create-session');

      if (!data.verification?.url) {
        showErrorToast('Invalid verification response from server');
        return;
      }

      window.location.href = data.verification.url; // Redirect to Veriff
    } catch (error: any) {
      console.error('Error starting verification:', error);
      showErrorToast(error.message || 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return <FullRoundedButton isLoading={isLoading} onClick={startVerification} disabled={!enabled}>{text || "Start now"}</FullRoundedButton>;
}

export default VerifyButton;