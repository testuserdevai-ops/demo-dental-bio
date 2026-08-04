"use client";

import { useState } from "react";

export function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center justify-between gap-2 dentalbio-copy-wrapper">
      <code className="truncate font-mono text-sm">{value}</code>
      <button type="button" onClick={copy}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
