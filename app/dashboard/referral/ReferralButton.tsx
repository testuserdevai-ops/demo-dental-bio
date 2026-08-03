"use client";

import React from "react";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { Copy, CheckCircle } from "@phosphor-icons/react";

interface ReferralButtonProps {
  referralLink: string;
}

const ReferralButton = ({ referralLink }: ReferralButtonProps) => {
  const [isCopied, setIsCopied] = React.useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      setIsCopied(false);
    }
  };

  return (
    <FullRoundedButton
      onClick={copyLink}
      className="my-3 flex gap-2"
      type="button"
      buttonType="primary"
    >
      {isCopied ? <CheckCircle size={24} /> : <Copy size={24} />}
      {isCopied ? "Copied!" : "Copy Referral Link"}
    </FullRoundedButton>
  );
};

export default ReferralButton;
