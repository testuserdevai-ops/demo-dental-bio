"use client";

import { useState } from "react";
import {
  CopyIcon,
  EnvelopeSimpleIcon,
  LinkedinLogoIcon,
  PrinterIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";

import { Button } from "@/app/components/ui/button";
import {
  analyticsActionClassName,
  analyticsOutlineActionClassName,
} from "@/app/dashboard/analytics/_components/action-style";
import { buildOwnerShareUrls } from "../_lib/share";

export function ShareHub({ profileUrl }: { profileUrl: string }) {
  const [copied, setCopied] = useState(false);
  const urls = buildOwnerShareUrls(profileUrl);

  async function copyProfileUrl() {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-w-0 space-y-5 pb-12">
      <header className="rounded-3xl bg-primary-5 p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Get discovered
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          Share your profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Start with channels you already use. Qualified visits and profile
          actions will appear in Analytics; opening this dashboard tool is not
          counted as a public-profile conversion.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Your profile link</h2>
        <p className="mt-3 break-all rounded-xl bg-muted p-3 text-sm text-foreground">
          {profileUrl}
        </p>
        <Button className="mt-4 min-h-11" onClick={copyProfileUrl}>
          <CopyIcon aria-hidden="true" size={20} />
          {copied ? "Copied" : "Copy profile link"}
        </Button>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Share now</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <a className={analyticsActionClassName} href={urls.whatsapp}>
            <WhatsappLogoIcon aria-hidden="true" size={20} /> WhatsApp
          </a>
          <a className={analyticsOutlineActionClassName} href={urls.linkedIn}>
            <LinkedinLogoIcon aria-hidden="true" size={20} /> LinkedIn
          </a>
          <a className={analyticsOutlineActionClassName} href={urls.email}>
            <EnvelopeSimpleIcon aria-hidden="true" size={20} /> Email
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-bold text-foreground">Google Business Profile</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add your DentalBio URL as your appointment or website link, then
            check Analytics after patients have had time to use it.
          </p>
        </article>
        <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-bold text-foreground">Printed material</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Put the short profile URL on reception cards, appointment reminders
            or a practice poster. A downloadable QR code is not offered until
            its scan attribution can be generated and verified first-party.
          </p>
          <Button
            className="mt-4 min-h-11"
            variant="outline"
            onClick={() => window.print()}
          >
            <PrinterIcon aria-hidden="true" size={20} /> Print this guide
          </Button>
        </article>
      </section>
    </div>
  );
}
