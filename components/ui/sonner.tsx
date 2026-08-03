"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      richColors
      containerAriaLabel="Application notifications"
      {...props}
    />
  );
}

export { Toaster };
