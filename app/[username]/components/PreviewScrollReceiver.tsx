"use client";

import { useEffect } from "react";

type PreviewScrollMessage = {
  type: "dentalbio:preview-scroll";
  sectionId: string;
  behavior: ScrollBehavior;
};

function isPreviewScrollMessage(value: unknown): value is PreviewScrollMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Partial<PreviewScrollMessage>;
  return (
    message.type === "dentalbio:preview-scroll" &&
    typeof message.sectionId === "string" &&
    (message.behavior === "auto" || message.behavior === "smooth")
  );
}

export default function PreviewScrollReceiver() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        !isPreviewScrollMessage(event.data)
      ) {
        return;
      }

      const message = event.data;
      let attempts = 0;
      const scrollWhenReady = () => {
        const section = document.getElementById(message.sectionId);
        if (!section && attempts < 10) {
          attempts += 1;
          window.setTimeout(scrollWhenReady, 50);
          return;
        }
        if (!section) return;

        const top = section.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({
          top: Math.max(0, top),
          behavior: message.behavior,
        });
      };

      scrollWhenReady();
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage(
      { type: "dentalbio:preview-ready" },
      window.location.origin,
    );
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}
