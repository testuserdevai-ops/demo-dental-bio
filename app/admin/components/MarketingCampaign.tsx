"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  PaperPlaneTilt,
  UploadSimple,
  Users,
  Warning,
} from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";

type BrandOption = { domain: string; brandName: string };
type Recipient = { email: string; firstName?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const campaignSchema = z.object({
  brandDomain: z.string().min(1, "Choose a brand"),
  subject: z.string().trim().min(1, "Enter a subject").max(200),
  bodyHtml: z.string().trim().min(1, "Enter the email content").max(250_000),
});
type CampaignFields = z.infer<typeof campaignSchema>;

// {{baseUrl}} and {{brandName}} are replaced at send time with the selected
// brand's values, so this default is correct no matter which brand you pick.
const DEFAULT_BODY = `<h1 style="font-size:30px;font-weight:700;color:#1c1c21;line-height:1.25;margin:0 0 14px 0;letter-spacing:-0.5px;">
  One link for your whole professional world.
</h1>
<p style="font-size:17px;color:#52525b;line-height:1.65;margin:0 0 28px 0;">
  Your bio, links, gallery, reviews and booking — on one beautiful, verified page that you can
  share everywhere. Setup takes about 2 minutes.
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 30px 0;">
  <tr>
    <td valign="top" width="44" style="padding:0 0 18px 0;">
      <div style="width:36px;height:36px;border-radius:10px;background-color:#eef0ff;color:#5046db;font-size:18px;line-height:36px;text-align:center;">🔗</div>
    </td>
    <td valign="top" style="padding:0 0 18px 0;">
      <div style="font-size:16px;font-weight:700;color:#1c1c21;line-height:1.4;">Everything in one place</div>
      <div style="font-size:15px;color:#52525b;line-height:1.55;">Links, gallery, treatments, reviews and contact — no more juggling profiles.</div>
    </td>
  </tr>
  <tr>
    <td valign="top" width="44" style="padding:0 0 18px 0;">
      <div style="width:36px;height:36px;border-radius:10px;background-color:#eef0ff;color:#5046db;font-size:18px;line-height:36px;text-align:center;">✅</div>
    </td>
    <td valign="top" style="padding:0 0 18px 0;">
      <div style="font-size:16px;font-weight:700;color:#1c1c21;line-height:1.4;">Look credible, instantly</div>
      <div style="font-size:15px;color:#52525b;line-height:1.55;">A verified badge and clean design that builds trust the moment someone lands.</div>
    </td>
  </tr>
  <tr>
    <td valign="top" width="44">
      <div style="width:36px;height:36px;border-radius:10px;background-color:#eef0ff;color:#5046db;font-size:18px;line-height:36px;text-align:center;">⚡</div>
    </td>
    <td valign="top">
      <div style="font-size:16px;font-weight:700;color:#1c1c21;line-height:1.4;">Update once, live everywhere</div>
      <div style="font-size:15px;color:#52525b;line-height:1.55;">Change something once and it updates across every place you've shared your link.</div>
    </td>
  </tr>
</table>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 30px 0;">
  <tr>
    <td style="background-color:#f7f7fb;border:1px solid #ececf5;border-radius:14px;padding:20px 22px;">
      <div style="font-size:16px;font-weight:700;color:#1c1c21;line-height:1.4;margin:0 0 6px 0;">There's a version built for your profession</div>
      <div style="font-size:15px;color:#52525b;line-height:1.6;margin:0 0 12px 0;">
        Whether you're a dentist, doctor, pharmacist, therapist, coach or podcaster, each app is tailored to how your field works. Pick the one that fits you:
      </div>
      <div style="font-size:14px;line-height:2;color:#5046db;font-weight:600;">
        Dentalbio &nbsp;·&nbsp; Doctorsbio &nbsp;·&nbsp; Injectorbio &nbsp;·&nbsp; Pharmacistsbio &nbsp;·&nbsp; Therapistsbio &nbsp;·&nbsp; Coachbio &nbsp;·&nbsp; Podcastsbio &nbsp;·&nbsp; Specialistbio
      </div>
    </td>
  </tr>
</table>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 18px auto;">
  <tr>
    <td align="center" bgcolor="#5046db" style="border-radius:26px;">
      <a href="{{baseUrl}}/register"
         style="display:inline-block;padding:15px 34px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:26px;">
        Claim your {{brandName}} page →
      </a>
    </td>
  </tr>
</table>
<p style="font-size:13px;color:#a1a1aa;line-height:1.5;text-align:center;margin:0;">
  Free to start &nbsp;•&nbsp; 2-minute setup &nbsp;•&nbsp; no card required
</p>`;

/** Minimal CSV parser that tolerates quoted fields containing commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }
  return rows;
}

function extractRecipients(rows: string[][]): Recipient[] {
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = header.some(
    (h) => h.includes("email") || h.includes("mail"),
  );

  let emailIdx = 0;
  let nameIdx = -1;
  let dataRows = rows;

  if (hasHeader) {
    emailIdx = header.findIndex(
      (h) => h.includes("email") || h.includes("mail"),
    );
    nameIdx = header.findIndex(
      (h) => h.includes("first") || h === "name" || h.includes("firstname"),
    );
    dataRows = rows.slice(1);
  } else {
    // No header: assume first column is email, second (if any) is name.
    emailIdx = 0;
    nameIdx = rows[0].length > 1 ? 1 : -1;
  }

  const out: Recipient[] = [];
  for (const r of dataRows) {
    const email = (r[emailIdx] || "").trim();
    if (!email) continue;
    out.push({
      email,
      firstName:
        nameIdx >= 0 ? (r[nameIdx] || "").trim() || undefined : undefined,
    });
  }
  return out;
}

const MarketingCampaign: React.FC<{ brands: BrandOption[] }> = ({ brands }) => {
  const form = useForm<CampaignFields>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      brandDomain: brands[0]?.domain || "dental.bio",
      subject: "",
      bodyHtml: DEFAULT_BODY,
    },
  });
  const brandDomain = useWatch({ control: form.control, name: "brandDomain" });
  const subject = useWatch({ control: form.control, name: "subject" });
  const bodyHtml = useWatch({ control: form.control, name: "bodyHtml" });
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [fileName, setFileName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewHtml = useMemo(() => {
    const brandName =
      brands.find((b) => b.domain === brandDomain)?.brandName || brandDomain;
    return bodyHtml
      .replace(/\{\{\s*baseUrl\s*\}\}/g, `https://${brandDomain}`)
      .replace(/\{\{\s*brandName\s*\}\}/g, brandName);
  }, [bodyHtml, brandDomain, brands]);

  const stats = useMemo(() => {
    const seen = new Set<string>();
    let valid = 0,
      invalid = 0,
      duplicates = 0;
    for (const r of recipients) {
      const email = r.email.trim().toLowerCase();
      if (!EMAIL_RE.test(email)) {
        invalid++;
        continue;
      }
      if (seen.has(email)) {
        duplicates++;
        continue;
      }
      seen.add(email);
      valid++;
    }
    return { valid, invalid, duplicates };
  }, [recipients]);

  const handleFile = async (file: File) => {
    setResult(null);
    form.clearErrors("root");
    const text = await file.text();
    const parsed = extractRecipients(parseCsv(text));
    setRecipients(parsed);
    setFileName(file.name);
  };

  const reviewSend = form.handleSubmit(() => {
    form.clearErrors("root");
    setResult(null);
    if (stats.valid === 0) {
      form.setError("root", {
        message: "Upload a CSV with at least one valid email address.",
      });
      return;
    }
    setConfirmationOpen(true);
  });

  const sendCampaign = async () => {
    const values = campaignSchema.parse(form.getValues());
    try {
      setIsSending(true);
      form.clearErrors("root");
      const res = await fetch("/api/admin/marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, recipients }),
      });
      const json = await res.json();
      if (!res.ok) {
        form.setError("root", {
          message: json.error || "Failed to send campaign.",
        });
        return;
      }
      setResult(
        `Sent ${json.sent}. ` +
          `${json.failed ? `Failed ${json.failed}. ` : ""}` +
          `Skipped ${json.suppressed} unsubscribed, ${json.invalid} invalid.` +
          (json.message ? ` ${json.message}` : ""),
      );
      setConfirmationOpen(false);
    } catch {
      setConfirmationOpen(false);
      form.setError("root", {
        message:
          "Delivery outcome is unknown because the server response was lost. Do not resend this campaign until delivery has been checked.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold mb-6">Email Marketing</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <form
          noValidate
          onSubmit={reviewSend}
          className="space-y-4 rounded-3xl border border-border bg-white p-6 shadow-sm"
        >
          <Controller
            control={form.control}
            name="brandDomain"
            render={({ field, fieldState }) => (
              <Field id="marketing-brand" invalid={Boolean(fieldState.error)}>
                <FieldLabel>Send as brand</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger ref={field.ref}>
                    <SelectValue placeholder="Choose a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.domain} value={brand.domain}>
                        {brand.brandName} ({brand.domain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <FieldError assertive>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          <Field
            id="marketing-subject"
            invalid={Boolean(form.formState.errors.subject)}
          >
            <FieldLabel>Subject</FieldLabel>
            <Input {...form.register("subject")} />
            {form.formState.errors.subject && (
              <FieldError assertive>
                {form.formState.errors.subject.message}
              </FieldError>
            )}
          </Field>

          <Field
            id="marketing-body"
            invalid={Boolean(form.formState.errors.bodyHtml)}
          >
            <FieldLabel>Email content (HTML)</FieldLabel>
            <Textarea
              {...form.register("bodyHtml")}
              rows={14}
              className="font-mono text-xs"
            />
            <FieldDescription>
              Wrapped automatically with brand header, footer and an unsubscribe
              link. A greeting (&quot;Hi {"{first name}"},&quot;) is added on
              top. Use <code>{"{{baseUrl}}"}</code> and{" "}
              <code>{"{{brandName}}"}</code> to insert the selected brand&apos;s
              URL and name.
            </FieldDescription>
            {form.formState.errors.bodyHtml && (
              <FieldError assertive>
                {form.formState.errors.bodyHtml.message}
              </FieldError>
            )}
          </Field>

          {/* Recipients */}
          <Field id="marketing-recipients">
            <FieldLabel>Recipients (CSV)</FieldLabel>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              <UploadSimple size={20} className="mr-1" /> Upload CSV
            </Button>
            {fileName && (
              <div className="mt-3 text-sm text-gray-700">
                <div className="flex items-center gap-2 font-medium">
                  <Users size={18} /> {fileName}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  <span className="text-green-600 font-semibold">
                    {stats.valid} valid
                  </span>
                  {stats.duplicates > 0 && (
                    <span className="text-gray-500">
                      {stats.duplicates} duplicate
                    </span>
                  )}
                  {stats.invalid > 0 && (
                    <span className="text-red-500">
                      {stats.invalid} invalid
                    </span>
                  )}
                </div>
              </div>
            )}
            <FieldDescription>
              CSV columns: <code>email</code> (required),{" "}
              <code>first_name</code> (optional).
            </FieldDescription>
          </Field>

          <Button type="submit" isPending={isSending}>
            <PaperPlaneTilt size={20} className="mr-1" /> Send campaign
          </Button>

          {form.formState.errors.root?.message && (
            <Alert variant="destructive" role="alert">
              <Warning aria-hidden="true" className="size-5" />
              <AlertTitle>Campaign was not sent</AlertTitle>
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}
          {result && (
            <Alert>
              <AlertTitle>Campaign complete</AlertTitle>
              <AlertDescription>{result}</AlertDescription>
            </Alert>
          )}
        </form>

        {/* Preview */}
        <div className="rounded-[26px] border border-gray-200 shadow-xl p-6 bg-[#5046db]">
          <div className="bg-white rounded-[20px] p-6">
            <div className="text-xs text-gray-400 mb-3 border-b pb-2">
              Subject:{" "}
              <span className="text-gray-700 font-medium">
                {subject || "(no subject)"}
              </span>
            </div>
            <p className="text-base text-[#1c1c21] mb-4">Hi there,</p>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            <p className="text-xs text-gray-400 mt-6 border-t pt-3">
              Don&apos;t want these emails?{" "}
              <span className="text-[#5046db] underline">Unsubscribe</span>.
            </p>
          </div>
        </div>
      </div>

      <AlertDialog
        open={confirmationOpen}
        onOpenChange={(open) => !isSending && setConfirmationOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Send “{subject}” to {stats.valid} recipient
              {stats.valid === 1 ? "" : "s"} as {brandDomain}. This starts
              external email delivery and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {form.formState.errors.root?.message && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Campaign was not sent</AlertTitle>
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSending}
              onClick={(event) => {
                event.preventDefault();
                void sendCampaign();
              }}
            >
              {isSending ? "Sending…" : "Send campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MarketingCampaign;
