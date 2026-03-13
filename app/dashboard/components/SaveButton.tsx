"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "@phosphor-icons/react";

export default function SaveButton({ text, loadingText, disabled }: { text?: string; loadingText?: string; disabled?: boolean; }) {
  const status = useFormStatus();
  const hasStartedPending = useRef(false);

  useEffect(() => {
    if (status.pending && !hasStartedPending.current) {
      hasStartedPending.current = true;
    }

    if (!status.pending && hasStartedPending.current) {
      hasStartedPending.current = false;

      // Dispatch the custom event to trigger iframe refresh
      const event = new Event("iframeRefresh");
      window.dispatchEvent(event); // Fire the event to refresh the iframe
    }
  }, [status.pending]);

  return (
    <button
      type="submit"
      className={`bg-primary-1 hover:bg-deep-purple transition-all text-white rounded-full text-lg px-4 py-2 font-semibold flex items-center gap-2 ${status.pending || disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      disabled={status.pending || disabled}
    >
      {status.pending ? (
        <>
          <Spinner className="animate-spin" size={20} />
          {loadingText || "Saving..."}
        </>
      ) : (
        `${text ? text : "Save"}`
      )}
    </button>
  );
}
