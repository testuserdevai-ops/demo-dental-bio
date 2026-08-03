"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";

type DnsRecord = { type: "A" | "CNAME"; name: string; value: string };
type Verification = { type: string; domain: string; value: string };

type DomainStatus = {
  domain: string | null;
  verified: boolean;
  misconfigured?: boolean;
  records?: DnsRecord[];
  verification?: Verification[];
};

function CopyValue({ value }: { value: string }) {
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

export default function DomainClient() {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);

  const loadStatus = async () => {
    try {
      const data = await apiClient.get<DomainStatus>("/api/user/domain");
      setStatus(data);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load domain status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitting(true);
    try {
      const data = await apiClient.post<DomainStatus>("/api/user/domain", {
        domain: input.trim(),
      });
      setStatus(data);
      setInput("");
      toast.success("Domain added. Now configure your DNS record below.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add domain");
    } finally {
      setSubmitting(false);
    }
  };

  const recheck = async () => {
    setChecking(true);
    try {
      // Ask Vercel to (re)run any domain-level verification, then refresh status.
      await apiClient.put("/api/user/domain").catch(() => {});
      await loadStatus();
      toast.success("Status refreshed");
    } finally {
      setChecking(false);
    }
  };

  const removeDomain = async () => {
    if (
      !window.confirm(
        "Disconnect this domain? Your profile will no longer be reachable from it.",
      )
    )
      return;
    try {
      await apiClient.delete("/api/user/domain");
      setStatus({ domain: null, verified: false });
      toast.success("Domain disconnected");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove domain");
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-light rounded-[26px] p-6 text-gray-500">
        Loading…
      </div>
    );
  }

  // No domain yet — show the add form.
  if (!status?.domain) {
    return (
      <form
        onSubmit={addDomain}
        className="bg-surface-light rounded-[26px] p-6 flex flex-col gap-4"
      >
        <label htmlFor="custom-domain" className="font-semibold text-dark">
          Your domain
        </label>
        <input
          id="custom-domain"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="example.com or links.example.com"
          className="w-full rounded-[20px] border border-gray-200 px-4 py-3 outline-none focus:border-gray-400"
        />
        <div className="add-btn self-start">
          <button type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Connect domain"}
          </button>
        </div>
      </form>
    );
  }

  const verified = status.verified;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface-light rounded-[26px] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-semibold text-dark m-0">{status.domain}</p>
            <span
              className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${
                verified
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {verified ? "Active" : "Pending DNS configuration"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={recheck}
              disabled={checking}
              className="h-10 px-5 leading-none rounded-[20px] border border-transparent bg-[var(--primary-color)] text-white font-semibold disabled:opacity-60"
            >
              {checking ? "Checking…" : "Re-check"}
            </button>
            <button
              type="button"
              onClick={removeDomain}
              className="h-10 px-5 leading-none rounded-[20px] border border-red-200 text-red-600 font-semibold"
            >
              Remove
            </button>
          </div>
        </div>

        {!verified && (
          <div className="flex flex-col gap-3">
            <p className="text-gray-600 m-0">
              Add the following DNS record at your domain registrar (GoDaddy,
              Namecheap, Cloudflare, etc.). SSL is provisioned automatically
              once the record propagates — this can take a few minutes to a few
              hours.
            </p>
            <div className="overflow-x-auto">
              <div className="min-w-[440px]">
                <div className="grid grid-cols-[60px_120px_1fr] gap-4 text-gray-500 text-sm pb-2">
                  <span>Type</span>
                  <span>Name / Host</span>
                  <span>Value</span>
                </div>
                {(status.records || []).map((r, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[60px_120px_1fr] gap-4 items-center border-t border-gray-100 py-3"
                  >
                    <span className="font-mono">{r.type}</span>
                    <span className="font-mono">{r.name}</span>
                    <CopyValue value={r.value} />
                  </div>
                ))}
              </div>
            </div>

            {status.verification && status.verification.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-gray-600 m-0 font-semibold">
                  This domain is in use elsewhere — add this TXT record to
                  verify ownership:
                </p>
                {status.verification.map((v, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-sm text-gray-500 font-mono">
                      {v.type} · {v.domain}
                    </span>
                    <CopyValue value={v.value} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {verified && (
          <p className="text-gray-600 m-0">
            Your profile is live at{" "}
            <a
              href={`https://${status.domain}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold"
            >
              https://{status.domain}
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
