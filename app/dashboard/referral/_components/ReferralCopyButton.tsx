"use client";

import { CheckCircle, Copy } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

export function ReferralCopyButton({ referralUrl }: { referralUrl: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setStatus("Referral link copied");
    } catch {
      input.current?.focus();
      input.current?.select();
      setStatus("Select the link and copy it manually");
    }
  };

  return (
    <div className="space-y-3">
      <Input
        ref={input}
        aria-label="Referral link"
        value={referralUrl}
        readOnly
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {status}
        </p>
        <Button type="button" onClick={copy}>
          {status === "Referral link copied" ? (
            <CheckCircle aria-hidden="true" className="size-5" />
          ) : (
            <Copy aria-hidden="true" className="size-5" />
          )}
          Copy link
        </Button>
      </div>
    </div>
  );
}
