"use client";
import { useMemo, useRef, useState } from "react";
import {
  PaperPlaneTilt,
  UploadSimple,
  Users,
  Warning,
} from "@phosphor-icons/react";
import FullRoundedButton from "../../components/Button/FullRoundedButton";
import LabeledInput from "../../dashboard/components/LabeledInput";

type BrandOption = { domain: string; brandName: string };
type Recipient = { email: string; firstName?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [brandDomain, setBrandDomain] = useState(
    brands[0]?.domain || "dental.bio",
  );
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_BODY);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [fileName, setFileName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    const text = await file.text();
    const parsed = extractRecipients(parseCsv(text));
    setRecipients(parsed);
    setFileName(file.name);
  };

  const handleSend = async () => {
    setError(null);
    setResult(null);
    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }
    if (!bodyHtml.trim()) {
      setError("Please enter the email content.");
      return;
    }
    if (stats.valid === 0) {
      setError("Upload a CSV with at least one valid email address.");
      return;
    }

    if (
      !window.confirm(
        `Send "${subject}" to ${stats.valid} recipient(s) as ${brandDomain}?`,
      )
    )
      return;

    try {
      setIsSending(true);
      const res = await fetch("/api/admin/marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyHtml, brandDomain, recipients }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to send campaign.");
        return;
      }
      setResult(
        `Sent ${json.sent}. ` +
          `${json.failed ? `Failed ${json.failed}. ` : ""}` +
          `Skipped ${json.suppressed} unsubscribed, ${json.invalid} invalid.` +
          (json.message ? ` ${json.message}` : ""),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold mb-6">Email Marketing</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="rounded-[26px] border border-gray-200 shadow-xl p-6 bg-white space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Send as brand
            </label>
            <select
              value={brandDomain}
              onChange={(e) => setBrandDomain(e.target.value)}
              className="w-full border border-gray-300 rounded-[12px] px-3 py-2"
            >
              {brands.map((b) => (
                <option key={b.domain} value={b.domain}>
                  {b.brandName} ({b.domain})
                </option>
              ))}
            </select>
          </div>

          <LabeledInput
            label="Subject"
            name="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <div>
            <label className="block text-sm font-semibold mb-1">
              Email content (HTML)
            </label>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={14}
              className="w-full border border-gray-300 rounded-[12px] px-3 py-2 font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              Wrapped automatically with brand header, footer and an unsubscribe
              link. A greeting (&quot;Hi {"{first name}"},&quot;) is added on
              top. Use <code>{"{{baseUrl}}"}</code> and{" "}
              <code>{"{{brandName}}"}</code> to insert the selected brand&apos;s
              URL and name.
            </p>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Recipients (CSV)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <FullRoundedButton
              buttonType="ghost"
              onClick={() => fileRef.current?.click()}
            >
              <UploadSimple size={20} className="mr-1" /> Upload CSV
            </FullRoundedButton>
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
                <p className="text-[11px] text-gray-400 mt-1">
                  CSV columns: <code>email</code> (required),{" "}
                  <code>first_name</code> (optional).
                </p>
              </div>
            )}
          </div>

          <FullRoundedButton
            onClick={handleSend}
            isLoading={isSending}
            disabled={stats.valid === 0}
          >
            <PaperPlaneTilt size={20} className="mr-1" /> Send campaign
          </FullRoundedButton>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600">
              <Warning size={18} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
          {result && (
            <div className="text-sm text-green-700 font-medium">{result}</div>
          )}
        </div>

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
    </div>
  );
};

export default MarketingCampaign;
